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
import { Link, useNavigate } from '@tanstack/react-router';
import {
  RefreshCw,
  ArrowRight,
  Edit2,
  Package,
  MapPin,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Clock,
  BarChart3,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button, buttonVariants } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import { toast, useOrgFormat } from '@/hooks';
import { useTrackedProducts } from '@/hooks/dashboard/use-tracked-products';
import { DataTableEmpty } from '@/components/shared/data-table';
import {
  useWMSDashboard,
  useInventoryDashboard,
  useMovementsDashboard,
  useTriggeredAlerts,
  useAcknowledgeAlert,
  type CategoryStock,
  type LocationStock,
} from '@/hooks/inventory';
import type { TriggeredAlert, DashboardTopMovingItem } from '@/lib/schemas/inventory';
import { TrackedProductsDialog } from '@/components/domain/dashboard/overview/tracked-products-dialog';
import {
  getInventoryDashboardReadErrorMessage,
  getWmsDashboardReadErrorMessage,
} from './dashboard-read-error-messages';
import { STOCK_STATUS_CONFIG } from './inventory-status-config';
import { StatusCell } from '@/components/shared/data-table';
import { InventoryDashboardCommandBar } from './inventory-dashboard-command-bar';
import { InventoryDashboardMetrics } from './inventory-dashboard-metrics';
import {
  InventoryDashboardAlertsSection,
  type DashboardAlert,
} from './inventory-dashboard-alerts-section';
import {
  InventoryDashboardMovementsSkeleton,
  InventoryDashboardMovementsTimeline,
} from './inventory-dashboard-movements-timeline';

// ============================================================================
// TYPES
// ============================================================================

interface TrackedItemStatus {
  productId: string;
  sku: string;
  name: string;
  quantity: number;
  reorderPoint: number;
  status: 'healthy' | 'low' | 'out';
}

