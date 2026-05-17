/**
 * Unified Inventory Dashboard
 *
 * Comprehensive warehouse management dashboard that consolidates:
 * - Stock overview metrics
 * - Active alerts
 * - Stock by category & location
 * - Tracked items watchlist
 * - Recent movements timeline
 * - Top moving products
 *
 * ARCHITECTURE: Container Component - handles data fetching and business logic.
 *
 * @source wmsData from useWMSDashboard hook
 * @source dashboardData from useInventoryDashboard hook
 * @source movements from useMovementsDashboard hook
 * @source alertsData from useTriggeredAlerts hook
 * @source searchResults inside InventoryDashboardCommandBar
 * @source trackedItems from useTrackedProducts hook
 *
 * @see docs/design-system/INVENTORY-DASHBOARD-SPEC.md
 */

import { useState, useCallback, memo } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { toast } from '@/hooks';
import { useTrackedProducts } from '@/hooks/dashboard/use-tracked-products';
import {
  useWMSDashboard,
  useInventoryDashboard,
  useMovementsDashboard,
  useTriggeredAlerts,
  useAcknowledgeAlert,
} from '@/hooks/inventory';
import { TrackedProductsDialog } from '@/components/domain/dashboard/overview/tracked-products-dialog';
import { InventoryDashboardCommandBar } from './inventory-dashboard-command-bar';
import { InventoryDashboardMetrics } from './inventory-dashboard-metrics';
import { buildDashboardAlerts } from './inventory-dashboard-alert-mappers';
import { InventoryDashboardAlertsSection } from './inventory-dashboard-alerts-section';
import { InventoryDashboardEmptyState } from './inventory-dashboard-empty-state';
import { buildInventoryDashboardReadState } from './inventory-dashboard-read-state';
import { InventoryDashboardReadWarning } from './inventory-dashboard-read-warning';
import { InventoryDashboardRecentMovementsPanel } from './inventory-dashboard-recent-movements-panel';
import { InventoryDashboardStockBreakdownCards } from './inventory-dashboard-stock-breakdown-cards';
import { InventoryDashboardTopMoversPanel } from './inventory-dashboard-top-movers-panel';
import { InventoryDashboardTrackedItemsPanel } from './inventory-dashboard-tracked-items-panel';
import { InventoryDashboardUnavailableState } from './inventory-dashboard-unavailable-state';

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const UnifiedInventoryDashboard = memo(function UnifiedInventoryDashboard() {
  const navigate = useNavigate();
  const [isTrackedDialogOpen, setIsTrackedDialogOpen] = useState(false);

  // ─────────────────────────────────────────────────────────────────────────
  // Data Fetching
  // ─────────────────────────────────────────────────────────────────────────
  const {
    data: wmsData,
    isLoading: isWmsLoading,
    error: wmsError,
    refetch: refetchWMS,
  } = useWMSDashboard();
  const {
    data: dashboardData,
    isLoading: isDashboardLoading,
    error: dashboardError,
    refetch: refetchDashboard,
  } = useInventoryDashboard();

  // Extract comparison data for trend indicators
  const comparison = wmsData?.comparison;
  // Movement data loaded via wmsData.recentMovements - this hook kept for future detailed views
  const { refetch: refetchMovements } = useMovementsDashboard({
    page: 1,
    pageSize: 20,
    sortBy: 'createdAt',
    sortOrder: 'desc',
  });
  const {
    data: alertsData,
    isLoading: isAlertsLoading,
    refetch: refetchAlerts,
  } = useTriggeredAlerts();
  const {
    products: trackedProductsSelection,
    productsWithInventory: trackedItems,
    setProducts: setTrackedProducts,
    isLoading: isLoadingTracked,
    trackedProductsWarning,
    trackedProductsUnavailable,
  } = useTrackedProducts();

  const acknowledgeAlertMutation = useAcknowledgeAlert();

  const alerts = buildDashboardAlerts(alertsData?.alerts ?? []);

  // ─────────────────────────────────────────────────────────────────────────
  // Handlers
  // ─────────────────────────────────────────────────────────────────────────
  // Use refetch from hooks instead of queryClient.invalidateQueries
  const handleRefresh = useCallback(async () => {
    await Promise.all([
      refetchWMS(),
      refetchDashboard(),
      refetchMovements(),
      refetchAlerts(),
    ]);
    toast.success('Dashboard refreshed');
  }, [refetchWMS, refetchDashboard, refetchMovements, refetchAlerts]);

  const handleAcknowledgeAlert = useCallback(
    (alertId: string) => {
      acknowledgeAlertMutation.mutate(alertId);
    },
    [acknowledgeAlertMutation]
  );

  // ─────────────────────────────────────────────────────────────────────────
  // Loading & Error States
  // ─────────────────────────────────────────────────────────────────────────
  const {
    isLoading,
    showWmsUnavailable,
    showWmsDegraded,
    showDashboardUnavailable,
    showDashboardDegraded,
    wmsErrorMessage,
    dashboardErrorMessage,
  } = buildInventoryDashboardReadState({
    wmsData,
    dashboardData,
    wmsError,
    dashboardError,
    isWmsLoading,
    isDashboardLoading,
  });

  if (showWmsUnavailable) {
    return (
      <InventoryDashboardUnavailableState
        message={wmsErrorMessage}
        onRetry={handleRefresh}
      />
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Metrics
  // ─────────────────────────────────────────────────────────────────────────
  const totals = wmsData?.totals ?? { totalValue: 0, totalUnits: 0, totalSkus: 0 };
  const metrics = dashboardData?.metrics ?? null;
  const locationsCount = metrics?.locationsCount ?? wmsData?.stockByLocation?.length ?? 0;

  return (
    <div className="space-y-6">
      {showWmsDegraded ? (
        <InventoryDashboardReadWarning
          title="Showing the most recent inventory dashboard snapshot while refresh is unavailable."
          message={wmsErrorMessage}
        />
      ) : null}
      {showDashboardDegraded ? (
        <InventoryDashboardReadWarning
          title="Showing the most recent dashboard metrics while refresh is unavailable."
          message={dashboardErrorMessage}
        />
      ) : null}

      {/* ─────────────────────────────────────────────────────────────────────
          Section 1: Search + Quick Actions
      ───────────────────────────────────────────────────────────────────── */}
      <InventoryDashboardCommandBar onRefresh={handleRefresh} />

      {/* ─────────────────────────────────────────────────────────────────────
          Section 2: Key Metrics
      ───────────────────────────────────────────────────────────────────── */}
      <InventoryDashboardMetrics
        totals={totals}
        comparison={comparison}
        metrics={metrics}
        locationsCount={locationsCount}
        isLoading={isLoading}
        showDashboardUnavailable={showDashboardUnavailable}
        stockSemantics={wmsData?.stockSemantics}
        comparisonUnits={wmsData?.comparisonUnits}
      />

      {/* ─────────────────────────────────────────────────────────────────────
          Section 3: Active Alerts (if any)
      ───────────────────────────────────────────────────────────────────── */}
      {!isAlertsLoading && alerts.length > 0 && (
        <InventoryDashboardAlertsSection
          alerts={alerts}
          onAcknowledge={handleAcknowledgeAlert}
        />
      )}

      {/* ─────────────────────────────────────────────────────────────────────
          Section 4: Stock Breakdown (Category + Location + Tracked Items)
      ───────────────────────────────────────────────────────────────────── */}
      <div className="grid gap-6 lg:grid-cols-3">
        <InventoryDashboardStockBreakdownCards
          categories={wmsData?.stockByCategory ?? []}
          locations={wmsData?.stockByLocation ?? []}
          isLoading={isLoading}
          showDegraded={showWmsDegraded}
          readErrorMessage={wmsErrorMessage}
        />

        <InventoryDashboardTrackedItemsPanel
          items={trackedItems ?? []}
          selectedCount={trackedProductsSelection.length}
          isLoading={isLoadingTracked}
          warningMessage={trackedProductsWarning}
          unavailableMessage={trackedProductsUnavailable}
          onEdit={() => setIsTrackedDialogOpen(true)}
        />
      </div>

      {/* ─────────────────────────────────────────────────────────────────────
          Section 5: Activity (Movements + Top Movers)
      ───────────────────────────────────────────────────────────────────── */}
      <div className="grid gap-6 lg:grid-cols-2">
        <InventoryDashboardRecentMovementsPanel
          movements={wmsData?.recentMovements ?? []}
          isLoading={isWmsLoading}
          showUnavailable={showWmsUnavailable}
          showDegraded={showWmsDegraded}
          readErrorMessage={wmsErrorMessage}
        />

        {/* Top Movers */}
        <InventoryDashboardTopMoversPanel
          topMoving={dashboardData?.topMoving ?? []}
          isLoading={isDashboardLoading}
          showUnavailable={showDashboardUnavailable}
          showDegraded={showDashboardDegraded}
          readErrorMessage={dashboardErrorMessage}
        />
      </div>

      {/* ─────────────────────────────────────────────────────────────────────
          Empty State (for new users)
      ───────────────────────────────────────────────────────────────────── */}
      {!isLoading && totals.totalUnits === 0 && (
        <InventoryDashboardEmptyState
          onReceiveInventory={() => navigate({ to: '/inventory/receiving' })}
          onSetUpLocations={() => navigate({ to: '/inventory/locations' })}
        />
      )}

      {/* ─────────────────────────────────────────────────────────────────────
          Tracked Products Dialog
      ───────────────────────────────────────────────────────────────────── */}
      <TrackedProductsDialog
        open={isTrackedDialogOpen}
        onOpenChange={setIsTrackedDialogOpen}
        selectedProducts={trackedProductsSelection}
        onSave={setTrackedProducts}
      />
    </div>
  );
});

export default UnifiedInventoryDashboard;
