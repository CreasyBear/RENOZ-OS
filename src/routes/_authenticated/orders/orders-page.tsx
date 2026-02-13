/**
 * Orders Page Component
 *
 * Main order list page with filtering, bulk actions, and export.
 * Filter chips + More dropdown per DOMAIN-LANDING-STANDARDS.
 *
 * @source metrics from useDashboardMetrics hook
 * @source filters from useTransformedFilterUrlState hook
 *
 * @see src/routes/_authenticated/orders/index.tsx - Route definition
 */
import { useNavigate } from "@tanstack/react-router";
import { useState, useCallback, useMemo } from "react";
import { Link } from "@tanstack/react-router";
import {
  Plus,
  Download,
  RefreshCw,
  Loader2,
  ShoppingCart,
  DollarSign,
  Package,
  Clock,
  Truck,
  ChevronDown,
  Shield,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PageLayout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toastSuccess, toastError } from "@/hooks";
import { logger } from "@/lib/logger";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { generateCSV, downloadCSV, formatDateForFilename } from "@/lib/utils/csv";
import { useServerFn } from "@tanstack/react-start";
import type { OrderListQuery } from "@/lib/schemas/orders";
import { listOrders } from "@/server/functions/orders/orders";
// Note: Skeleton is used in the route file's Suspense fallback
import {
  OrdersListContainer,
  DEFAULT_ORDER_FILTERS,
  buildOrderQuery,
  type OrderFiltersState,
} from "@/components/domain/orders";
import { MetricCard } from "@/components/shared/metric-card";
import { useDashboardMetrics } from "@/hooks/dashboard";
import { useIssue } from "@/hooks/support";
import { useOrgFormat } from "@/hooks/use-org-format";
import {
  useTransformedFilterUrlState,
  parseDateFromUrl,
  serializeDateForUrl,
} from "@/hooks/filters/use-filter-url-state";
import type { orderSearchSchema } from "./index";
import type { z } from "zod";

type OrderSearch = z.infer<typeof orderSearchSchema>;

/** Transform URL search params to OrderFiltersState */
const fromUrlParams = (search: OrderSearch): OrderFiltersState => ({
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
  customerId: search.customerId ?? null,
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
  customerId: filters.customerId ?? undefined,
});

interface OrdersPageProps {
  search: OrderSearch;
}

export default function OrdersPage({ search }: OrdersPageProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isExporting, setIsExporting] = useState(false);

  // URL-synced filter state with transformations
  const { filters, setFilters } = useTransformedFilterUrlState({
    currentSearch: search,
    navigate,
    defaults: DEFAULT_ORDER_FILTERS,
    fromUrlParams,
    toUrlParams,
    resetPageOnChange: ["search", "status", "paymentStatus", "dateRange", "totalRange", "customerId"],
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

  // Fetch issue when creating RMA from issue (fromIssueId in URL)
  const { data: fromIssue } = useIssue({
    issueId: search.fromIssueId ?? '',
    enabled: !!search.fromIssueId,
  });

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

  // Server function for fetching orders for export
  const listOrdersFn = useServerFn(listOrders);

  const handleExport = useCallback(async () => {
    setIsExporting(true);
    try {
      // Fetch orders with current filters (large page size for export)
      const filtersForExport: OrderListQuery = {
        ...buildOrderQuery(filters),
        page: 1,
        pageSize: 1000,
        sortOrder: 'desc',
      };

      const result = await listOrdersFn({ data: filtersForExport });

      if (!result.orders || result.orders.length === 0) {
        toastError('No orders to export');
        setIsExporting(false);
        return;
      }

      const csv = generateCSV({
        headers: [
          'Order Number',
          'Customer',
          'Status',
          'Payment Status',
          'Order Date',
          'Due Date',
          'Total',
          'Item Count',
          'Created At',
        ],
        rows: result.orders.map((order) => [
          order.orderNumber || '',
          order.customer?.name || '',
          order.status || '',
          order.paymentStatus || '',
          order.orderDate ? new Date(order.orderDate).toLocaleDateString() : '',
          order.dueDate ? new Date(order.dueDate).toLocaleDateString() : '',
          order.total?.toFixed(2) || '0.00',
          order.itemCount?.toString() || '0',
          order.createdAt ? new Date(order.createdAt).toLocaleDateString() : '',
        ]),
      });

      const filename = `orders-${formatDateForFilename()}.csv`;
      downloadCSV(csv, filename);
      const limitNotice = result.orders.length >= 1000 ? '. Export limited to 1000 orders. Use filters to narrow.' : '';
      toastSuccess(`Exported ${result.orders.length} orders to ${filename}${limitNotice}`);
    } catch (error) {
      logger.error('Export error', error);
      toastError(error instanceof Error ? error.message : 'Failed to export orders');
    } finally {
      setIsExporting(false);
    }
  }, [filters, listOrdersFn]);

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

            {/* Secondary: More (Fulfillment, Returns) - avoid orphaned workflows */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  More <ChevronDown className="h-4 w-4 ml-2" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem className="p-0">
                  <Link to="/orders/fulfillment" className="flex w-full items-center px-2 py-1.5">
                    <Truck className="h-4 w-4 mr-2" />
                    Fulfillment
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem className="p-0">
                  <Link to="/financial/credit-notes" className="flex w-full items-center px-2 py-1.5">
                    <Shield className="h-4 w-4 mr-2" />
                    Returns & Credits
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Primary: Create */}
            <Button onClick={handleCreateOrder}>
              <Plus className="h-4 w-4 mr-2" />
              New Order
            </Button>
          </div>
        }
      />
      <PageLayout.Content className="space-y-6">
        {/* fromIssueId banner: Creating RMA from issue */}
        {search.fromIssueId && (
          <Alert>
            <Package className="h-4 w-4" />
            <AlertDescription>
              {fromIssue?.issueNumber
                ? `Creating RMA from issue ${fromIssue.issueNumber} — select an order below.`
                : 'Creating RMA from issue — select an order below.'}
            </AlertDescription>
          </Alert>
        )}

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
          fromIssueId={search.fromIssueId}
        />
      </PageLayout.Content>
    </PageLayout>
  );
}
