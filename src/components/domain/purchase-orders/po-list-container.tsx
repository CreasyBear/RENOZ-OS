'use client';

/**
 * Purchase Orders List Container
 *
 * Handles data fetching, sorting, and action callbacks for the purchase orders list.
 *
 * NOTE: This is a domain container component. It does NOT include layout
 * components (PageLayout, Header, etc.). The parent route is responsible
 * for layout. See UI_UX_STANDARDIZATION_PRD.md for patterns.
 *
 * @source orders from usePurchaseOrders hook
 * @source deletePO from useDeletePurchaseOrder hook
 */

import { useCallback, useMemo, useState, useRef } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toastSuccess, toastError, useConfirmation } from "@/hooks";
import { confirmations } from "@/hooks/_shared/use-confirmation";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { usePurchaseOrders, useDeletePurchaseOrder } from "@/hooks/suppliers";
import { DomainFilterBar } from "@/components/shared/filters";
import type {
  PurchaseOrderFiltersState,
  PurchaseOrderTableData,
  ListPurchaseOrdersInput,
} from "@/lib/schemas/purchase-orders";
import {
  PO_FILTER_CONFIG,
  DEFAULT_PO_FILTERS,
  type POFiltersState,
} from "./po-filter-config";
import { POListPresenter } from "./po-list-presenter";

const DISPLAY_PAGE_SIZE = 20;

export interface POListContainerProps {
  /** Initial filter state */
  filters: PurchaseOrderFiltersState;
  /** Filter change handler */
  onFiltersChange: (filters: PurchaseOrderFiltersState) => void;
}

type SortField = "poNumber" | "orderDate" | "requiredDate" | "totalAmount" | "status" | "createdAt";
type SortDirection = "asc" | "desc";

function buildPOQuery(
  filters: PurchaseOrderFiltersState
): Partial<ListPurchaseOrdersInput> {
  return {
    search: filters.search || undefined,
    status: filters.status.length > 0 ? filters.status[0] : undefined,
    supplierId: filters.supplierId || undefined,
    startDate: filters.dateFrom?.toISOString(),
    endDate: filters.dateTo?.toISOString(),
  };
}

