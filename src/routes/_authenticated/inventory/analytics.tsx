/**
 * Inventory Analytics Route
 *
 * Comprehensive warehouse analytics and reporting dashboard.
 *
 * Features:
 * - Valuation reports
 * - Aging analysis
 * - Turnover metrics
 * - Movement analytics
 */
import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { PageLayout, RouteErrorFallback } from "@/components/layout";
import { InventoryTabsSkeleton } from "@/components/skeletons/inventory";
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
} from "@/components/domain/inventory";
import {
  useInventoryValuation,
  useInventoryAging,
  useInventoryTurnover,
  useMovements,
} from "@/hooks/inventory";

// ============================================================================
// ROUTE DEFINITION
// ============================================================================

export const Route = createFileRoute("/_authenticated/inventory/analytics" as any)({
  component: AnalyticsPage,
  errorComponent: ({ error }) => (
    <RouteErrorFallback error={error} parentRoute="/inventory" />
  ),
  pendingComponent: () => (
    <PageLayout variant="full-width">
      <PageLayout.Header title="Inventory Analytics" />
      <PageLayout.Content>
        <InventoryTabsSkeleton tabCount={4} />
      </PageLayout.Content>
    </PageLayout>
  ),
});

// ============================================================================
// MAIN COMPONENT
// ============================================================================

