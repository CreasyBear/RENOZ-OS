/**
 * Inventory Analytics Page Component
 *
 * Comprehensive warehouse analytics and reporting dashboard.
 *
 * @source valuation from useInventoryValuation hook
 * @source aging from useInventoryAging hook
 * @source turnover from useInventoryTurnover hook
 * @source movements from useMovements hook
 *
 * @see src/routes/_authenticated/inventory/analytics.tsx - Route definition
 */
import { useState, useMemo } from "react";
import { PageLayout } from "@/components/layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DollarSign,
  Clock,
  RefreshCw,
  ArrowLeftRight,
} from "lucide-react";
import {
  ValuationReport,
  AgingReport,
  TurnoverReport,
  MovementAnalytics,
  type ValuationSummary,
  type CategoryValuation,
  type LocationValuation,
  type AgingSummary,
  type AgeBucket,
  type AgingItem,
  type TurnoverSummary,
  type CategoryTurnover,
  type TurnoverTrend,
  type ReportMovementSummary as MovementSummary,
  type MovementByType,
  type ReportTopMover as TopMover,
  type MovementTrend,
  type MovementType,
} from "@/components/domain/inventory";
import {
  useInventoryValuation,
  useInventoryAging,
  useInventoryTurnover,
  useMovements,
} from "@/hooks/inventory";
import type {
  MovementWithRelations,
  ListMovementsResult,
  MovementTypeCount,
  ProductMovementAggregation,
  DateGroupAggregation,
} from "@/lib/schemas/inventory";

// ============================================================================
// MAIN COMPONENT
// ============================================================================

type AnalyticsTab = "valuation" | "aging" | "turnover" | "movements";

