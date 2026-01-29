/**
 * Orders Index Route
 *
 * Main order list page with filtering, bulk actions, and export.
 *
 * LAYOUT: full-width (data-dense table view)
 * ACTIONS: Refresh → Export → New Order (left to right, secondary to primary)
 *
 * @see UI_UX_STANDARDIZATION_PRD.md
 * @see _Initiation/_prd/2-domains/orders/orders.prd.json (ORD-LIST-UI)
 */
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useCallback, useMemo } from "react";
import { Plus, Download, RefreshCw, Loader2, ShoppingCart, DollarSign, Package, Clock } from "lucide-react";
import { PageLayout, RouteErrorFallback } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { toastSuccess } from "@/hooks";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { OrdersTableSkeleton } from "@/components/skeletons/orders";
import {
  OrdersListContainer,
  type OrderFiltersState,
} from "@/components/domain/orders";
import { MetricCard } from "@/components/shared/metric-card";
import { useDashboardMetrics } from "@/hooks/dashboard";
import { formatCurrency } from "@/lib/formatters";

// ============================================================================
// ROUTE DEFINITION
// ============================================================================

export const Route = createFileRoute("/_authenticated/orders/")({
  component: OrdersPage,
  errorComponent: ({ error }) => (
    <RouteErrorFallback error={error} parentRoute="/" />
  ),
  pendingComponent: () => (
    <PageLayout variant="full-width">
      <PageLayout.Header
        title="Orders"
        description="Manage customer orders and fulfillment"
      />
      <PageLayout.Content>
        <OrdersTableSkeleton />
      </PageLayout.Content>
    </PageLayout>
  ),
});

// ============================================================================
// DEFAULT FILTERS
// ============================================================================

const DEFAULT_FILTERS: OrderFiltersState = {
  search: "",
  status: null,
  paymentStatus: null,
  dateFrom: null,
  dateTo: null,
  minTotal: null,
  maxTotal: null,
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

function OrdersPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [isExporting, setIsExporting] = useState(false);

  // Fetch dashboard metrics for order stats
  const { data: metrics, isLoading: isMetricsLoading } = useDashboardMetrics({
    dateFrom: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    dateTo: new Date().toISOString().split('T')[0],
  });

  const summary = metrics?.summary;

  const orderStats = useMemo(() => [
    {
      title: 'Total Orders',
      value: summary?.ordersCount?.current ?? 0,
      subtitle: 'Last 30 days',
      icon: ShoppingCart,
    },
    {
      title: 'Revenue',
      value: formatCurrency(summary?.revenue?.current ?? 0),
      subtitle: 'Last 30 days',
      trend: summary?.revenue?.change ? `${summary.revenue.change > 0 ? '+' : ''}${summary.revenue.change}%` : undefined,
      trendUp: summary?.revenue?.change ? summary.revenue.change > 0 : undefined,
      icon: DollarSign,
    },
    {
      title: 'Pending',
      value: summary?.activeJobs?.current ?? 0,
      subtitle: 'Active jobs',
      icon: Package,
    },
    {
      title: 'Avg Order',
      value: summary?.ordersCount?.current && summary?.revenue?.current
        ? formatCurrency(summary.revenue.current / summary.ordersCount.current)
        : formatCurrency(0),
      subtitle: 'Per order',
      icon: Clock,
    },
  ], [summary]);

  const handleCreateOrder = useCallback(() => {
    navigate({ to: "/orders/create" });
  }, [navigate]);

  const handleRefresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: queryKeys.orders.lists() });
    toastSuccess("Orders refreshed");
  }, [queryClient]);

  const handleExport = useCallback(() => {
    // Export is handled by the container for data access
    // This triggers the container's internal export
    setIsExporting(true);
    // Reset after a delay (container handles the actual export)
    setTimeout(() => setIsExporting(false), 2000);
  }, []);

  return (
    <PageLayout variant="full-width">
      <PageLayout.Header
        title="Orders"
        description="Manage customer orders and fulfillment"
        actions={
          <div className="flex items-center gap-2">
            {/* Secondary: Refresh */}
            <Button variant="outline" size="sm" onClick={handleRefresh}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            
            {/* Secondary: Export */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              disabled={isExporting}
            >
              {isExporting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              Export
            </Button>
            
            {/* Primary: Create */}
            <Button onClick={handleCreateOrder}>
              <Plus className="h-4 w-4 mr-2" />
              New Order
            </Button>
          </div>
        }
      />
      <PageLayout.Content className="space-y-6">
        {/* Summary Stats */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {orderStats.map((stat) => (
            <MetricCard
              key={stat.title}
              title={stat.title}
              value={stat.value}
              subtitle={stat.subtitle}
              icon={stat.icon}
              trend={stat.trend}
              trendUp={stat.trendUp}
              isLoading={isMetricsLoading}
            />
          ))}
        </div>

        <OrdersListContainer 
          filters={filters} 
          onFiltersChange={setFilters}
          onCreateOrder={handleCreateOrder}
          onRefresh={handleRefresh}
          onExport={handleExport}
          isExporting={isExporting}
        />
      </PageLayout.Content>
    </PageLayout>
  );
}

export default OrdersPage;
