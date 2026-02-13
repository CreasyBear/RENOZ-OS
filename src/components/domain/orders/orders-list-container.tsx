/* eslint-disable react-refresh/only-export-components -- Container exports component + constants */
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
import { Button } from "@/components/ui/button";
import { toastSuccess, toastError, useConfirmation } from "@/hooks";
import { logger } from "@/lib/logger";
import { confirmations } from "@/hooks/_shared/use-confirmation";
import {
  useBulkUpdateOrderStatus,
  useDeleteOrder,
  useDuplicateOrder,
  useOrders,
} from "@/hooks/orders";
import { useTableSelection, BulkActionsBar } from "@/components/shared/data-table";
import type { OrderListQuery, OrderStatus, OrderTableItem } from "@/lib/schemas/orders";
import { ORDER_FILTER_CONFIG, DEFAULT_ORDER_FILTERS } from "./order-filter-config";
import type { OrderFiltersState } from "./order-filter-config";
import { DomainFilterBar } from "@/components/shared/filters";
import { OrdersListPresenter } from "./orders-list-presenter";
import {
  OrderBulkOperationsDialog,
  OPERATION_CONFIGS,
  type BulkOperationConfig,
  type OrderBulkOperation,
} from "./order-bulk-operations-dialog";

const DISPLAY_PAGE_SIZE = 20;

export interface OrdersListContainerProps {
  filters: OrderFiltersState;
  onFiltersChange: (filters: OrderFiltersState) => void;
  // Callbacks for actions - parent route owns the UI
  onCreateOrder?: () => void;
  onRefresh?: () => void;
  onExport?: () => void;
  isExporting?: boolean;
  /** When creating RMA from issue - preserve in navigation to order detail */
  fromIssueId?: string;
}

type OrderQueryFilters = Pick<
  OrderListQuery,
  "search" | "status" | "paymentStatus" | "dateFrom" | "dateTo" | "minTotal" | "maxTotal" | "customerId"
>;

type SortField = "orderNumber" | "orderDate" | "status" | "total" | "createdAt";

// Type guard for sort field validation
function isValidSortField(field: string): field is SortField {
  return ["orderNumber", "orderDate", "status", "total", "createdAt"].includes(field);
}
type SortDirection = "asc" | "desc";

export function buildOrderQuery(filters: OrderFiltersState): OrderQueryFilters {
  return {
    search: filters.search || undefined,
    status: filters.status ?? undefined,
    paymentStatus: filters.paymentStatus ?? undefined,
    dateFrom: filters.dateRange?.from ?? undefined,
    dateTo: filters.dateRange?.to ?? undefined,
    minTotal: filters.totalRange?.min ?? undefined,
    maxTotal: filters.totalRange?.max ?? undefined,
    customerId: filters.customerId ?? undefined,
  };
}