export function POListContainer({
  filters,
  onFiltersChange,
}: POListContainerProps) {
  const navigate = useNavigate();
  const confirmation = useConfirmation();
  const [page, setPage] = useState(1);
  const [sortField, setSortField] = useState<SortField>("createdAt");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  // Selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const lastSelectedIndexRef = useRef<number>(-1);

  const queryFilters = useMemo<ListPurchaseOrdersInput>(
    () => ({
      ...buildPOQuery(filters),
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
  } = usePurchaseOrders(queryFilters);

  // Transform data for the presenter
  const orders = useMemo<PurchaseOrderTableData[]>(
    () =>
      (ordersData?.items ?? []).map((po) => ({
        id: po.id,
        poNumber: po.poNumber,
        supplierId: po.supplierId,
        supplierName: po.supplierName,
        status: po.status,
        totalAmount: Number(po.totalAmount) || 0,
        currency: po.currency || "AUD",
        orderDate: po.orderDate ? String(po.orderDate) : null,
        requiredDate: po.requiredDate ? String(po.requiredDate) : null,
        expectedDeliveryDate: po.expectedDeliveryDate
          ? String(po.expectedDeliveryDate)
          : null,
        createdAt: String(po.createdAt),
      })),
    [ordersData]
  );
  const total = ordersData?.pagination?.totalItems ?? 0;

  const deleteMutation = useDeletePurchaseOrder();

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
        ["orderDate", "requiredDate", "totalAmount", "createdAt"].includes(field)
          ? "desc"
          : "asc"
      );
      return field as SortField;
    });
    setPage(1); // Reset to first page on sort change
  }, []);

  const handleViewPO = useCallback(
    (poId: string) => {
      navigate({
        to: "/purchase-orders/$poId",
        params: { poId },
      });
    },
    [navigate]
  );

  const handleEditPO = useCallback(
    (poId: string) => {
      // Edit navigates to the same detail page for draft POs
      navigate({
        to: "/purchase-orders/$poId",
        params: { poId },
      });
    },
    [navigate]
  );

  const handleDeletePO = useCallback(
    async (poId: string) => {
      const po = orders.find((o) => o.id === poId);
      const { confirmed } = await confirmation.confirm({
        ...confirmations.delete(po?.poNumber ?? "this purchase order", "purchase order"),
      });
      if (!confirmed) return;

      try {
        await deleteMutation.mutateAsync({ id: poId });
        toastSuccess("Purchase order deleted");
      } catch {
        toastError("Failed to delete purchase order");
      }
    },
    [deleteMutation, orders, confirmation]
  );

  const handleReceivePO = useCallback(
    (poId: string) => {
      // Navigate to PO detail page to receive goods
      navigate({
        to: "/purchase-orders/$poId",
        params: { poId },
      });
    },
    [navigate]
  );

  // Selection handlers
  const handleSelect = useCallback((id: string, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
    lastSelectedIndexRef.current = orders.findIndex((o) => o.id === id);
  }, [orders]);

  const handleSelectAll = useCallback((checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(orders.map((o) => o.id)));
    } else {
      setSelectedIds(new Set());
    }
  }, [orders]);

  const handleShiftClickRange = useCallback((rowIndex: number) => {
    const lastIndex = lastSelectedIndexRef.current;
    if (lastIndex === -1) {
      // No previous selection, just select this row
      const id = orders[rowIndex]?.id;
      if (id) {
        setSelectedIds((prev) => new Set(prev).add(id));
      }
      lastSelectedIndexRef.current = rowIndex;
      return;
    }

    const start = Math.min(lastIndex, rowIndex);
    const end = Math.max(lastIndex, rowIndex);
    const rangeIds = orders.slice(start, end + 1).map((o) => o.id);

    setSelectedIds((prev) => {
      const next = new Set(prev);
      rangeIds.forEach((id) => next.add(id));
      return next;
    });
    lastSelectedIndexRef.current = rowIndex;
  }, [orders]);

  const isSelected = useCallback((id: string) => selectedIds.has(id), [selectedIds]);

  const isAllSelected = orders.length > 0 && selectedIds.size === orders.length;
  const isPartiallySelected = selectedIds.size > 0 && selectedIds.size < orders.length;

  // Map schema filters to config filter state (for DomainFilterBar)
  const configFilters: POFiltersState = useMemo(
    () => ({
      search: filters.search,
      status: filters.status,
      supplierId: filters.supplierId,
      dateRange:
        filters.dateFrom || filters.dateTo
          ? { from: filters.dateFrom, to: filters.dateTo }
          : null,
      totalRange:
        filters.valueMin !== null || filters.valueMax !== null
          ? { min: filters.valueMin, max: filters.valueMax }
          : null,
    }),
    [filters]
  );

  // Handle filter changes from DomainFilterBar
  const handleFiltersChangeInternal = useCallback(
    (nextFilters: POFiltersState) => {
      setPage(1);
      // Map config filter state back to schema filters
      onFiltersChange({
        search: nextFilters.search,
        status: nextFilters.status,
        supplierId: nextFilters.supplierId,
        dateFrom: nextFilters.dateRange?.from ?? null,
        dateTo: nextFilters.dateRange?.to ?? null,
        valueMin: nextFilters.totalRange?.min ?? null,
        valueMax: nextFilters.totalRange?.max ?? null,
      });
    },
    [onFiltersChange]
  );

  return (
    <>
      <ConfirmationDialog />
      <div className="space-y-4">
        <DomainFilterBar
          config={PO_FILTER_CONFIG}
          filters={configFilters}
          onFiltersChange={handleFiltersChangeInternal}
          defaultFilters={DEFAULT_PO_FILTERS}
        />

        <POListPresenter
          orders={orders}
          isLoading={isOrdersLoading}
          error={ordersError as Error | null}
          selectedIds={selectedIds}
          isAllSelected={isAllSelected}
          isPartiallySelected={isPartiallySelected}
          onSelect={handleSelect}
          onSelectAll={handleSelectAll}
          onShiftClickRange={handleShiftClickRange}
          isSelected={isSelected}
          sortField={sortField}
          sortDirection={sortDirection}
          onSort={handleSort}
          onViewPO={handleViewPO}
          onEditPO={handleEditPO}
          onDeletePO={handleDeletePO}
          onReceivePO={handleReceivePO}
          page={page}
          pageSize={DISPLAY_PAGE_SIZE}
          total={total}
          onPageChange={setPage}
        />
      </div>
    </>
  );
}

export default POListContainer;
