'use client'

/**
 * Orders list container
 *
 * Handles data fetching, export, and mutations for the orders list.
 * 
 * NOTE: This is a domain container component. It does NOT include layout
 * components (PageLayout, Header, etc.). The parent route is responsible
 * for layout. See UI_UX_STANDARDIZATION_PRD.md for patterns.
 *
 * @source orders from useOrders hook
 * @source duplicateOrder from useDuplicateOrder hook
 * @source deleteOrder from useDeleteOrder hook
 */

import { useCallback, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toastSuccess, toastError } from "@/hooks";
import { useDeleteOrder, useDuplicateOrder, useOrders } from "@/hooks/orders";
import { queryKeys } from "@/lib/query-keys";
import { generateCSV, downloadCSV, formatDateForFilename } from "@/lib/utils/csv";
import { formatCurrency } from "@/lib/formatters";
import type { OrderListQuery } from "@/lib/schemas/orders";
import {
  OrderListContent,
  OrderFiltersComponent,
  type OrderFiltersState,
} from "@/components/domain/orders";

const EXPORT_PAGE_SIZE = 100;
const DISPLAY_PAGE_SIZE = 20;

export interface OrdersListContainerProps {
  filters: OrderFiltersState;
  onFiltersChange: (filters: OrderFiltersState) => void;
  // Callbacks for actions - parent route owns the UI
  onCreateOrder?: () => void;
  onRefresh?: () => void;
  onExport?: () => void;
  isExporting?: boolean;
}

type OrderQueryFilters = Pick<
  OrderListQuery,
  "search" | "status" | "paymentStatus" | "dateFrom" | "dateTo" | "minTotal" | "maxTotal"
>;

function buildOrderQuery(filters: OrderFiltersState): OrderQueryFilters {
  return {
    search: filters.search || undefined,
    status: filters.status ?? undefined,
    paymentStatus: filters.paymentStatus ?? undefined,
    dateFrom: filters.dateFrom ?? undefined,
    dateTo: filters.dateTo ?? undefined,
    minTotal: filters.minTotal ?? undefined,
    maxTotal: filters.maxTotal ?? undefined,
  };
}

export function OrdersListContainer({
  filters,
  onFiltersChange,
  onCreateOrder,
  onRefresh,
  onExport,
  isExporting = false,
}: OrdersListContainerProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [isExportingInternal, setIsExportingInternal] = useState(false);
  
  // Use external export state if provided, otherwise internal
  const _exportLoading = isExporting || isExportingInternal;

  const listOrdersFn = useServerFn(async ({ data }: { data: OrderListQuery }) => {
    const { listOrders } = await import("@/server/functions/orders/orders");
    return listOrders({ data });
  });

  const queryFilters = useMemo<OrderListQuery>(
    () => ({
      ...buildOrderQuery(filters),
      page,
      pageSize: DISPLAY_PAGE_SIZE,
      sortBy: "createdAt",
      sortOrder: "desc",
    }),
    [filters, page]
  );

  const {
    data: ordersData,
    isLoading: isOrdersLoading,
    error: ordersError,
  } = useOrders(queryFilters);

  const orders = useMemo(() => ordersData?.orders ?? [], [ordersData]);
  const total = ordersData?.total ?? 0;

  const duplicateMutation = useDuplicateOrder();
  const deleteMutation = useDeleteOrder();

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
      duplicateMutation.mutate(orderId, {
        onSuccess: (result) => {
          toastSuccess(`Order duplicated as ${result.orderNumber}`);
          navigate({
            to: "/orders/$orderId",
            params: { orderId: result.id },
          });
        },
        onError: () => {
          toastError("Failed to duplicate order");
        },
      });
    },
    [duplicateMutation, navigate]
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

  // Handlers now delegate to parent if callbacks provided
  const _handleCreateOrder = useCallback(() => {
    if (onCreateOrder) {
      onCreateOrder();
    } else {
      navigate({ to: "/orders/create" });
    }
  }, [navigate, onCreateOrder]);

  const _handleRefresh = useCallback(() => {
    if (onRefresh) {
      onRefresh();
    } else {
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.lists() });
      toastSuccess("Orders refreshed");
    }
  }, [queryClient, onRefresh]);

  const _handleExport = useCallback(async () => {
    // If external export handler provided, call it
    if (onExport) {
      onExport();
      return;
    }
    
    // Otherwise use internal export logic
    setIsExportingInternal(true);
    try {
      const exportFilters = buildOrderQuery(filters);
      let exportPage = 1;
      let totalCount = 0;
      const exportedOrders: typeof orders = [];

      do {
        const result = await listOrdersFn({
          data: {
            ...exportFilters,
            page: exportPage,
            pageSize: EXPORT_PAGE_SIZE,
            sortBy: "createdAt",
            sortOrder: "desc",
          },
        });
        totalCount = result.total;
        exportedOrders.push(...result.orders);
        exportPage += 1;
      } while (exportedOrders.length < totalCount);

      if (exportedOrders.length === 0) {
        toastError("No orders to export");
        return;
      }

      const csv = generateCSV({
        headers: [
          "Order Number",
          "Customer",
          "Status",
          "Payment Status",
          "Total",
          "Order Date",
          "Delivery Date",
        ],
        rows: exportedOrders.map((order) => [
          order.orderNumber,
          order.customer?.name || "Unknown",
          order.status,
          order.paymentStatus,
          formatCurrency(order.total || 0, { cents: false, showCents: true }),
          order.orderDate
            ? new Date(order.orderDate).toLocaleDateString()
            : "",
          order.dueDate
            ? new Date(order.dueDate).toLocaleDateString()
            : "",
        ]),
      });

      const filename = `orders-${formatDateForFilename()}.csv`;
      downloadCSV(csv, filename);
      toastSuccess(`Exported ${exportedOrders.length} orders to ${filename}`);
    } catch (error) {
      toastError("Failed to export orders");
      console.error("Export error:", error);
    } finally {
      setIsExportingInternal(false);
    }
  }, [filters, listOrdersFn, orders, onExport]);

  return (
    <div className="space-y-6">
      <OrderFiltersComponent
        filters={filters}
        onFiltersChange={(nextFilters) => {
          setPage(1);
          onFiltersChange(nextFilters);
        }}
        resultCount={total}
      />

      <OrderListContent
        orders={orders}
        isLoading={isOrdersLoading}
        error={ordersError as Error | null}
        page={page}
        pageSize={DISPLAY_PAGE_SIZE}
        total={total}
        onPageChange={setPage}
        onViewOrder={handleViewOrder}
        onDuplicateOrder={handleDuplicateOrder}
        onDeleteOrder={handleDeleteOrder}
      />
    </div>
  );
}

export default OrdersListContainer;
