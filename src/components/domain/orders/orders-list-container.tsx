'use client';

/**
 * Orders List Container
 *
 * Handles data fetching, selection state, bulk actions, and mutations
 * for the orders list.
 *
 * NOTE: This is a domain container component. It does NOT include layout
 * components (PageLayout, Header, etc.). The parent route is responsible
 * for layout. See UI_UX_STANDARDIZATION_PRD.md for patterns.
 *
 * @source orders from useOrders hook
 * @source selection from useTableSelection hook
 * @source duplicateOrder from useDuplicateOrder hook
 * @source deleteOrder from useDeleteOrder hook
 */

import { useCallback, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Package, Truck, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toastSuccess, toastError, useConfirmation } from "@/hooks";
import { confirmations } from "@/hooks/_shared/use-confirmation";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { useDeleteOrder, useDuplicateOrder, useOrders } from "@/hooks/orders";
import { useTableSelection, BulkActionsBar } from "@/components/shared/data-table";
import type { OrderListQuery } from "@/lib/schemas/orders";
import { ORDER_FILTER_CONFIG, DEFAULT_ORDER_FILTERS } from "./order-filter-config";
import type { OrderFiltersState } from "./order-filter-config";
import { DomainFilterBar } from "@/components/shared/filters";
import { OrdersListPresenter } from "./orders-list-presenter";
import {
  OrderBulkOperationsDialog,
  type BulkOperationConfig,
  type OrderBulkOperation,
} from "./order-bulk-operations-dialog";
import type { OrderTableItem } from "./order-columns";

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

type SortField = "orderNumber" | "orderDate" | "status" | "total" | "createdAt";
type SortDirection = "asc" | "desc";

function buildOrderQuery(filters: OrderFiltersState): OrderQueryFilters {
  return {
    search: filters.search || undefined,
    status: filters.status ?? undefined,
    paymentStatus: filters.paymentStatus ?? undefined,
    dateFrom: filters.dateRange?.from ?? undefined,
    dateTo: filters.dateRange?.to ?? undefined,
    minTotal: filters.totalRange?.min ?? undefined,
    maxTotal: filters.totalRange?.max ?? undefined,
  };
}

