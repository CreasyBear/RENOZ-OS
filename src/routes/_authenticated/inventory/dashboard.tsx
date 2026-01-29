/**
 * Inventory Dashboard Route
 *
 * Central warehouse operations dashboard with real-time metrics,
 * alerts, and quick actions for inventory management.
 *
 * Features:
 * - Stock overview metrics with real-time updates
 * - Active inventory alerts with acknowledgment
 * - Recent movements timeline
 * - Top moving products analysis
 * - Location utilization heatmap
 * - Quick action buttons
 *
 * Accessibility:
 * - Skeleton loaders mirror final widget layout (prevent CLS)
 * - Each widget has empty state with clear next action
 * - Charts use color-blind-friendly palette (not color-only)
 * - Real-time metrics use aria-live="polite" for updates
 * - All icon-only buttons have aria-label
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Package, RefreshCw } from "lucide-react";
import { PageLayout, RouteErrorFallback } from "@/components/layout";
import { InventoryDashboardSkeleton } from "@/components/skeletons/inventory";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks";
import {
  useInventoryDashboard,
  useMovementsDashboard,
  useTriggeredAlerts,
  useAcknowledgeAlert,
  useLocationUtilization,
} from "@/hooks/inventory";
import { queryKeys } from "@/lib/query-keys";
import {
  StockOverviewWidget,
  RecentMovementsWidget,
  TopMoversWidget,
  LocationUtilizationWidget,
  AlertsPanel,
  QuickActionsBar,
  type InventoryAlert,
} from "@/components/domain/inventory";

export const Route = createFileRoute("/_authenticated/inventory/dashboard")({
  component: InventoryDashboard,
  errorComponent: ({ error }) => (
    <RouteErrorFallback error={error} parentRoute="/inventory" />
  ),
  pendingComponent: () => (
    <PageLayout variant="full-width">
      <PageLayout.Header title="Inventory Dashboard" />
      <PageLayout.Content>
        <InventoryDashboardSkeleton />
      </PageLayout.Content>
    </PageLayout>
  ),
});

// ============================================================================
// COMPONENT
// ============================================================================

function InventoryDashboard() {
  const queryClient = useQueryClient();

  // Data fetching with hooks - all have built-in refetchInterval
  const { data: dashboardData, isLoading: isDashboardLoading } =
    useInventoryDashboard();
  const { data: movementsData, isLoading: isMovementsLoading } =
    useMovementsDashboard({ page: 1, pageSize: 10, sortBy: "createdAt", sortOrder: "desc" });
  const { data: alertsData, isLoading: isAlertsLoading } = useTriggeredAlerts();
  const { data: utilizationData, isLoading: isUtilizationLoading } =
    useLocationUtilization();

  // Mutation for acknowledging alerts
  const acknowledgeAlertMutation = useAcknowledgeAlert();

  // Transform data to match widget types
  const metrics = dashboardData?.metrics ?? null;

  const topMovers = (dashboardData?.topMoving ?? []).map((m: any) => ({
    productId: m.productId,
    productName: m.productName ?? "Unknown",
    sku: m.sku ?? "",
    movementCount: m.movementCount ?? 0,
    totalQuantity: m.totalQuantity ?? 0,
    trend: (m.trend ?? "stable") as "up" | "down" | "stable",
  }));

  const movements = ((movementsData as any)?.movements ?? []).map((m: any) => ({
    id: m.id,
    productName: m.productName ?? "Unknown Product",
    movementType: m.movementType,
    quantity: m.quantity,
    locationName: m.locationName ?? "Unknown Location",
    performedAt: m.performedAt,
    performedBy: m.performedByName ?? "Unknown",
  }));

  const alerts: InventoryAlert[] = (alertsData?.alerts ?? []).map((a: any) => ({
    id: a.id,
    alertType: a.alertType,
    severity: a.severity ?? "warning",
    productId: a.productId,
    productName: a.productName,
    locationId: a.locationId,
    locationName: a.locationName,
    message: a.message ?? "Alert triggered",
    value: a.value,
    threshold: a.threshold,
    triggeredAt: a.triggeredAt ?? new Date(),
    acknowledgedAt: a.acknowledgedAt,
    acknowledgedBy: a.acknowledgedBy,
  }));

  const locations = (utilizationData?.locations ?? []).map((l: any) => ({
    locationId: l.id ?? l.locationId,
    locationName: l.name,
    locationType: l.locationType,
    capacity: l.capacity ?? 0,
    used: l.used ?? l.itemCount ?? 0,
    utilizationPercent: l.utilizationPercent ?? 0,
  }));

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.inventory.dashboard() });
    queryClient.invalidateQueries({ queryKey: queryKeys.inventory.movements({ dashboard: true }) });
    queryClient.invalidateQueries({ queryKey: queryKeys.inventory.triggeredAlerts() });
    queryClient.invalidateQueries({ queryKey: queryKeys.locations.utilization() });
    toast.success("Dashboard refreshed");
  };

  const handleAcknowledgeAlert = (alertId: string) => {
    acknowledgeAlertMutation.mutate(alertId);
  };

  const handleViewAlertDetails = (alert: InventoryAlert) => {
    toast.info("Alert details", { description: alert.message });
  };

  return (
    <PageLayout variant="full-width">
      <PageLayout.Header
        title="Inventory Dashboard"
        description="Real-time warehouse operations overview"
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              aria-label="Refresh dashboard data"
            >
              <RefreshCw className="h-4 w-4 mr-2" aria-hidden="true" />
              Refresh
            </Button>
            <QuickActionsBar />
          </div>
        }
      />

      <PageLayout.Content>
        {/* Stock Overview Metrics */}
        <section aria-labelledby="stock-overview-heading" className="mb-6">
          <h2 id="stock-overview-heading" className="sr-only">
            Stock Overview
          </h2>
          <StockOverviewWidget
            metrics={metrics}
            isLoading={isDashboardLoading}
          />
        </section>

        {/* Main Grid: Alerts + Widgets */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left Column: Alerts Panel */}
          <section
            aria-labelledby="alerts-heading"
            className="lg:col-span-1"
          >
            <h2 id="alerts-heading" className="sr-only">
              Inventory Alerts
            </h2>
            <AlertsPanel
              alerts={alerts}
              isLoading={isAlertsLoading}
              onAcknowledge={handleAcknowledgeAlert}
              onViewDetails={handleViewAlertDetails}
              onViewAll={() => {
                // Navigate to alerts page
              }}
              maxHeight="500px"
            />
          </section>

          {/* Right Column: Movements + Top Movers */}
          <div className="lg:col-span-2 space-y-6">
            <section aria-labelledby="movements-heading">
              <h2 id="movements-heading" className="sr-only">
                Recent Inventory Movements
              </h2>
              <RecentMovementsWidget
                movements={movements}
                isLoading={isMovementsLoading}
              />
            </section>

            <div className="grid gap-6 md:grid-cols-2">
              <section aria-labelledby="top-movers-heading">
                <h2 id="top-movers-heading" className="sr-only">
                  Top Moving Products
                </h2>
                <TopMoversWidget
                  movers={topMovers}
                  isLoading={isDashboardLoading}
                />
              </section>

              <section aria-labelledby="utilization-heading">
                <h2 id="utilization-heading" className="sr-only">
                  Location Utilization
                </h2>
                <LocationUtilizationWidget
                  locations={locations}
                  isLoading={isUtilizationLoading}
                />
              </section>
            </div>
          </div>
        </div>

        {/* Empty State for New Users */}
        {!isDashboardLoading &&
          !metrics?.totalUnits &&
          movements.length === 0 && (
            <div className="mt-8 rounded-lg border-2 border-dashed border-muted-foreground/25 p-12 text-center">
              <Package className="mx-auto h-12 w-12 text-muted-foreground/50" />
              <h3 className="mt-4 text-lg font-semibold">
                Welcome to Inventory Management
              </h3>
              <p className="mt-2 text-sm text-muted-foreground max-w-md mx-auto">
                Get started by receiving your first inventory shipment or
                setting up your warehouse locations.
              </p>
              <div className="mt-6 flex justify-center gap-3">
                <Button asChild>
                  <Link to="/inventory">
                    Receive Inventory
                  </Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link to="/settings">
                    Set Up Locations
                  </Link>
                </Button>
              </div>
            </div>
          )}
      </PageLayout.Content>
    </PageLayout>
  );
}

export default InventoryDashboard;
