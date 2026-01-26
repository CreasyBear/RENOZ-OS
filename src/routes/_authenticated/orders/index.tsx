/**
 * Orders Index Route
 *
 * Main order list page with filtering, bulk actions, and export.
 *
 * @see _Initiation/_prd/2-domains/orders/orders.prd.json (ORD-LIST-UI)
 */
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Download, RefreshCw } from "lucide-react";
import { PageLayout, RouteErrorFallback } from "@/components/layout";
import { OrdersTableSkeleton } from "@/components/skeletons/orders";
import { Button } from "@/components/ui/button";
import { toastSuccess, toastError } from "@/hooks";
import {
  OrderList,
  OrderFiltersComponent,
  type OrderFiltersState,
} from "@/components/domain/orders";
import { useDeleteOrder } from "@/hooks/orders";
import { duplicateOrder } from "@/server/functions/orders/orders";
import { queryKeys } from "@/lib/query-keys";

// ============================================================================
// ROUTE DEFINITION
// ============================================================================

export const Route = createFileRoute("/_authenticated/orders/")({
  component: OrdersPage,
  errorComponent: ({ error }) => (
    <RouteErrorFallback error={error} parentRoute="/" />
  ),
  pendingComponent: () => (
    <PageLayout>
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
  const [filters, setFilters] = useState<OrderFiltersState>(DEFAULT_FILTERS);

  // Duplicate order mutation (no hook exists yet, using centralized keys)
  const duplicateMutation = useMutation({
    mutationFn: async (orderId: string) => {
      return duplicateOrder({ data: { id: orderId } });
    },
    onSuccess: (result) => {
      toastSuccess(`Order duplicated as ${result.orderNumber}`);
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.lists() });
      navigate({
        to: "/orders/$orderId",
        params: { orderId: result.id },
      });
    },
    onError: () => {
      toastError("Failed to duplicate order");
    },
  });

  // Delete order using centralized hook
  const deleteMutation = useDeleteOrder();

  // Handlers
  const handleViewOrder = useCallback(
    (orderId: string) => {
      navigate({
        to: "/orders/$orderId",
        params: { orderId },
      });
    },
    [navigate]
  );

  const handleDuplicateOrder = useCallback(
    (orderId: string) => {
      duplicateMutation.mutate(orderId);
    },
    [duplicateMutation]
  );

  const handleDeleteOrder = useCallback(
    async (orderId: string) => {
      if (!confirm("Are you sure you want to delete this order?")) return;
      try {
        await deleteMutation.mutateAsync(orderId);
        toastSuccess("Order deleted");
      } catch {
        toastError("Failed to delete order");
      }
    },
    [deleteMutation]
  );

  const handleCreateOrder = useCallback(() => {
    navigate({ to: "/orders/create" });
  }, [navigate]);

  const handleExport = useCallback(() => {
    // TODO: Implement CSV export
    toastSuccess("Export functionality coming soon");
  }, []);

  const handleRefresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: queryKeys.orders.lists() });
    toastSuccess("Orders refreshed");
  }, [queryClient]);

  return (
    <PageLayout>
      <PageLayout.Header
        title="Orders"
        description="Manage customer orders and fulfillment"
        actions={
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button onClick={handleCreateOrder}>
            <Plus className="h-4 w-4 mr-2" />
            New Order
          </Button>
        </div>
        }
      />

      <PageLayout.Content>
        <div className="space-y-6">
          {/* Filters */}
          <OrderFiltersComponent
            filters={filters}
            onFiltersChange={setFilters}
          />

          {/* Order List */}
          <OrderList
            filters={{
              search: filters.search || undefined,
              status: filters.status ?? undefined,
              paymentStatus: (filters.paymentStatus as "pending" | "partial" | "paid" | "refunded" | "overdue" | undefined) ?? undefined,
              dateFrom: filters.dateFrom ?? undefined,
              dateTo: filters.dateTo ?? undefined,
              minTotal: filters.minTotal ?? undefined,
              maxTotal: filters.maxTotal ?? undefined,
            }}
            onViewOrder={handleViewOrder}
            onDuplicateOrder={handleDuplicateOrder}
            onDeleteOrder={handleDeleteOrder}
          />
        </div>
      </PageLayout.Content>
    </PageLayout>
  );
}

export default OrdersPage;
