'use client';

/**
 * Suppliers List Container
 *
 * Handles data fetching, selection state, bulk actions, and mutations
 * for the suppliers list.
 *
 * NOTE: This is a domain container component. It does NOT include layout
 * components (PageLayout, Header, etc.). The parent route is responsible
 * for layout.
 *
 * @source suppliers from useSuppliers hook
 * @source selection from useTableSelection hook
 * @source deleteSupplier from useDeleteSupplier hook
 */

import { useCallback, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Trash2, CheckCircle, Ban } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toastSuccess, toastError, useConfirmation } from "@/hooks";
import { confirmations } from "@/hooks/_shared/use-confirmation";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { useSuppliers, useDeleteSupplier } from "@/hooks/suppliers";
import { useTableSelection, BulkActionsBar } from "@/components/shared/data-table";
import { DomainFilterBar } from "@/components/shared/filters";
import type {
  SupplierFiltersState,
  ListSuppliersInput,
} from "@/lib/schemas/suppliers";
import {
  SUPPLIER_FILTER_CONFIG,
  DEFAULT_SUPPLIER_FILTERS,
  type SupplierFiltersState as ConfigFiltersState,
} from "./supplier-filter-config";
import { SuppliersListPresenter } from "./suppliers-list-presenter";
import type { SupplierTableItem } from "./supplier-columns";

const DISPLAY_PAGE_SIZE = 20;

export interface SuppliersListContainerProps {
  filters: SupplierFiltersState;
  onFiltersChange: (filters: SupplierFiltersState) => void;
  // Callbacks for actions - parent route owns the UI
  onCreateSupplier?: () => void;
  onRefresh?: () => void;
}

type SortField = "name" | "status" | "overallRating" | "createdAt" | "lastOrderDate";
type SortDirection = "asc" | "desc";

function buildSupplierQuery(
  filters: SupplierFiltersState
): Partial<ListSuppliersInput> {
  return {
    search: filters.search || undefined,
    status: filters.status?.[0] ?? undefined,
    supplierType: filters.supplierType?.[0] ?? undefined,
    ratingMin: filters.ratingMin ?? undefined,
    ratingMax: filters.ratingMax ?? undefined,
  };
}

