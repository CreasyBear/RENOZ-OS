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
import { useState, useCallback, useEffect } from "react";
import { PageLayout, RouteErrorFallback } from "@/components/layout";
import { InventoryTabsSkeleton } from "@/components/skeletons/inventory";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DollarSign,
  Clock,
  RefreshCw,
  ArrowLeftRight,
} from "lucide-react";
import { toast } from "@/hooks";
import {
  ValuationReport,
  type ValuationSummary,
  type CategoryValuation,
  type LocationValuation,
} from "@/components/domain/inventory";
import {
  AgingReport,
  type AgingSummary,
  type AgeBucket,
  type AgingItem,
} from "@/components/domain/inventory";
import {
  TurnoverReport,
  type TurnoverSummary,
  type CategoryTurnover,
  type TurnoverTrend,
} from "@/components/domain/inventory";
import {
  MovementAnalytics,
  type MovementSummary,
  type MovementByType,
  type TopMover,
  type MovementTrend,
} from "@/components/domain/inventory";
import {
  getInventoryValuation,
  getInventoryAging,
  getInventoryTurnover,
} from "@/server/functions/valuation";
import { listMovements } from "@/server/functions/inventory";

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

  // Valuation state
  const [valuationSummary, setValuationSummary] = useState<ValuationSummary | null>(null);
  const [valuationByCategory, setValuationByCategory] = useState<CategoryValuation[]>([]);
  const [valuationByLocation, setValuationByLocation] = useState<LocationValuation[]>([]);
  const [isLoadingValuation, setIsLoadingValuation] = useState(true);

  // Aging state
  const [agingSummary, setAgingSummary] = useState<AgingSummary | null>(null);
  const [agingBuckets, setAgingBuckets] = useState<AgeBucket[]>([]);
  const [agingItems, setAgingItems] = useState<AgingItem[]>([]);
  const [isLoadingAging, setIsLoadingAging] = useState(true);

  // Turnover state
  const [turnoverSummary, setTurnoverSummary] = useState<TurnoverSummary | null>(null);
  const [turnoverByCategory, setTurnoverByCategory] = useState<CategoryTurnover[]>([]);
  const [turnoverTrends, setTurnoverTrends] = useState<TurnoverTrend[]>([]);
  const [isLoadingTurnover, setIsLoadingTurnover] = useState(true);

  // Movement state
  const [movementSummary, setMovementSummary] = useState<MovementSummary | null>(null);
  const [movementByType, setMovementByType] = useState<MovementByType[]>([]);
  const [topMovers, setTopMovers] = useState<TopMover[]>([]);
  const [movementTrends, setMovementTrends] = useState<MovementTrend[]>([]);
  const [isLoadingMovements, setIsLoadingMovements] = useState(true);

  // Fetch valuation data
  const fetchValuation = useCallback(async () => {
    try {
      setIsLoadingValuation(true);
      const data = (await getInventoryValuation({ data: {} })) as any;

      if (data) {
        setValuationSummary({
          totalValue: data.totalValue ?? 0,
          totalUnits: data.totalUnits ?? 0,
          averageUnitCost: data.averageUnitCost ?? 0,
          categoriesCount: data.byCategory?.length ?? 0,
          locationsCount: data.byLocation?.length ?? 0,
          costMethod: "fifo",
        });

        setValuationByCategory(
          (data.byCategory ?? []).map((c: any) => ({
            categoryId: c.categoryId ?? c.id,
            categoryName: c.categoryName ?? c.name ?? "Unknown",
            totalValue: c.totalValue ?? 0,
            totalUnits: c.totalUnits ?? 0,
            percentOfTotal: c.percentOfTotal ?? 0,
            skuCount: c.skuCount ?? 0,
          }))
        );

        setValuationByLocation(
          (data.byLocation ?? []).map((l: any) => ({
            locationId: l.locationId ?? l.id,
            locationName: l.locationName ?? l.name ?? "Unknown",
            totalValue: l.totalValue ?? 0,
            totalUnits: l.totalUnits ?? 0,
            percentOfTotal: l.percentOfTotal ?? 0,
            utilization: l.utilization ?? 0,
          }))
        );
      }
    } catch (error) {
      console.error("Failed to fetch valuation:", error);
      toast.error("Failed to load valuation data");
    } finally {
      setIsLoadingValuation(false);
    }
  }, []);

  // Fetch aging data
  const fetchAging = useCallback(async () => {
    try {
      setIsLoadingAging(true);
      const data = (await getInventoryAging({ data: {} })) as any;

      if (data) {
        setAgingSummary({
          totalItems: data.totalItems ?? 0,
          totalValue: data.totalValue ?? 0,
          averageAge: data.averageAge ?? 0,
          valueAtRisk: data.valueAtRisk ?? 0,
          riskPercentage: data.riskPercentage ?? 0,
        });

        setAgingBuckets(
          (data.buckets ?? []).map((b: any) => ({
            label: b.label ?? "",
            minDays: b.minDays ?? 0,
            maxDays: b.maxDays ?? null,
            itemCount: b.itemCount ?? 0,
            totalValue: b.totalValue ?? 0,
            percentOfTotal: b.percentOfTotal ?? 0,
            risk: b.risk ?? "low",
          }))
        );

        setAgingItems(
          (data.items ?? []).slice(0, 20).map((item: any) => ({
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
          }))
        );
      }
    } catch (error) {
      console.error("Failed to fetch aging:", error);
      toast.error("Failed to load aging data");
    } finally {
      setIsLoadingAging(false);
    }
  }, []);

  // Fetch turnover data
  const fetchTurnover = useCallback(async () => {
    try {
      setIsLoadingTurnover(true);
      const data = (await getInventoryTurnover({
        data: { period: "90d" },
      })) as any;

      if (data) {
        setTurnoverSummary({
          turnoverRatio: data.turnoverRatio ?? 0,
          averageDaysOnHand: data.daysOnHand ?? 0,
          annualizedTurnover: (data.turnoverRatio ?? 0) * 4, // Quarterly to annual
          periodStart: new Date(data.periodStart ?? Date.now() - 90 * 24 * 60 * 60 * 1000),
          periodEnd: new Date(data.periodEnd ?? Date.now()),
          industryBenchmark: 6,
        });

        setTurnoverByCategory(
          (data.byCategory ?? []).map((c: any) => ({
            categoryId: c.categoryId ?? c.id,
            categoryName: c.categoryName ?? c.name ?? "Unknown",
            turnoverRatio: c.turnoverRatio ?? 0,
            daysOnHand: c.daysOnHand ?? 0,
            cogs: c.cogs ?? 0,
            averageInventory: c.averageInventory ?? 0,
            trend: c.trend ?? "stable",
            trendPercentage: c.trendPercentage ?? 0,
          }))
        );

        setTurnoverTrends(
          (data.trends ?? []).map((t: any) => ({
            period: t.period ?? "",
            turnoverRatio: t.turnoverRatio ?? 0,
            daysOnHand: t.daysOnHand ?? 0,
          }))
        );
      }
    } catch (error) {
      console.error("Failed to fetch turnover:", error);
      toast.error("Failed to load turnover data");
    } finally {
      setIsLoadingTurnover(false);
    }
  }, []);

  // Fetch movement data
  const fetchMovements = useCallback(async () => {
    try {
      setIsLoadingMovements(true);
      const data = (await listMovements({
        data: { page: 1, pageSize: 100 },
      })) as any;

      if (data?.movements) {
        const movements = data.movements;
        const periodDays = 30;

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

        setMovementSummary({
          totalMovements: movements.length,
          totalUnitsIn,
          totalUnitsOut,
          totalValueIn,
          totalValueOut,
          periodDays,
        });

        // Movement by type
        const totalCount = movements.length;
        setMovementByType(
          Object.entries(typeCounts).map(([type, counts]) => ({
            type: type as any,
            count: counts.count,
            units: counts.units,
            value: counts.value,
            percentOfTotal: totalCount > 0 ? (counts.count / totalCount) * 100 : 0,
          }))
        );

        // Top movers (group by product)
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

        const movers = Object.values(productMovements)
          .sort((a, b) => b.count - a.count)
          .slice(0, 10)
          .map((p) => ({
            ...p,
            totalMovements: p.count,
            netChange: p.unitsIn - p.unitsOut,
            velocity: p.count > 10 ? "high" : p.count > 5 ? "medium" : "low" as any,
          }));

        setTopMovers(movers);

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

        setMovementTrends(
          Object.entries(dateGroups)
            .slice(-14)
            .map(([date, d]) => ({
              date,
              movementCount: d.count,
              unitsIn: d.unitsIn,
              unitsOut: d.unitsOut,
            }))
        );
      }
    } catch (error) {
      console.error("Failed to fetch movements:", error);
      toast.error("Failed to load movement data");
    } finally {
      setIsLoadingMovements(false);
    }
  }, []);

  // Initial fetch based on active tab
  useEffect(() => {
    if (activeTab === "valuation" && isLoadingValuation && !valuationSummary) {
      fetchValuation();
    } else if (activeTab === "aging" && isLoadingAging && !agingSummary) {
      fetchAging();
    } else if (activeTab === "turnover" && isLoadingTurnover && !turnoverSummary) {
      fetchTurnover();
    } else if (activeTab === "movements" && isLoadingMovements && !movementSummary) {
      fetchMovements();
    }
  }, [
    activeTab,
    isLoadingValuation,
    valuationSummary,
    fetchValuation,
    isLoadingAging,
    agingSummary,
    fetchAging,
    isLoadingTurnover,
    turnoverSummary,
    fetchTurnover,
    isLoadingMovements,
    movementSummary,
    fetchMovements,
  ]);

  // Fetch valuation on mount
  useEffect(() => {
    fetchValuation();
  }, []);

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
