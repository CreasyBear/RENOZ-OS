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
import { z } from "zod";
import { PageLayout, RouteErrorFallback } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { toastSuccess } from "@/hooks";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { OrdersTableSkeleton } from "@/components/skeletons/orders";
import {
  OrdersListContainer,
  DEFAULT_ORDER_FILTERS,
  type OrderFiltersState,
} from "@/components/domain/orders";
import { MetricCard } from "@/components/shared/metric-card";
import { useDashboardMetrics } from "@/hooks/dashboard";
import { useOrgFormat } from "@/hooks/use-org-format";
import {
  useTransformedFilterUrlState,
  parseDateFromUrl,
  serializeDateForUrl,
} from "@/hooks/filters/use-filter-url-state";

// ============================================================================
// URL SEARCH SCHEMA
// ============================================================================

const orderSearchSchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  search: z.string().optional().default(""),
  status: z.string().optional(),
  paymentStatus: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  minTotal: z.coerce.number().optional(),
  maxTotal: z.coerce.number().optional(),
});

// ============================================================================
// ROUTE DEFINITION
// ============================================================================

export const Route = createFileRoute("/_authenticated/orders/")({
  component: OrdersPage,
  validateSearch: orderSearchSchema,
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
// URL FILTER TRANSFORMERS
// ============================================================================

/** Transform URL search params to OrderFiltersState */
const fromUrlParams = (search: z.infer<typeof orderSearchSchema>): OrderFiltersState => ({
  search: search.search ?? "",
  status: (search.status as OrderFiltersState["status"]) ?? null,
  paymentStatus: (search.paymentStatus as OrderFiltersState["paymentStatus"]) ?? null,
  dateRange: search.dateFrom || search.dateTo
    ? {
        from: parseDateFromUrl(search.dateFrom),
        to: parseDateFromUrl(search.dateTo),
      }
    : null,
  totalRange: search.minTotal !== undefined || search.maxTotal !== undefined
    ? {
        min: search.minTotal ?? null,
        max: search.maxTotal ?? null,
      }
    : null,
});

/** Transform OrderFiltersState to URL search params */
const toUrlParams = (filters: OrderFiltersState): Record<string, unknown> => ({
  search: filters.search || undefined,
  status: filters.status ?? undefined,
  paymentStatus: filters.paymentStatus ?? undefined,
  dateFrom: filters.dateRange?.from ? serializeDateForUrl(filters.dateRange.from) : undefined,
  dateTo: filters.dateRange?.to ? serializeDateForUrl(filters.dateRange.to) : undefined,
  minTotal: filters.totalRange?.min ?? undefined,
  maxTotal: filters.totalRange?.max ?? undefined,
});

// ============================================================================
// MAIN COMPONENT
// ============================================================================

function OrdersPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const search = Route.useSearch();
  const [isExporting, setIsExporting] = useState(false);

  // URL-synced filter state with transformations
  const { filters, setFilters } = useTransformedFilterUrlState({
    currentSearch: search,
    navigate,
    defaults: DEFAULT_ORDER_FILTERS,
    fromUrlParams,
    toUrlParams,
    resetPageOnChange: ["search", "status", "paymentStatus", "dateRange", "totalRange"],
  });
  const [dateRange] = useState(() => {
    const dateTo = new Date();
    const dateFrom = new Date(dateTo);
    dateFrom.setDate(dateTo.getDate() - 30);
    return {
      dateFrom: dateFrom.toISOString().split('T')[0],
      dateTo: dateTo.toISOString().split('T')[0],
    };
  });
  const { formatCurrency } = useOrgFormat();

  // Fetch dashboard metrics for order stats
  const { data: metrics, isLoading: isMetricsLoading } = useDashboardMetrics({
    dateFrom: dateRange.dateFrom,
    dateTo: dateRange.dateTo,
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
      value: formatCurrency(summary?.revenue?.current ?? 0, { cents: false, showCents: true }),
      subtitle: 'Last 30 days',
      delta: summary?.revenue?.change,
      icon: DollarSign,
    },
    {
      title: 'Pending',
      value: summary?.activeInstallations?.current ?? 0,
      subtitle: 'Active jobs',
      icon: Package,
    },
    {
      title: 'Avg Order',
      value: summary?.ordersCount?.current && summary?.revenue?.current
        ? formatCurrency(summary.revenue.current / summary.ordersCount.current, {
            cents: false,
            showCents: true,
          })
        : formatCurrency(0, { cents: false, showCents: true }),
      subtitle: 'Per order',
      icon: Clock,
    },
  ], [summary, formatCurrency]);

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
              delta={stat.delta}
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