export function OrdersListContainer({
  filters,
  onFiltersChange,
  onCreateOrder,
  fromIssueId,
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
    refetch: refetchOrders,
  } = useOrders(queryFilters);

  // Server function returns OrderTableItem[] (which extends OrderListItem)
  const orders = useMemo<OrderTableItem[]>(
    () => ordersData?.orders ?? [],
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
  const bulkUpdateStatusMutation = useBulkUpdateOrderStatus();

  // Handle sort toggle
  const handleSort = useCallback((field: string) => {
    if (!isValidSortField(field)) {
      logger.warn('Invalid sort field', { field });
      return;
    }
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
      return field;
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
        search: fromIssueId ? { fromIssueId } : undefined,
      });
    },
    [navigate, fromIssueId]
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
      const config = OPERATION_CONFIGS[operationType];
      if (config) {
        setBulkOperation(config);
        setBulkDialogOpen(true);
      }
    },
    []
  );

  const handleBulkConfirm = useCallback(
    async (statusOverride?: OrderStatus) => {
      if (!bulkOperation) return;

      const orderIds = selectedItems.map((order) => order.id);
      if (orderIds.length === 0) {
        toastError("No orders selected");
        return;
      }

      const statusMap: Record<BulkOperationConfig["type"], OrderStatus | null> = {
        allocate: "picking",
        ship: "shipped",
        status_update: statusOverride ?? null,
      };

      const status = statusMap[bulkOperation.type];
      if (!status) {
        toastError("Select a status to continue");
        return;
      }

      try {
        const result = await bulkUpdateStatusMutation.mutateAsync({
          orderIds,
          status,
        });

        if (result.updated > 0) {
          toastSuccess(`Updated ${result.updated} order${result.updated === 1 ? "" : "s"}`);
        }

        if (result.failed.length > 0) {
          toastError(`${result.failed.length} order${result.failed.length === 1 ? "" : "s"} failed`);
        }

        clearSelection();
        setBulkDialogOpen(false);
        setBulkOperation(null);
      } catch {
        toastError("Failed to update order statuses");
        throw new Error("Bulk status update failed");
      }
    },
    [bulkOperation, selectedItems, clearSelection, bulkUpdateStatusMutation]
  );

  // Convert selected items to bulk operation format
  const bulkOperationOrders: OrderBulkOperation[] = useMemo(
    () =>
      selectedItems.map((order) => ({
        id: order.id,
        orderNumber: order.orderNumber,
        customerId: order.customer?.id ?? null,
        customerName: order.customer?.name ?? "Unknown",
        total: order.total ?? 0,
        currentStatus: order.status,
      })),
    [selectedItems]
  );

  // Shared filter change handler
  const handleFiltersChange = useCallback(
    (nextFilters: OrderFiltersState) => {
      setPage(1);
      clearSelection();
      onFiltersChange(nextFilters);
    },
    [onFiltersChange, clearSelection]
  );

  // Clear all filters handler
  const handleClearFilters = useCallback(() => {
    setPage(1);
    clearSelection();
    onFiltersChange(DEFAULT_ORDER_FILTERS);
  }, [onFiltersChange, clearSelection]);

  // Extract icons from config for bulk action buttons
  const AllocateIcon = OPERATION_CONFIGS.allocate.icon;
  const ShipIcon = OPERATION_CONFIGS.ship.icon;
  const StatusIcon = OPERATION_CONFIGS.status_update.icon;

  return (
    <div className="space-y-3">
        <DomainFilterBar<OrderFiltersState>
          config={ORDER_FILTER_CONFIG}
          filters={filters}
          onFiltersChange={handleFiltersChange}
          defaultFilters={DEFAULT_ORDER_FILTERS}
          resultCount={total}
        />

        {/* Bulk Actions Bar */}
        <BulkActionsBar selectedCount={selectedItems.length} onClear={clearSelection}>
          <Button size="sm" variant="outline" onClick={() => openBulkDialog("allocate")}>
            <AllocateIcon className="h-4 w-4 mr-1" />
            Allocate
          </Button>
          <Button size="sm" variant="outline" onClick={() => openBulkDialog("ship")}>
            <ShipIcon className="h-4 w-4 mr-1" />
            Ship
          </Button>
          <Button size="sm" variant="outline" onClick={() => openBulkDialog("status_update")}>
            <StatusIcon className="h-4 w-4 mr-1" />
            Update Status
          </Button>
        </BulkActionsBar>

        <OrdersListPresenter
          orders={orders}
          isLoading={isOrdersLoading}
          error={ordersError instanceof Error ? ordersError : null}
          onRetry={() => {
            // Refetch orders on retry
            void refetchOrders();
          }}
          filters={filters}
          onFiltersChange={handleFiltersChange}
          onClearFilters={handleClearFilters}
          onCreateOrder={onCreateOrder}
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
          fromIssueId={fromIssueId}
        />

        {/* Bulk Operations Dialog */}
        <OrderBulkOperationsDialog
          open={bulkDialogOpen}
          onOpenChange={setBulkDialogOpen}
          operation={bulkOperation}
          orders={bulkOperationOrders}
          onConfirm={handleBulkConfirm}
          isLoading={bulkUpdateStatusMutation.isPending}
        />
      </div>
  );
}

export default OrdersListContainer;