export function OrdersListContainer({
  filters,
  onFiltersChange,
}: OrdersListContainerProps) {
  const navigate = useNavigate();
  const confirmation = useConfirmation();
  const [page, setPage] = useState(1);
  const [sortField, setSortField] = useState<SortField>("createdAt");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  // Bulk operations dialog state
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [bulkOperation, setBulkOperation] = useState<BulkOperationConfig | null>(null);

  const queryFilters = useMemo<OrderListQuery>(
    () => ({
      ...buildOrderQuery(filters),
      page,
      pageSize: DISPLAY_PAGE_SIZE,
      sortBy: sortField,
      sortOrder: sortDirection,
    }),
    [filters, page, sortField, sortDirection]
  );

  const {
    data: ordersData,
    isLoading: isOrdersLoading,
    error: ordersError,
  } = useOrders(queryFilters);

  // Cast orders to OrderTableItem type
  const orders = useMemo<OrderTableItem[]>(
    () => (ordersData?.orders ?? []) as OrderTableItem[],
    [ordersData]
  );
  const total = ordersData?.total ?? 0;

  // Selection state using shared hook
  const {
    selectedIds,
    selectedItems,
    isAllSelected,
    isPartiallySelected,
    lastClickedIndex,
    setLastClickedIndex,
    handleSelect,
    handleSelectAll,
    handleShiftClickRange,
    clearSelection,
    isSelected,
  } = useTableSelection({ items: orders });

  const duplicateMutation = useDuplicateOrder();
  const deleteMutation = useDeleteOrder();

  // Handle sort toggle
  const handleSort = useCallback((field: string) => {
    setSortField((currentField) => {
      if (currentField === field) {
        // Toggle direction
        setSortDirection((dir) => (dir === "asc" ? "desc" : "asc"));
        return currentField;
      }
      // New field, default to ascending for text, descending for dates/numbers
      setSortDirection(
        ["orderDate", "total", "createdAt"].includes(field) ? "desc" : "asc"
      );
      return field as SortField;
    });
    setPage(1); // Reset to first page on sort change
  }, []);

  // Shift-click range handler that updates lastClickedIndex
  const handleShiftClickRangeWithIndex = useCallback(
    (rowIndex: number) => {
      if (lastClickedIndex !== null) {
        handleShiftClickRange(lastClickedIndex, rowIndex);
      }
      setLastClickedIndex(rowIndex);
    },
    [lastClickedIndex, handleShiftClickRange, setLastClickedIndex]
  );

  // Single select handler that updates lastClickedIndex
  const handleSelectWithIndex = useCallback(
    (id: string, checked: boolean) => {
      handleSelect(id, checked);
      const idx = orders.findIndex((o) => o.id === id);
      if (idx !== -1) {
        setLastClickedIndex(idx);
      }
    },
    [handleSelect, orders, setLastClickedIndex]
  );

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
      const order = orders.find((o) => o.id === orderId);
      const { confirmed } = await confirmation.confirm({
        ...confirmations.delete(order?.orderNumber ?? "this order", "order"),
      });
      if (!confirmed) return;

      try {
        await deleteMutation.mutateAsync(orderId);
        toastSuccess("Order deleted");
      } catch {
        toastError("Failed to delete order");
      }
    },
    [deleteMutation, orders, confirmation]
  );

  // Bulk operation handlers
  const openBulkDialog = useCallback(
    (operationType: "allocate" | "ship" | "status_update") => {
      const configs: Record<typeof operationType, BulkOperationConfig> = {
        allocate: {
          type: "allocate",
          title: "Bulk Allocate Orders",
          description: "Move selected orders to the picking stage for fulfillment.",
          confirmText: "Allocate Orders",
          icon: Package,
          variant: "default",
        },
        ship: {
          type: "ship",
          title: "Bulk Ship Orders",
          description: "Mark selected orders as shipped and update their status.",
          confirmText: "Ship Orders",
          icon: Truck,
          variant: "default",
        },
        status_update: {
          type: "status_update",
          title: "Bulk Status Update",
          description: "Update the status of selected orders.",
          confirmText: "Update Status",
          icon: CheckCircle,
          variant: "secondary",
        },
      };

      setBulkOperation(configs[operationType]);
      setBulkDialogOpen(true);
    },
    []
  );

  const handleBulkConfirm = useCallback(async () => {
    // TODO: Implement actual bulk operation logic
    toastSuccess(`Bulk ${bulkOperation?.type} completed for ${selectedItems.length} orders`);
    clearSelection();
    setBulkDialogOpen(false);
    setBulkOperation(null);
  }, [bulkOperation, selectedItems.length, clearSelection]);

  // Convert selected items to bulk operation format
  const bulkOperationOrders: OrderBulkOperation[] = useMemo(
    () =>
      selectedItems.map((order) => ({
        id: order.id,
        orderNumber: order.orderNumber,
        customerName: order.customer?.name ?? "Unknown",
        total: order.total ?? 0,
        currentStatus: order.status,
      })),
    [selectedItems]
  );

  return (
    <>
      <ConfirmationDialog />
      <div className="space-y-4">
        <DomainFilterBar<OrderFiltersState>
          config={ORDER_FILTER_CONFIG}
          filters={filters}
          onFiltersChange={(nextFilters) => {
            setPage(1);
            clearSelection();
            onFiltersChange(nextFilters);
          }}
          defaultFilters={DEFAULT_ORDER_FILTERS}
          resultCount={total}
        />

        {/* Bulk Actions Bar */}
        <BulkActionsBar selectedCount={selectedItems.length} onClear={clearSelection}>
          <Button size="sm" variant="outline" onClick={() => openBulkDialog("allocate")}>
            <Package className="h-4 w-4 mr-1" />
            Allocate
          </Button>
          <Button size="sm" variant="outline" onClick={() => openBulkDialog("ship")}>
            <Truck className="h-4 w-4 mr-1" />
            Ship
          </Button>
          <Button size="sm" variant="outline" onClick={() => openBulkDialog("status_update")}>
            <CheckCircle className="h-4 w-4 mr-1" />
            Update Status
          </Button>
        </BulkActionsBar>

        <OrdersListPresenter
          orders={orders}
          isLoading={isOrdersLoading}
          error={ordersError as Error | null}
          selectedIds={selectedIds}
          isAllSelected={isAllSelected}
          isPartiallySelected={isPartiallySelected}
          onSelect={handleSelectWithIndex}
          onSelectAll={handleSelectAll}
          onShiftClickRange={handleShiftClickRangeWithIndex}
          isSelected={isSelected}
          sortField={sortField}
          sortDirection={sortDirection}
          onSort={handleSort}
          onViewOrder={handleViewOrder}
          onDuplicateOrder={handleDuplicateOrder}
          onDeleteOrder={handleDeleteOrder}
          page={page}
          pageSize={DISPLAY_PAGE_SIZE}
          total={total}
          onPageChange={setPage}
        />

        {/* Bulk Operations Dialog */}
        <OrderBulkOperationsDialog
          open={bulkDialogOpen}
          onOpenChange={setBulkDialogOpen}
          operation={bulkOperation}
          orders={bulkOperationOrders}
          onConfirm={handleBulkConfirm}
        />
      </div>
    </>
  );
}

export default OrdersListContainer;