function AnalyticsPage() {
  const [activeTab, setActiveTab] = useState<
    "valuation" | "aging" | "turnover" | "movements"
  >("valuation");

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

  // Transform valuation data (API returns different shape than component expects)
  const valuationSummary: ValuationSummary | null = valuationData
    ? {
        totalValue: valuationData.totalValue ?? 0,
        totalUnits: (valuationData as any).totalUnits ?? (valuationData.byProduct?.reduce((sum: number, p: any) => sum + (p.totalQuantity ?? 0), 0) ?? 0),
        averageUnitCost: (valuationData as any).averageUnitCost ?? 0,
        categoriesCount: (valuationData as any).byCategory?.length ?? 0,
        locationsCount: valuationData.byLocation?.length ?? 0,
        costMethod: "fifo",
      }
    : null;

  const valuationByCategory: CategoryValuation[] = ((valuationData as any)?.byCategory ?? []).map((c: any) => ({
    categoryId: c.categoryId ?? c.id,
    categoryName: c.categoryName ?? c.name ?? "Unknown",
    totalValue: c.totalValue ?? 0,
    totalUnits: c.totalUnits ?? 0,
    percentOfTotal: c.percentOfTotal ?? 0,
    skuCount: c.skuCount ?? 0,
  }));

  const valuationByLocation: LocationValuation[] = (valuationData?.byLocation ?? []).map((l: any) => ({
    locationId: l.locationId ?? l.id,
    locationName: l.locationName ?? l.name ?? "Unknown",
    totalValue: l.totalValue ?? 0,
    totalUnits: l.totalUnits ?? 0,
    percentOfTotal: l.percentOfTotal ?? 0,
    utilization: l.utilization ?? 0,
  }));

  // Transform aging data (API returns different shape than component expects)
  const agingDataAny = agingData as any;
  const agingSummary: AgingSummary | null = agingData
    ? {
        totalItems: agingDataAny.summary?.totalItems ?? agingDataAny.totalItems ?? 0,
        totalValue: agingDataAny.summary?.totalValue ?? agingDataAny.totalValue ?? 0,
        averageAge: agingDataAny.summary?.averageAge ?? agingDataAny.averageAge ?? 0,
        valueAtRisk: agingDataAny.summary?.valueAtRisk ?? agingDataAny.valueAtRisk ?? 0,
        riskPercentage: agingDataAny.summary?.riskPercentage ?? agingDataAny.riskPercentage ?? 0,
      }
    : null;

  const agingBuckets: AgeBucket[] = (agingDataAny?.aging ?? agingDataAny?.buckets ?? []).map((b: any) => ({
    label: b.bucket ?? b.label ?? "",
    minDays: b.minDays ?? 0,
    maxDays: b.maxDays ?? null,
    itemCount: b.itemCount ?? 0,
    totalValue: b.totalValue ?? 0,
    percentOfTotal: b.percentOfTotal ?? 0,
    risk: b.risk ?? "low",
  }));

  const agingItemsRaw = agingDataAny?.aging?.flatMap((b: any) => b.items ?? []) ?? agingDataAny?.items ?? [];
  const agingItems: AgingItem[] = agingItemsRaw.slice(0, 20).map((item: any) => ({
    inventoryId: item.inventoryId ?? item.id,
    productId: item.productId,
    productName: item.productName ?? "Unknown",
    productSku: item.productSku ?? "",
    locationName: item.locationName ?? "Unknown",
    quantity: item.quantity ?? 0,
    unitCost: item.unitCost ?? 0,
    totalValue: item.totalValue ?? 0,
    ageInDays: item.ageInDays ?? 0,
    receivedAt: new Date(item.receivedAt ?? Date.now()),
    risk: item.risk ?? "low",
  }));

  // Transform turnover data (API returns different shape than component expects)
  const turnoverDataAny = turnoverData as any;
  const turnoverSummary: TurnoverSummary | null = turnoverData
    ? {
        turnoverRatio: turnoverDataAny.turnover?.turnoverRate ?? turnoverDataAny.turnoverRatio ?? 0,
        averageDaysOnHand: turnoverDataAny.turnover?.daysOnHand ?? turnoverDataAny.daysOnHand ?? 0,
        annualizedTurnover: (turnoverDataAny.turnover?.turnoverRate ?? turnoverDataAny.turnoverRatio ?? 0) * 4,
        periodStart: new Date(turnoverDataAny.periodStart ?? Date.now() - 90 * 24 * 60 * 60 * 1000),
        periodEnd: new Date(turnoverDataAny.periodEnd ?? Date.now()),
        industryBenchmark: 6,
      }
    : null;

  const turnoverByCategory: CategoryTurnover[] = (turnoverDataAny?.byCategory ?? turnoverDataAny?.byProduct ?? []).map((c: any) => ({
    categoryId: c.categoryId ?? c.productId ?? c.id,
    categoryName: c.categoryName ?? c.productName ?? c.name ?? "Unknown",
    turnoverRatio: c.turnoverRatio ?? c.turnoverRate ?? 0,
    daysOnHand: c.daysOnHand ?? 0,
    cogs: c.cogs ?? 0,
    averageInventory: c.averageInventory ?? 0,
    trend: c.trend ?? "stable",
    trendPercentage: c.trendPercentage ?? 0,
  }));

  const turnoverTrends: TurnoverTrend[] = (turnoverDataAny?.trends ?? []).map((t: any) => ({
    period: t.period ?? "",
    turnoverRatio: t.turnoverRatio ?? 0,
    daysOnHand: t.daysOnHand ?? 0,
  }));

  // Transform movement data with useMemo for complex calculations
  const { movementSummary, movementByType, topMovers, movementTrends } = useMemo(() => {
    const movements = movementData?.movements ?? [];
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
    const typeCounts: Record<string, { count: number; units: number; value: number }> = {};

    movements.forEach((m: any) => {
      const qty = Math.abs(m.quantity ?? 0);
      const val = Math.abs((m.quantity ?? 0) * (m.unitCost ?? 0));

      if (m.quantity > 0) {
        totalUnitsIn += qty;
        totalValueIn += val;
      } else {
        totalUnitsOut += qty;
        totalValueOut += val;
      }

      const type = m.movementType ?? "adjustment";
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
    const byType: MovementByType[] = Object.entries(typeCounts).map(([type, counts]) => ({
      type: type as any,
      count: counts.count,
      units: counts.units,
      value: counts.value,
      percentOfTotal: totalCount > 0 ? (counts.count / totalCount) * 100 : 0,
    }));

    // Top movers
    const productMovements: Record<
      string,
      { productId: string; productName: string; productSku: string; unitsIn: number; unitsOut: number; count: number }
    > = {};

    movements.forEach((m: any) => {
      const pid = m.productId;
      if (!productMovements[pid]) {
        productMovements[pid] = {
          productId: pid,
          productName: m.product?.name ?? "Unknown",
          productSku: m.product?.sku ?? "",
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
        productId: p.productId,
        productName: p.productName,
        productSku: p.productSku,
        totalMovements: p.count,
        unitsIn: p.unitsIn,
        unitsOut: p.unitsOut,
        netChange: p.unitsIn - p.unitsOut,
        velocity: (p.count > 10 ? "high" : p.count > 5 ? "medium" : "low") as "high" | "medium" | "low",
      }));

    // Group movements by date for trend
    const dateGroups: Record<string, { unitsIn: number; unitsOut: number; count: number }> = {};
    movements.forEach((m: any) => {
      const date = new Date(m.createdAt ?? Date.now()).toLocaleDateString("en-AU", {
        day: "numeric",
        month: "short",
      });
      if (!dateGroups[date]) {
        dateGroups[date] = { unitsIn: 0, unitsOut: 0, count: 0 };
      }
      dateGroups[date].count++;
      if (m.quantity > 0) {
        dateGroups[date].unitsIn += m.quantity;
      } else {
        dateGroups[date].unitsOut += Math.abs(m.quantity);
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
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
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

export default AnalyticsPage;