function DashboardReadWarning({
  title,
  message,
}: {
  title: string;
  message: string;
}) {
  return (
    <Alert className="border-amber-500/30 bg-amber-500/5 text-foreground">
      <AlertTriangle className="h-4 w-4 text-amber-600" />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const UnifiedInventoryDashboard = memo(function UnifiedInventoryDashboard() {
  const navigate = useNavigate();
  const { formatCurrency } = useOrgFormat();
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

  // ─────────────────────────────────────────────────────────────────────────
  // Transformations
  // ─────────────────────────────────────────────────────────────────────────
  const formatValue = useCallback(
    (value: number) => formatCurrency(value, { cents: false }),
    [formatCurrency]
  );
  const trackedItemsWithStatus: TrackedItemStatus[] = (trackedItems ?? []).map(
    (item: { id: string; sku: string; name: string; quantity: number }) => ({
      productId: item.id,
      sku: item.sku,
      name: item.name,
      quantity: item.quantity,
      reorderPoint: 10,
      status: getStockStatus(item.quantity, 10),
    })
  );

  // Transform alerts
  const alerts: DashboardAlert[] = (alertsData?.alerts ?? []).map((a: TriggeredAlert) => {
    const severityMap: Record<string, 'critical' | 'warning' | 'info'> = {
      critical: 'critical',
      high: 'warning',
      medium: 'info',
      low: 'info',
    };
    return {
      id: a.alert?.id ?? crypto.randomUUID(),
      alertType: a.alert?.alertType ?? 'low_stock',
      severity: severityMap[a.severity] ?? 'warning',
      productName: a.product?.name,
      locationName: a.location?.name,
      message: a.message ?? 'Alert triggered',
      value: a.currentValue,
      threshold: a.thresholdValue,
      triggeredAt: a.alert?.lastTriggeredAt ? new Date(a.alert.lastTriggeredAt) : new Date(),
      isFallback: a.isFallback ?? false,
    };
  });

  // Top movers from dashboard data
  const topMovers = (dashboardData?.topMoving ?? []).map((m: DashboardTopMovingItem) => ({
    productId: m.productId,
    productName: m.productName ?? 'Unknown',
    sku: m.productSku ?? m.sku ?? '',
    movementCount: m.movementCount ?? 0,
    totalQuantity: m.totalQuantity ?? 0,
    trend: (m.trend ?? 'stable') as 'up' | 'down' | 'stable',
  }));

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
  const isLoading = isWmsLoading || isDashboardLoading;
  const hasUsableWmsData = !!wmsData;
  const hasUsableDashboardData = !!dashboardData;
  const showWmsUnavailable = !!wmsError && !hasUsableWmsData;
  const showWmsDegraded = !!wmsError && hasUsableWmsData;
  const showDashboardUnavailable = !!dashboardError && !hasUsableDashboardData;
  const showDashboardDegraded = !!dashboardError && hasUsableDashboardData;
  const wmsErrorMessage =
    getWmsDashboardReadErrorMessage(wmsError) ?? 'Please refresh and try again.';
  const dashboardErrorMessage =
    getInventoryDashboardReadErrorMessage(dashboardError) ?? 'Please refresh and try again.';

  if (showWmsUnavailable) {
    const errorMessage = wmsErrorMessage;
    return (
      <div className="p-8 text-center text-muted-foreground">
        <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-destructive" />
        <p className="font-medium">Failed to load inventory data</p>
        <p className="text-sm mt-1">Please try again or contact support if the problem persists.</p>
        {errorMessage && (
          <p className="text-xs mt-2 text-muted-foreground/80 font-mono max-w-md mx-auto truncate">
            {errorMessage}
          </p>
        )}
        <Button variant="outline" className="mt-4" onClick={handleRefresh}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Retry
        </Button>
      </div>
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
        <DashboardReadWarning
          title="Showing the most recent inventory dashboard snapshot while refresh is unavailable."
          message={wmsErrorMessage}
        />
      ) : null}
      {showDashboardDegraded ? (
        <DashboardReadWarning
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
        {/* Stock by Category */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">On-Hand by Category</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <CategorySkeleton />
            ) : (
              <div className="space-y-4">
                {showWmsDegraded ? (
                  <DashboardReadWarning
                    title="Category breakdown may be stale."
                    message={wmsErrorMessage}
                  />
                ) : null}
                <CategoryList categories={wmsData?.stockByCategory ?? []} formatValue={formatValue} />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Stock by Location */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">On-Hand by Location</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <LocationSkeleton />
            ) : (
              <div className="space-y-4">
                {showWmsDegraded ? (
                  <DashboardReadWarning
                    title="Location breakdown may be stale."
                    message={wmsErrorMessage}
                  />
                ) : null}
                <LocationList locations={wmsData?.stockByLocation ?? []} />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tracked Items */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3 flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">Tracked Items</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsTrackedDialogOpen(true)}
              className="text-xs h-7"
            >
              <Edit2 className="h-3 w-3 mr-1" />
              Edit
            </Button>
          </CardHeader>
          <CardContent>
            {isLoadingTracked ? (
              <TrackedItemsSkeleton />
            ) : trackedProductsUnavailable && trackedProductsSelection.length > 0 ? (
              <DashboardReadWarning
                title="Tracked items are temporarily unavailable."
                message={trackedProductsUnavailable}
              />
            ) : (
              <div className="space-y-4">
                {trackedProductsWarning ? (
                  <DashboardReadWarning
                    title="Tracked items may be stale."
                    message={trackedProductsWarning}
                  />
                ) : null}
                <TrackedItemsList
                  items={trackedItemsWithStatus}
                  onAddItems={() => setIsTrackedDialogOpen(true)}
                />
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ─────────────────────────────────────────────────────────────────────
          Section 5: Activity (Movements + Top Movers)
      ───────────────────────────────────────────────────────────────────── */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Movements */}
        <Card>
          <CardHeader className="pb-3 flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Recent Movements
              </CardTitle>
              <CardDescription className="mt-1">Last 24 hours</CardDescription>
            </div>
            <Link
              to="/inventory/analytics"
              className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'text-xs h-7')}
            >
              View All
              <ArrowRight className="h-3 w-3 ml-1" />
            </Link>
          </CardHeader>
          <CardContent>
            {isWmsLoading ? (
              <InventoryDashboardMovementsSkeleton />
            ) : showWmsUnavailable ? (
              <DashboardReadWarning
                title="Recent movements are temporarily unavailable."
                message={wmsErrorMessage}
              />
            ) : (
              <div className="space-y-4">
                {showWmsDegraded ? (
                  <DashboardReadWarning
                    title="Recent movements may be stale."
                    message={wmsErrorMessage}
                  />
                ) : null}
                <InventoryDashboardMovementsTimeline movements={wmsData?.recentMovements ?? []} />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Movers */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Top Moving Products
            </CardTitle>
            <CardDescription>By movement volume this period</CardDescription>
          </CardHeader>
          <CardContent>
            {isDashboardLoading ? (
              <TopMoversSkeleton />
            ) : showDashboardUnavailable ? (
              <DashboardReadWarning
                title="Top movers are temporarily unavailable."
                message={dashboardErrorMessage}
              />
            ) : (
              <div className="space-y-4">
                {showDashboardDegraded ? (
                  <DashboardReadWarning
                    title="Top movers may be stale."
                    message={dashboardErrorMessage}
                  />
                ) : null}
                <TopMoversList movers={topMovers} />
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ─────────────────────────────────────────────────────────────────────
          Empty State (for new users)
      ───────────────────────────────────────────────────────────────────── */}
      {!isLoading && totals.totalUnits === 0 && (
        <DataTableEmpty
          variant="empty"
          icon={Package}
          title="Welcome to Inventory Management"
          description="Get started by receiving your first inventory shipment or setting up your warehouse locations."
          action={{
            label: "Receive Inventory",
            onClick: () => navigate({ to: '/inventory/receiving' }),
          }}
          secondaryAction={{
            label: "Set Up Locations",
            onClick: () => navigate({ to: '/inventory/locations' }),
          }}
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

// ============================================================================
// CATEGORY LIST
// ============================================================================

function CategoryList({
  categories,
  formatValue,
}: {
  categories: CategoryStock[];
  formatValue: (v: number) => string;
}) {
  if (categories.length === 0) {
    return (
      <DataTableEmpty
        variant="empty"
        icon={Package}
        title="No categories found"
        description="Inventory items will be grouped by category once products are assigned categories."
        className="py-4"
      />
    );
  }

  return (
    <div className="space-y-3">
      {categories.slice(0, 5).map((cat) => (
        <div key={cat.categoryId ?? 'uncategorized'} className="flex items-center justify-between">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium truncate">{cat.categoryName}</p>
            <p className="text-xs text-muted-foreground">{formatValue(cat.totalValue)}</p>
          </div>
          <Badge variant="secondary" className="ml-2 tabular-nums">
            {cat.unitCount.toLocaleString()}
          </Badge>
        </div>
      ))}
      {categories.length > 5 && (
        <p className="text-xs text-muted-foreground text-center pt-2">
          +{categories.length - 5} more categories
        </p>
      )}
    </div>
  );
}

// ============================================================================
// LOCATION LIST
// ============================================================================

function LocationList({
  locations,
}: {
  locations: LocationStock[];
}) {
  if (locations.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <MapPin className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">No locations configured</p>
        <Link to="/inventory/locations" className={cn(buttonVariants({ variant: 'link', size: 'sm' }))}>
          Add a location
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {locations.slice(0, 5).map((loc) => (
        <div key={loc.locationId}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-medium truncate">{loc.locationName}</span>
            <span className="text-xs text-muted-foreground tabular-nums">
              {loc.percentage}%
            </span>
          </div>
          <Progress value={loc.percentage} className="h-1.5" />
        </div>
      ))}
      {locations.length > 5 && (
        <Link
          to="/inventory/locations"
          className="block text-xs text-muted-foreground text-center pt-2 hover:text-foreground"
        >
          View all {locations.length} locations
        </Link>
      )}
    </div>
  );
}

// ============================================================================
// TRACKED ITEMS LIST
// ============================================================================

function TrackedItemsList({
  items,
  onAddItems,
}: {
  items: TrackedItemStatus[];
  onAddItems: () => void;
}) {
  if (items.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">No items tracked yet</p>
        <Button variant="link" size="sm" className="mt-1" onClick={onAddItems}>
          Add items to track
        </Button>
      </div>
    );
  }

  // Map dashboard status keys to STOCK_STATUS_CONFIG keys
  // Dashboard uses: healthy/low/out
  // Config uses: in_stock/low_stock/out_of_stock
  const statusKeyMap: Record<string, keyof typeof STOCK_STATUS_CONFIG> = {
    healthy: 'in_stock',
    low: 'low_stock',
    out: 'out_of_stock',
  };

  return (
    <div className="space-y-2">
      {items.slice(0, 5).map((item) => {
        const mappedStatus = statusKeyMap[item.status] ?? 'in_stock';
        return (
          <Link
            key={item.productId}
            to="/products/$productId"
            params={{ productId: item.productId }}
            search={{ tab: 'inventory' }}
            className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50 transition-colors"
          >
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium truncate">{item.sku}</p>
              <p className="text-xs text-muted-foreground truncate">{item.name}</p>
            </div>
            <div className="flex items-center gap-2 ml-2">
              <span className="text-xs tabular-nums">{item.quantity}</span>
              <StatusCell
                status={mappedStatus}
                statusConfig={STOCK_STATUS_CONFIG}
                showIcon
                className="text-xs"
              />
            </div>
          </Link>
        );
      })}
    </div>
  );
}

// ============================================================================
// TOP MOVERS LIST
// ============================================================================

function TopMoversList({
  movers,
}: {
  movers: Array<{
    productId: string;
    productName: string;
    sku: string;
    totalQuantity: number;
    trend: 'up' | 'down' | 'stable';
  }>;
}) {
  if (movers.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <TrendingUp className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">No movement data yet</p>
      </div>
    );
  }

  const maxQuantity = Math.max(...movers.map((m) => m.totalQuantity));

  return (
    <div className="space-y-3">
      {movers.slice(0, 5).map((mover) => {
        const percentage = (mover.totalQuantity / maxQuantity) * 100;
        return (
          <div key={mover.productId} className="space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">{mover.productName}</p>
                <p className="text-xs text-muted-foreground">{mover.sku}</p>
              </div>
              <div className="flex items-center gap-2 ml-2">
                <span className="text-sm font-medium tabular-nums">{mover.totalQuantity}</span>
                {mover.trend === 'up' && <TrendingUp className="h-3.5 w-3.5 text-green-600" />}
                {mover.trend === 'down' && <TrendingDown className="h-3.5 w-3.5 text-red-600" />}
              </div>
            </div>
            <Progress value={percentage} className="h-1.5" />
          </div>
        );
      })}
    </div>
  );
}

// ============================================================================
// SKELETONS
// ============================================================================

function CategorySkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex items-center justify-between">
          <div>
            <Skeleton className="h-4 w-24 mb-1" />
            <Skeleton className="h-3 w-16" />
          </div>
          <Skeleton className="h-5 w-12" />
        </div>
      ))}
    </div>
  );
}

function LocationSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i}>
          <div className="flex justify-between mb-1">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-8" />
          </div>
          <Skeleton className="h-1.5 w-full" />
        </div>
      ))}
    </div>
  );
}

function TrackedItemsSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex items-center justify-between p-2">
          <div>
            <Skeleton className="h-4 w-16 mb-1" />
            <Skeleton className="h-3 w-24" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-6" />
            <Skeleton className="h-5 w-10" />
          </div>
        </div>
      ))}
    </div>
  );
}

function TopMoversSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="space-y-1.5">
          <div className="flex justify-between">
            <div>
              <Skeleton className="h-4 w-28 mb-1" />
              <Skeleton className="h-3 w-16" />
            </div>
            <Skeleton className="h-4 w-8" />
          </div>
          <Skeleton className="h-1.5 w-full" />
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// HELPERS
// ============================================================================

function getStockStatus(quantity: number, reorderPoint: number): 'healthy' | 'low' | 'out' {
  if (quantity === 0) return 'out';
  if (quantity <= reorderPoint) return 'low';
  return 'healthy';
}

export default UnifiedInventoryDashboard;
