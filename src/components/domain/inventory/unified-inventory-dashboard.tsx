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
 * @source searchResults from useInventorySearch hook
 * @source trackedItems from useTrackedProducts hook
 *
 * @see docs/design-system/INVENTORY-DASHBOARD-SPEC.md
 */

import { useState, useCallback, useEffect, Fragment, memo, useRef } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import {
  Search,
  RefreshCw,
  ArrowRight,
  ArrowDownToLine,
  ArrowRightLeft,
  ArrowUpFromLine,
  Edit2,
  Package,
  MapPin,
  AlertTriangle,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Clock,
  BarChart3,
  Plus,
  Settings,
  X,
  ChevronRight,
} from 'lucide-react';
import { format, isToday, isYesterday } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button, buttonVariants } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { toast, useOrgFormat, useDebounce } from '@/hooks';
import { useTrackedProducts } from '@/hooks/dashboard/use-tracked-products';
import { DataTableEmpty } from '@/components/shared/data-table';
import {
  useWMSDashboard,
  useInventoryDashboard,
  useMovementsDashboard,
  useTriggeredAlerts,
  useAcknowledgeAlert,
  useInventorySearch,
  type CategoryStock,
  type LocationStock,
  type RecentMovement,
} from '@/hooks/inventory';
import type { TriggeredAlert, DashboardTopMovingItem } from '@/lib/schemas/inventory';
import { MetricCard } from '@/components/shared/metric-card';
import { FormatAmount } from '@/components/shared/format';
import { TrackedProductsDialog } from '@/components/domain/dashboard/overview/tracked-products-dialog';
import { STOCK_STATUS_CONFIG } from './inventory-status-config';
import { StatusCell } from '@/components/shared/data-table';

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

interface DashboardAlert {
  id: string;
  alertType: string;
  severity: 'critical' | 'warning' | 'info';
  productName?: string;
  locationName?: string;
  message: string;
  value: number;
  threshold: number;
  triggeredAt: Date;
}

// ============================================================================
// MOVEMENT ICONS & COLORS
// ============================================================================

const movementIcons = {
  receipt: ArrowDownToLine,
  receive: ArrowDownToLine,
  transfer: ArrowRightLeft,
  allocation: ArrowUpFromLine,
  allocate: ArrowUpFromLine,
  pick: ArrowUpFromLine,
  ship: ArrowUpFromLine,
  adjust: ArrowRightLeft,
  return: ArrowDownToLine,
  deallocate: ArrowRightLeft,
};


// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const UnifiedInventoryDashboard = memo(function UnifiedInventoryDashboard() {
  const navigate = useNavigate();
  const { formatCurrency } = useOrgFormat();
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [isTrackedDialogOpen, setIsTrackedDialogOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const debouncedSearch = useDebounce(searchQuery, 300);

  // Inventory search for quick navigation
  const { data: searchResults, isLoading: isSearching } = useInventorySearch(
    debouncedSearch,
    { limit: 8 },
    debouncedSearch.length >= 2
  );
  const searchItems = searchResults?.items ?? [];

  // Close search dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setIsSearchFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
  } = useTrackedProducts();

  const acknowledgeAlertMutation = useAcknowledgeAlert();

  // ─────────────────────────────────────────────────────────────────────────
  // Keyboard Shortcut for Search
  // ─────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '/' && !e.ctrlKey && !e.metaKey) {
        const activeElement = document.activeElement;
        if (activeElement?.tagName !== 'INPUT' && activeElement?.tagName !== 'TEXTAREA') {
          e.preventDefault();
          document.getElementById('inventory-search')?.focus();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // Transformations
  // ─────────────────────────────────────────────────────────────────────────
  const formatValue = useCallback(
    (value: number) => formatCurrency(value, { cents: false }),
    [formatCurrency]
  );

  const groupedMovements = groupMovementsByDate(wmsData?.recentMovements ?? []);

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

  if (wmsError) {
    const errorMessage =
      wmsError instanceof Error ? wmsError.message : 'Unknown error';
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
  const lowStockCount = metrics?.lowStockCount ?? 0;
  const outOfStockCount = metrics?.outOfStockCount ?? 0;
  const locationsCount = metrics?.locationsCount ?? wmsData?.stockByLocation?.length ?? 0;

  return (
    <div className="space-y-6">
      {/* ─────────────────────────────────────────────────────────────────────
          Section 1: Search + Quick Actions
      ───────────────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1" ref={searchRef}>
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
          <Input
            id="inventory-search"
            type="search"
            placeholder="Search products, SKUs, serials..."
            className="pl-10 pr-12"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setIsSearchFocused(true)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                setIsSearchFocused(false);
                setSearchQuery('');
              }
            }}
            aria-label="Search inventory"
          />
          <kbd className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded pointer-events-none z-10">
            /
          </kbd>

          {/* Search Results Dropdown */}
          {isSearchFocused && debouncedSearch.length >= 2 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-popover border rounded-md shadow-lg z-50 max-h-[320px] overflow-y-auto">
              {isSearching ? (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  Searching...
                </div>
              ) : searchItems.length === 0 ? (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  No inventory found for &quot;{debouncedSearch}&quot;
                </div>
              ) : (
                <div className="py-1">
                  {searchItems.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center gap-3 px-3 py-3 hover:bg-muted transition-colors min-h-[44px]"
                    >
                      <Package className="h-4 w-4 text-muted-foreground shrink-0" />
                      <button
                        type="button"
                        className="min-w-0 flex-1 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded"
                        onClick={() => {
                          setIsSearchFocused(false);
                          setSearchQuery('');
                          navigate({ to: '/inventory/$itemId', params: { itemId: item.id } });
                        }}
                      >
                        <p className="text-sm font-medium truncate">{item.productName}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {item.serialNumber && <span className="font-mono">S/N: {item.serialNumber}</span>}
                          {item.serialNumber && (item.productSku || item.locationName) && ' · '}
                          {item.productSku && `SKU: ${item.productSku}`}
                          {item.productSku && item.locationName && ' · '}
                          {item.locationName && `@ ${item.locationName}`}
                        </p>
                      </button>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-medium tabular-nums">{item.quantityOnHand}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.status === 'available' ? 'available' : item.status}
                        </p>
                      </div>
                      {item.productId && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 shrink-0 min-h-[44px] min-w-[44px]"
                          onClick={(e) => {
                            e.stopPropagation();
                            setIsSearchFocused(false);
                            setSearchQuery('');
                            navigate({
                              to: '/products/$productId',
                              params: { productId: item.productId },
                              search: { tab: 'inventory' },
                            });
                          }}
                          title="View Product Inventory"
                          aria-label="View Product Inventory"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Quick Actions
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem className="p-0">
                <Link to="/inventory/receiving" className="flex w-full items-center px-2 py-1.5">
                  <ArrowDownToLine className="h-4 w-4 mr-2" />
                  Receive Inventory
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem className="p-0">
                <Link to="/inventory/counts" className="flex w-full items-center px-2 py-1.5">
                  <Package className="h-4 w-4 mr-2" />
                  Stock Count
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="p-0">
                <Link to="/inventory/locations" className="flex w-full items-center px-2 py-1.5">
                  <MapPin className="h-4 w-4 mr-2" />
                  Manage Locations
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem className="p-0">
                <Link to="/inventory/alerts" className="flex w-full items-center px-2 py-1.5">
                  <Settings className="h-4 w-4 mr-2" />
                  Alert Settings
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────────────
          Section 2: Key Metrics
      ───────────────────────────────────────────────────────────────────── */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Total Value"
          value={<FormatAmount amount={totals.totalValue} />}
          subtitle={`${totals.totalSkus.toLocaleString()} SKUs`}
          icon={DollarSign}
          isLoading={isLoading}
          delta={comparison?.totalValueChange !== undefined ? Math.abs(comparison.totalValueChange) : undefined}
          positive={comparison?.totalValueChange !== undefined ? comparison.totalValueChange > 0 : undefined}
        />
        <MetricCard
          title="Total Units"
          value={totals.totalUnits.toLocaleString()}
          subtitle="In stock"
          icon={Package}
          isLoading={isLoading}
          delta={comparison?.totalUnitsChange !== undefined ? Math.abs(comparison.totalUnitsChange) : undefined}
          positive={comparison?.totalUnitsChange !== undefined ? comparison.totalUnitsChange > 0 : undefined}
        />
        <MetricCard
          title="Stock Alerts"
          value={lowStockCount + outOfStockCount}
          subtitle={`${lowStockCount} low, ${outOfStockCount} out`}
          icon={AlertTriangle}
          isLoading={isLoading}
          alert={lowStockCount + outOfStockCount > 0}
          delta={
            comparison?.alertsChange !== undefined && comparison.alertsChange !== 0
              ? Math.abs(comparison.alertsChange)
              : undefined
          }
          positive={
            comparison?.alertsChange !== undefined
              ? comparison.alertsChange < 0 // Inverse: fewer alerts is better
              : undefined
          }
        />
        <MetricCard
          title="Locations"
          value={locationsCount}
          subtitle="Active warehouses"
          icon={MapPin}
          isLoading={isLoading}
        />
      </div>

      {/* ─────────────────────────────────────────────────────────────────────
          Section 3: Active Alerts (if any)
      ───────────────────────────────────────────────────────────────────── */}
      {!isAlertsLoading && alerts.length > 0 && (
        <AlertsSection alerts={alerts} onAcknowledge={handleAcknowledgeAlert} />
      )}

      {/* ─────────────────────────────────────────────────────────────────────
          Section 4: Stock Breakdown (Category + Location + Tracked Items)
      ───────────────────────────────────────────────────────────────────── */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Stock by Category */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Stock by Category</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <CategorySkeleton />
            ) : (
              <CategoryList categories={wmsData?.stockByCategory ?? []} formatValue={formatValue} />
            )}
          </CardContent>
        </Card>

        {/* Stock by Location */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Stock by Location</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <LocationSkeleton />
            ) : (
              <LocationList locations={wmsData?.stockByLocation ?? []} />
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
            ) : (
              <TrackedItemsList
                items={trackedItemsWithStatus}
                onAddItems={() => setIsTrackedDialogOpen(true)}
              />
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
              <MovementsSkeleton />
            ) : (
              <MovementsTimeline groupedMovements={groupedMovements} />
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
            ) : (
              <TopMoversList movers={topMovers} />
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
// ALERTS SECTION
// ============================================================================

function AlertsSection({
  alerts,
  onAcknowledge,
}: {
  alerts: DashboardAlert[];
  onAcknowledge: (id: string) => void;
}) {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const visibleAlerts = alerts.filter((a) => !dismissed.has(a.id)).slice(0, 3);

  if (visibleAlerts.length === 0) return null;

  const severityStyles: Record<string, string> = {
    critical: 'border-destructive/50 bg-destructive/10 text-destructive',
    warning: 'border-amber-500/50 bg-amber-500/10 text-amber-700 dark:text-amber-400',
    info: 'border-blue-500/50 bg-blue-500/10 text-blue-700 dark:text-blue-400',
  };

  const alertTypeLabels: Record<string, string> = {
    low_stock: 'Low Stock',
    out_of_stock: 'Out of Stock',
    overstock: 'Overstock',
    expiry: 'Expiring Soon',
    slow_moving: 'Slow Moving',
  };

  return (
    <div className="space-y-2">
      {visibleAlerts.map((alert) => (
        <Alert key={alert.id} className={cn('relative pr-10', severityStyles[alert.severity])}>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle className="font-medium">
            {alertTypeLabels[alert.alertType] ?? alert.alertType}
            {alert.productName && `: ${alert.productName}`}
          </AlertTitle>
          <AlertDescription className="text-sm mt-0.5">{alert.message}</AlertDescription>
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-2 right-2 h-6 w-6 opacity-50 hover:opacity-100"
            onClick={() => {
              setDismissed((prev) => new Set([...prev, alert.id]));
              onAcknowledge(alert.id);
            }}
          >
            <X className="h-3 w-3" />
          </Button>
        </Alert>
      ))}
      {alerts.length > 3 && (
        <Link
          to="/inventory/alerts"
          className="block text-sm text-muted-foreground text-center hover:text-foreground"
        >
          View all {alerts.length} alerts
          <ChevronRight className="inline h-3 w-3 ml-1" />
        </Link>
      )}
    </div>
  );
}

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
// MOVEMENTS TIMELINE (Activity-Style Aggregation)
// ============================================================================

interface AggregatedActivity {
  id: string;
  type: string;
  reference: string | null;
  timestamp: Date;
  totalQuantity: number;
  skuCount: number;
  skus: string[];
  location: string;
  toLocation: string | null;
}

/**
 * Aggregate movements by reference (order/PO) or by type+location+timeWindow.
 * This creates meaningful activity entries instead of individual "+1" movements.
 */
function aggregateMovementsIntoActivities(movements: RecentMovement[]): AggregatedActivity[] {
  const activityMap = new Map<string, AggregatedActivity>();

  for (const m of movements) {
    // Create a grouping key based on reference OR type+location+hour
    const hourKey = format(new Date(m.timestamp), 'yyyy-MM-dd-HH');
    const groupKey = m.reference
      ? `${m.type}-${m.reference}`
      : `${m.type}-${m.location}-${hourKey}`;

    const existing = activityMap.get(groupKey);
    if (existing) {
      existing.totalQuantity += m.quantity;
      if (!existing.skus.includes(m.productSku)) {
        existing.skus.push(m.productSku);
        existing.skuCount = existing.skus.length;
      }
      // Keep the most recent timestamp
      if (new Date(m.timestamp) > existing.timestamp) {
        existing.timestamp = new Date(m.timestamp);
      }
    } else {
      activityMap.set(groupKey, {
        id: groupKey,
        type: m.type,
        reference: m.reference,
        timestamp: new Date(m.timestamp),
        totalQuantity: m.quantity,
        skuCount: 1,
        skus: [m.productSku],
        location: m.location,
        toLocation: m.toLocation,
      });
    }
  }

  // Sort by timestamp (most recent first)
  return Array.from(activityMap.values()).sort(
    (a, b) => b.timestamp.getTime() - a.timestamp.getTime()
  );
}

/**
 * Format activity into human-readable description
 */
function formatActivityDescription(activity: AggregatedActivity): string {
  const { type, reference, totalQuantity, skuCount, location, toLocation } = activity;
  const skuText = skuCount === 1 ? '1 SKU' : `${skuCount} SKUs`;
  const qtyText = `${totalQuantity} unit${totalQuantity !== 1 ? 's' : ''}`;

  switch (type) {
    case 'receipt':
    case 'receive':
      return reference
        ? `Received ${reference}: ${qtyText} (${skuText})`
        : `Received ${qtyText} (${skuText}) at ${location}`;
    case 'transfer':
      return toLocation
        ? `Transferred ${qtyText} (${skuText}): ${location} → ${toLocation}`
        : `Transferred ${qtyText} (${skuText}) at ${location}`;
    case 'allocation':
    case 'allocate':
      return reference
        ? `Allocated for ${reference}: ${qtyText} (${skuText})`
        : `Allocated ${qtyText} (${skuText}) at ${location}`;
    case 'pick':
    case 'ship':
      return reference
        ? `Shipped ${reference}: ${qtyText} (${skuText})`
        : `Shipped ${qtyText} (${skuText}) from ${location}`;
    case 'adjust':
      return `Adjusted ${qtyText} (${skuText}) at ${location}`;
    case 'return':
      return reference
        ? `Returned from ${reference}: ${qtyText} (${skuText})`
        : `Returned ${qtyText} (${skuText}) at ${location}`;
    default:
      return `${type}: ${qtyText} (${skuText}) at ${location}`;
  }
}

function MovementsTimeline({
  groupedMovements,
}: {
  groupedMovements: Map<string, RecentMovement[]>;
}) {
  // Flatten all movements and aggregate into activities
  const allMovements = Array.from(groupedMovements.values()).flat();
  const activities = aggregateMovementsIntoActivities(allMovements);

  if (activities.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <ArrowRightLeft className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">No recent activity</p>
      </div>
    );
  }

  // Re-group activities by date for display
  const activitiesByDate = new Map<string, AggregatedActivity[]>();
  for (const activity of activities) {
    let dateLabel: string;
    if (isToday(activity.timestamp)) {
      dateLabel = 'Today';
    } else if (isYesterday(activity.timestamp)) {
      dateLabel = 'Yesterday';
    } else {
      dateLabel = format(activity.timestamp, 'MMM d');
    }
    const existing = activitiesByDate.get(dateLabel) ?? [];
    existing.push(activity);
    activitiesByDate.set(dateLabel, existing);
  }

  return (
    <div className="space-y-1 max-h-[320px] overflow-y-auto">
      {Array.from(activitiesByDate.entries()).map(([dateLabel, dateActivities]) => (
        <Fragment key={dateLabel}>
          {dateLabel !== 'Today' && (
            <p className="text-xs font-medium text-muted-foreground pt-3 pb-1 sticky top-0 bg-card z-10">
              {dateLabel}
            </p>
          )}
          {dateActivities.map((activity) => {
            const Icon = (activity.type in movementIcons
              ? movementIcons[activity.type as keyof typeof movementIcons]
              : ArrowRightLeft);
            const isOutbound = ['allocation', 'allocate', 'pick', 'ship'].includes(activity.type);

            return (
              <div
                key={activity.id}
                className="flex items-start gap-3 py-2.5 border-b border-border/50 last:border-0"
              >
                <div
                  className={cn(
                    'mt-0.5 p-1.5 rounded-full shrink-0',
                    isOutbound
                      ? 'bg-amber-100 dark:bg-amber-900/30'
                      : 'bg-green-100 dark:bg-green-900/30'
                  )}
                >
                  <Icon
                    className={cn(
                      'h-3.5 w-3.5',
                      isOutbound
                        ? 'text-amber-600 dark:text-amber-400'
                        : 'text-green-600 dark:text-green-400'
                    )}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium leading-tight">
                    {formatActivityDescription(activity)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {format(activity.timestamp, 'h:mm a')}
                    {activity.skuCount <= 3 && activity.skus.length > 0 && (
                      <span className="ml-2 text-muted-foreground/70">
                        {activity.skus.join(', ')}
                      </span>
                    )}
                  </p>
                </div>
                <Badge
                  variant="secondary"
                  className={cn(
                    'shrink-0 tabular-nums text-xs',
                    isOutbound
                      ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                      : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                  )}
                >
                  {isOutbound ? '-' : '+'}
                  {activity.totalQuantity}
                </Badge>
              </div>
            );
          })}
        </Fragment>
      ))}
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

function MovementsSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 py-1.5">
          <Skeleton className="h-3 w-10" />
          <Skeleton className="h-3.5 w-3.5" />
          <Skeleton className="h-3 w-12" />
          <Skeleton className="h-3 w-6" />
          <Skeleton className="h-3 flex-1" />
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

function groupMovementsByDate(movements: RecentMovement[]): Map<string, RecentMovement[]> {
  const grouped = new Map<string, RecentMovement[]>();

  for (const m of movements) {
    let dateLabel: string;
    const date = new Date(m.timestamp);

    if (isToday(date)) {
      dateLabel = 'Today';
    } else if (isYesterday(date)) {
      dateLabel = 'Yesterday';
    } else {
      dateLabel = format(date, 'MMM d');
    }

    const existing = grouped.get(dateLabel) ?? [];
    existing.push(m);
    grouped.set(dateLabel, existing);
  }

  return grouped;
}

export default UnifiedInventoryDashboard;