export default function AnalyticsPage() {
  const [activeTab, setActiveTab] = useState<AnalyticsTab>("valuation");

  // Data hooks - using TanStack Query via hooks
  // Valuation data - always fetched as default tab
  const {
    data: valuationData,
    isLoading: isLoadingValuation,
  } = useInventoryValuation();

  // Aging data - fetched when tab selected
  const {
    data: agingData,
    isLoading: isLoadingAging,
  } = useInventoryAging({}, activeTab === "aging");

  // Turnover data - fetched when tab selected
  const {
    data: turnoverData,
    isLoading: isLoadingTurnover,
  } = useInventoryTurnover({ period: "90d" }, activeTab === "turnover");

  // Movement data - fetched when tab selected
  const {
    data: movementData,
    isLoading: isLoadingMovements,
  } = useMovements({ page: 1, pageSize: 100, sortOrder: 'desc' }, activeTab === "movements");

  // Transform valuation data - server now returns complete data
  const valuationSummary: ValuationSummary | null = valuationData
    ? {
        totalValue: valuationData.totalValue ?? 0,
        totalUnits: valuationData.totalUnits ?? 0,
        averageUnitCost: valuationData.averageUnitCost ?? 0,
        totalSkus: valuationData.totalSkus ?? 0,
        locationsCount: valuationData.byLocation?.length ?? 0,
        costMethod: valuationData.valuationMethod === 'fifo' ? 'fifo' : valuationData.valuationMethod === 'weighted_average' ? 'weighted_average' : 'fifo',
      }
    : null;

  const valuationByCategory: CategoryValuation[] = (valuationData?.byCategory ?? []).map((c) => ({
    categoryId: c.categoryId ?? '',
    categoryName: c.categoryName ?? 'Uncategorized',
    totalValue: c.totalValue ?? 0,
    totalUnits: c.totalUnits ?? 0,
    percentOfTotal: c.percentOfTotal ?? 0,
    skuCount: c.skuCount ?? 0,
  }));

  const valuationByLocation: LocationValuation[] = (valuationData?.byLocation ?? []).map((l) => ({
    locationId: l.locationId ?? '',
    locationName: l.locationName ?? 'Unknown',
    totalValue: l.totalValue ?? 0,
    totalUnits: Number(l.totalQuantity ?? 0),
    percentOfTotal: l.percentOfTotal ?? 0,
    utilization: l.utilization ?? 0,
  }));

  // Transform aging data - server now returns complete data
  const agingSummary: AgingSummary | null = agingData
    ? {
        totalItems: agingData.summary?.totalItems ?? 0,
        totalValue: agingData.summary?.totalValue ?? 0,
        averageAge: agingData.summary?.averageAge ?? 0,
        valueAtRisk: agingData.summary?.valueAtRisk ?? 0,
        riskPercentage: agingData.summary?.riskPercentage ?? 0,
      }
    : null;

  const agingBuckets: AgeBucket[] = (agingData?.aging ?? []).map((b) => {
    const riskValue = b.risk;
    const validRisk: 'low' | 'medium' | 'high' | 'critical' =
      riskValue === 'low' || riskValue === 'medium' || riskValue === 'high' || riskValue === 'critical'
        ? riskValue
        : 'low';

    return {
      label: b.bucket ?? '',
      minDays: b.minDays ?? 0,
      maxDays: b.maxDays ?? null,
      itemCount: b.itemCount ?? 0,
      totalValue: b.totalValue ?? 0,
      percentOfTotal: b.percentOfTotal ?? 0,
      risk: validRisk,
    };
  });

  const agingItems: AgingItem[] = useMemo(() => {
    const agingItemsRaw = agingData?.aging?.flatMap((b) => b.items ?? []) ?? [];
    return agingItemsRaw.slice(0, 20).map((item) => {
      // Safely parse receivedAt - handle both Date objects and ISO strings
      let receivedAtDate: Date;
      if (item.receivedAt instanceof Date) {
        receivedAtDate = item.receivedAt;
      } else if (typeof item.receivedAt === 'string' && item.receivedAt) {
        receivedAtDate = new Date(item.receivedAt);
      } else {
        // Fallback to current date if invalid
        receivedAtDate = new Date();
      }

      // Ensure date is valid
      if (isNaN(receivedAtDate.getTime())) {
        receivedAtDate = new Date();
      }

      return {
        inventoryId: item.inventoryId ?? '',
        productId: item.productId ?? '',
        productName: item.productName ?? 'Unknown',
        productSku: item.productSku ?? '',
        locationName: item.locationName ?? 'Unknown',
        quantity: Number(item.quantity ?? 0),
        unitCost: Number(item.unitCost ?? 0),
        totalValue: Number(item.totalValue ?? 0),
        ageInDays: Number(item.ageInDays ?? 0),
        receivedAt: receivedAtDate,
        risk: (item.risk ?? 'low') as 'low' | 'medium' | 'high' | 'critical',
      };
    });
  }, [agingData]);

  // Transform turnover data - server now returns complete data
  const turnoverSummary: TurnoverSummary | null = useMemo(() => {
    if (!turnoverData) return null;

    const now = new Date();
    const periodDays = turnoverData.turnover?.periodDays ?? 90;
    const periodStart = new Date(now.getTime() - periodDays * 24 * 60 * 60 * 1000);

    return {
      turnoverRatio: turnoverData.turnover?.turnoverRate ?? 0,
      averageDaysOnHand: turnoverData.turnover?.daysOnHand ?? 0,
      annualizedTurnover: (turnoverData.turnover?.turnoverRate ?? 0) * 4,
      periodStart,
      periodEnd: now,
      industryBenchmark: 6,
    };
  }, [turnoverData]);

  const turnoverByCategory: CategoryTurnover[] = useMemo(() => {
    return (turnoverData?.byProduct ?? [])
      .filter((p) => {
        // Filter out invalid products - must have ID and name
        if (!p.productId || !p.productName) return false;
        // Filter out "Unknown Product" placeholder if it's not a real product
        if (p.productName === 'Unknown Product' && (!p.productSku || p.productSku === 'N/A')) return false;
        return true;
      })
      .map((p) => {
        // Safely convert all numeric values, handling null/undefined/NaN
        const turnoverRate = Number(p.turnoverRate ?? 0) || 0;
        const periodCOGS = Number(p.periodCOGS ?? 0) || 0;
        const inventoryValue = Number(p.inventoryValue ?? 0) || 0;
        const daysOnHand = turnoverRate > 0 ? Math.round(365 / turnoverRate) : 0;

        return {
          categoryId: p.productId ?? '',
          categoryName: p.productName ?? 'Unknown',
          turnoverRatio: turnoverRate,
          daysOnHand,
          cogs: periodCOGS,
          averageInventory: inventoryValue,
          trend: (p.trend ?? 'stable') as 'up' | 'down' | 'stable',
          trendPercentage: Number(p.trendPercentage ?? 0) || 0,
        };
      });
  }, [turnoverData]);

  const turnoverTrends: TurnoverTrend[] = useMemo(() => {
    return (turnoverData?.trends ?? []).map((t) => ({
      period: t.period ?? '',
      turnoverRatio: Number(t.turnoverRate ?? 0),
      daysOnHand: Number(t.daysOnHand ?? 0),
    }));
  }, [turnoverData]);

  // Transform movement data with useMemo for complex calculations
  const { movementSummary, movementByType, topMovers, movementTrends } = useMemo(() => {
    const movements = ((movementData as ListMovementsResult | undefined)?.movements ?? []) as MovementWithRelations[];
    const periodDays = 30;

    if (movements.length === 0) {
      return {
        movementSummary: null,
        movementByType: [],
        topMovers: [],
        movementTrends: [],
      };
    }

    // Calculate summary
    let totalUnitsIn = 0;
    let totalUnitsOut = 0;
    let totalValueIn = 0;
    let totalValueOut = 0;
    const typeCounts: Record<string, MovementTypeCount> = {};

    movements.forEach((m: MovementWithRelations) => {
      const qty = Math.abs(Number(m.quantity ?? 0));
      // Use totalCost from database instead of recalculating
      const val = Math.abs(Number(m.totalCost ?? 0));
      const quantity = Number(m.quantity ?? 0);

      if (quantity > 0) {
        totalUnitsIn += qty;
        totalValueIn += val;
      } else if (quantity < 0) {
        totalUnitsOut += qty;
        totalValueOut += val;
      }

      const type = (m.movementType ?? "adjust") as MovementType;
      if (!typeCounts[type]) {
        typeCounts[type] = { count: 0, units: 0, value: 0 };
      }
      typeCounts[type].count++;
      typeCounts[type].units += qty;
      typeCounts[type].value += val;
    });

    const summary: MovementSummary = {
      totalMovements: movements.length,
      totalUnitsIn,
      totalUnitsOut,
      totalValueIn,
      totalValueOut,
      periodDays,
    };

    // Movement by type
    const totalCount = movements.length;
    const byType: MovementByType[] = Object.entries(typeCounts).map(([type, counts]) => {
      const validType: MovementType =
        type === 'receive' || type === 'allocate' || type === 'deallocate' ||
        type === 'pick' || type === 'ship' || type === 'return' ||
        type === 'transfer' || type === 'adjust'
          ? type as MovementType
          : 'adjust';

      return {
        type: validType,
        count: counts.count,
        units: counts.units,
        value: counts.value,
        percentOfTotal: totalCount > 0 ? (counts.count / totalCount) * 100 : 0,
      };
    });

    // Top movers
    const productMovements: Record<string, ProductMovementAggregation> = {};

    movements.forEach((m: MovementWithRelations) => {
      const pid = m.productId;
      if (!productMovements[pid]) {
        productMovements[pid] = {
          productId: pid,
          productName: m.productName ?? "Unknown",
          productSku: m.productSku ?? "",
          unitsIn: 0,
          unitsOut: 0,
          count: 0,
        };
      }
      productMovements[pid].count++;
      if (m.quantity > 0) {
        productMovements[pid].unitsIn += m.quantity;
      } else {
        productMovements[pid].unitsOut += Math.abs(m.quantity);
      }
    });

    const movers: TopMover[] = Object.values(productMovements)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
      .map((p) => ({
        productId: p.productId ?? '',
        productName: p.productName ?? 'Unknown',
        productSku: p.productSku ?? '',
        totalMovements: p.count,
        unitsIn: p.unitsIn,
        unitsOut: p.unitsOut,
        netChange: p.unitsIn - p.unitsOut,
        velocity: (p.count > 10 ? "high" : p.count > 5 ? "medium" : "low") as "high" | "medium" | "low",
      }));

    // Group movements by date for trend
    const dateGroups: Record<string, DateGroupAggregation> = {};
    const now = new Date();
    movements.forEach((m: MovementWithRelations) => {
      // Safely parse date - handle both Date objects and ISO strings
      let createdAtDate: Date;
      const createdAt = m.createdAt;
      if (createdAt instanceof Date) {
        createdAtDate = createdAt;
      } else if (typeof createdAt === 'string' && createdAt) {
        createdAtDate = new Date(createdAt);
      } else {
        createdAtDate = now;
      }

      // Ensure date is valid
      if (isNaN(createdAtDate.getTime())) {
        createdAtDate = now;
      }

      const date = createdAtDate.toLocaleDateString("en-AU", {
        day: "numeric",
        month: "short",
      });
      if (!dateGroups[date]) {
        dateGroups[date] = { unitsIn: 0, unitsOut: 0, count: 0 };
      }
      dateGroups[date].count++;
      const qty = Number(m.quantity ?? 0);
      if (qty > 0) {
        dateGroups[date].unitsIn += qty;
      } else if (qty < 0) {
        dateGroups[date].unitsOut += Math.abs(qty);
      }
    });

    const trends: MovementTrend[] = Object.entries(dateGroups)
      .slice(-14)
      .map(([date, d]) => ({
        date,
        movementCount: d.count,
        unitsIn: d.unitsIn,
        unitsOut: d.unitsOut,
      }));

    return {
      movementSummary: summary,
      movementByType: byType,
      topMovers: movers,
      movementTrends: trends,
    };
  }, [movementData]);

  return (
    <PageLayout variant="full-width">
      <PageLayout.Header
        title="Inventory Analytics"
        description="Comprehensive warehouse reporting and analysis"
      />

      <PageLayout.Content>
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as AnalyticsTab)}>
          <TabsList className="mb-6">
            <TabsTrigger value="valuation">
              <DollarSign className="h-4 w-4 mr-2" aria-hidden="true" />
              Valuation
            </TabsTrigger>
            <TabsTrigger value="aging">
              <Clock className="h-4 w-4 mr-2" aria-hidden="true" />
              Aging
            </TabsTrigger>
            <TabsTrigger value="turnover">
              <RefreshCw className="h-4 w-4 mr-2" aria-hidden="true" />
              Turnover
            </TabsTrigger>
            <TabsTrigger value="movements">
              <ArrowLeftRight className="h-4 w-4 mr-2" aria-hidden="true" />
              Movements
            </TabsTrigger>
          </TabsList>

          <TabsContent value="valuation">
            <ValuationReport
              summary={valuationSummary}
              byCategory={valuationByCategory}
              byLocation={valuationByLocation}
              isLoading={isLoadingValuation}
            />
          </TabsContent>

          <TabsContent value="aging">
            <AgingReport
              summary={agingSummary}
              buckets={agingBuckets}
              items={agingItems}
              isLoading={isLoadingAging}
            />
          </TabsContent>

          <TabsContent value="turnover">
            <TurnoverReport
              summary={turnoverSummary}
              byCategory={turnoverByCategory}
              trends={turnoverTrends}
              isLoading={isLoadingTurnover}
            />
          </TabsContent>

          <TabsContent value="movements">
            <MovementAnalytics
              summary={movementSummary}
              byType={movementByType}
              topMovers={topMovers}
              trends={movementTrends}
              isLoading={isLoadingMovements}
            />
          </TabsContent>
        </Tabs>
      </PageLayout.Content>
    </PageLayout>
  );
}