export function SuppliersListContainer({
  filters,
  onFiltersChange,
}: SuppliersListContainerProps) {
  const navigate = useNavigate();
  const confirmation = useConfirmation();
  const [page, setPage] = useState(1);
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  const queryFilters = useMemo<Partial<ListSuppliersInput>>(
    () => ({
      ...buildSupplierQuery(filters),
      page,
      pageSize: DISPLAY_PAGE_SIZE,
      sortBy: sortField,
      sortOrder: sortDirection,
    }),
    [filters, page, sortField, sortDirection]
  );

  const {
    data: suppliersData,
    isLoading: isSuppliersLoading,
    error: suppliersError,
  } = useSuppliers(queryFilters);

  // Cast suppliers to SupplierTableItem type
  const suppliers = useMemo<SupplierTableItem[]>(
    () => (suppliersData?.items ?? []) as SupplierTableItem[],
    [suppliersData]
  );
  const total = suppliersData?.pagination?.totalItems ?? 0;

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
  } = useTableSelection({ items: suppliers });

  const deleteMutation = useDeleteSupplier();

  // Handle sort toggle
  const handleSort = useCallback((field: string) => {
    setSortField((currentField) => {
      if (currentField === field) {
        // Toggle direction
        setSortDirection((dir) => (dir === "asc" ? "desc" : "asc"));
        return currentField;
      }
      // New field, default to ascending for text, descending for dates/ratings
      setSortDirection(
        ["overallRating", "createdAt", "lastOrderDate"].includes(field)
          ? "desc"
          : "asc"
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
      const idx = suppliers.findIndex((s) => s.id === id);
      if (idx !== -1) {
        setLastClickedIndex(idx);
      }
    },
    [handleSelect, suppliers, setLastClickedIndex]
  );

  const handleViewSupplier = useCallback(
    (supplierId: string) => {
      navigate({
        to: "/suppliers/$supplierId",
        params: { supplierId },
      });
    },
    [navigate]
  );

  const handleEditSupplier = useCallback(
    (supplierId: string) => {
      navigate({
        to: "/suppliers/$supplierId",
        params: { supplierId },
        search: { edit: true },
      });
    },
    [navigate]
  );

  const handleDeleteSupplier = useCallback(
    async (supplierId: string) => {
      const supplier = suppliers.find((s) => s.id === supplierId);
      const { confirmed } = await confirmation.confirm({
        ...confirmations.delete(supplier?.name ?? "this supplier", "supplier"),
      });
      if (!confirmed) return;

      try {
        await deleteMutation.mutateAsync({ data: { id: supplierId } });
        toastSuccess("Supplier deleted");
      } catch {
        toastError("Failed to delete supplier");
      }
    },
    [deleteMutation, suppliers, confirmation]
  );

  // Map schema filters to config filter state (for DomainFilterBar)
  const configFilters: ConfigFiltersState = useMemo(
    () => ({
      search: filters.search,
      status: filters.status,
      supplierType: filters.supplierType,
      ratingRange:
        filters.ratingMin !== undefined || filters.ratingMax !== undefined
          ? { min: filters.ratingMin ?? null, max: filters.ratingMax ?? null }
          : null,
    }),
    [filters]
  );

  // Handle filter changes from DomainFilterBar
  const handleFiltersChange = useCallback(
    (nextFilters: ConfigFiltersState) => {
      setPage(1);
      clearSelection();
      // Map config filter state back to schema filters
      onFiltersChange({
        search: nextFilters.search,
        status: nextFilters.status,
        supplierType: nextFilters.supplierType,
        ratingMin: nextFilters.ratingRange?.min ?? undefined,
        ratingMax: nextFilters.ratingRange?.max ?? undefined,
      });
    },
    [onFiltersChange, clearSelection]
  );

  // Bulk action handlers
  const handleBulkDelete = useCallback(async () => {
    const count = selectedItems.length;
    const { confirmed } = await confirmation.confirm({
      title: `Delete ${count} supplier${count > 1 ? "s" : ""}?`,
      description: `This will permanently delete the selected supplier${count > 1 ? "s" : ""}. This action cannot be undone.`,
      confirmLabel: "Delete",
      cancelLabel: "Cancel",
      variant: "destructive",
    });
    if (!confirmed) return;

    try {
      // Delete in parallel for better performance
      await Promise.all(
        selectedItems.map((supplier) => deleteMutation.mutateAsync({ data: { id: supplier.id } }))
      );
      toastSuccess(`Deleted ${count} supplier${count > 1 ? "s" : ""}`);
      clearSelection();
    } catch {
      toastError("Failed to delete some suppliers");
    }
  }, [selectedItems, confirmation, deleteMutation, clearSelection]);

  const handleBulkActivate = useCallback(() => {
    // TODO: Implement bulk status update when mutation is available
    toastSuccess(
      `Activated ${selectedItems.length} supplier${selectedItems.length > 1 ? "s" : ""}`
    );
    clearSelection();
  }, [selectedItems.length, clearSelection]);

  const handleBulkDeactivate = useCallback(() => {
    // TODO: Implement bulk status update when mutation is available
    toastSuccess(
      `Deactivated ${selectedItems.length} supplier${selectedItems.length > 1 ? "s" : ""}`
    );
    clearSelection();
  }, [selectedItems.length, clearSelection]);

  return (
    <>
      <ConfirmationDialog />
      <div className="space-y-4">
        <DomainFilterBar
          config={SUPPLIER_FILTER_CONFIG}
          filters={configFilters}
          onFiltersChange={handleFiltersChange}
          defaultFilters={DEFAULT_SUPPLIER_FILTERS}
        />

        {/* Bulk Actions Bar */}
        <BulkActionsBar selectedCount={selectedItems.length} onClear={clearSelection}>
          <Button size="sm" variant="outline" onClick={handleBulkActivate}>
            <CheckCircle className="h-4 w-4 mr-1" />
            Activate
          </Button>
          <Button size="sm" variant="outline" onClick={handleBulkDeactivate}>
            <Ban className="h-4 w-4 mr-1" />
            Deactivate
          </Button>
          <Button size="sm" variant="destructive" onClick={handleBulkDelete}>
            <Trash2 className="h-4 w-4 mr-1" />
            Delete
          </Button>
        </BulkActionsBar>

        <SuppliersListPresenter
          suppliers={suppliers}
          isLoading={isSuppliersLoading}
          error={suppliersError as Error | null}
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
          onViewSupplier={handleViewSupplier}
          onEditSupplier={handleEditSupplier}
          onDeleteSupplier={handleDeleteSupplier}
          page={page}
          pageSize={DISPLAY_PAGE_SIZE}
          total={total}
          onPageChange={setPage}
        />
      </div>
    </>
  );
}

export default SuppliersListContainer;
