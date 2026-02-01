'use client';

/**
 * Customers List Container
 *
 * Handles data fetching, selection state, bulk actions, and mutations
 * for the customers list.
 *
 * NOTE: This is a domain container component. It does NOT include layout
 * components (PageLayout, Header, etc.). The parent route is responsible
 * for layout. See UI_UX_STANDARDIZATION_PRD.md for patterns.
 *
 * @source customers from useCustomers hook
 * @source selection from useTableSelection hook
 * @source deleteCustomer from useDeleteCustomer hook
 */

import { useCallback, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Trash2, Tag, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toastSuccess, toastError, useConfirmation } from "@/hooks";
import { confirmations } from "@/hooks/_shared/use-confirmation";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import {
  useCustomers,
  useDeleteCustomer,
  useBulkDeleteCustomers,
} from "@/hooks/customers";
import { useTableSelection, BulkActionsBar } from "@/components/shared/data-table";
import { DomainFilterBar } from "@/components/shared/filters";
import type { CustomerListQuery } from "@/lib/schemas/customers";
import {
  createCustomerFilterConfig,
  DEFAULT_CUSTOMER_FILTERS,
  type CustomerFiltersState,
} from "./customer-filter-config";
import { CustomersListPresenter } from "./customers-list-presenter";
import type { CustomerTableData } from "./customer-columns";

const DISPLAY_PAGE_SIZE = 20;

export interface CustomersListContainerProps {
  filters: CustomerFiltersState;
  onFiltersChange: (filters: CustomerFiltersState) => void;
  // Callbacks for actions - parent route owns the UI
  onCreateCustomer?: () => void;
  onRefresh?: () => void;
  onExport?: (ids: string[], format: "csv" | "xlsx" | "json") => void;
  isExporting?: boolean;
  /** Available tags for filtering */
  availableTags?: Array<{ id: string; name: string; color: string }>;
}

type SortField =
  | "name"
  | "status"
  | "lifetimeValue"
  | "totalOrders"
  | "healthScore"
  | "lastOrderDate"
  | "createdAt";
type SortDirection = "asc" | "desc";

function buildCustomerQuery(
  filters: CustomerFiltersState
): Pick<
  CustomerListQuery,
  "search" | "status" | "type" | "size" | "healthScoreMin" | "healthScoreMax" | "tags"
> {
  // Note: CustomerListQuery expects single values for status/type/size
  // For now, we take the first value if multiple are selected
  // TODO: Consider extending the API to support multiple filter values
  return {
    search: filters.search || undefined,
    status: filters.status.length > 0 ? (filters.status[0] as CustomerListQuery["status"]) : undefined,
    type: filters.type.length > 0 ? (filters.type[0] as CustomerListQuery["type"]) : undefined,
    size: filters.size.length > 0 ? (filters.size[0] as CustomerListQuery["size"]) : undefined,
    healthScoreMin: filters.healthScoreRange?.min ?? undefined,
    healthScoreMax: filters.healthScoreRange?.max ?? undefined,
    tags: filters.tags.length > 0 ? filters.tags : undefined,
  };
}

export function CustomersListContainer({
  filters,
  onFiltersChange,
  onExport,
  availableTags = [],
}: CustomersListContainerProps) {
  const navigate = useNavigate();
  const confirmation = useConfirmation();
  const [page, setPage] = useState(1);
  const [sortField, setSortField] = useState<SortField>("createdAt");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const queryFilters = useMemo<CustomerListQuery>(
    () => ({
      ...buildCustomerQuery(filters),
      page,
      pageSize: DISPLAY_PAGE_SIZE,
      sortBy: sortField,
      sortOrder: sortDirection,
    }),
    [filters, page, sortField, sortDirection]
  );

  const {
    data: customersData,
    isLoading: isCustomersLoading,
    error: customersError,
  } = useCustomers(queryFilters);

  // Build dynamic filter config with tag options
  const filterConfig = useMemo(
    () => createCustomerFilterConfig(availableTags),
    [availableTags]
  );

  // Handle filter changes from DomainFilterBar
  const handleFiltersChange = useCallback(
    (nextFilters: CustomerFiltersState) => {
      setPage(1);
      onFiltersChange(nextFilters);
    },
    [onFiltersChange]
  );

  // Cast customers to CustomerTableData type
  const customers = useMemo<CustomerTableData[]>(
    () => (customersData?.items ?? []) as CustomerTableData[],
    [customersData]
  );
  const total = customersData?.pagination?.totalItems ?? 0;

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
  } = useTableSelection({ items: customers });

  const deleteMutation = useDeleteCustomer();
  const bulkDeleteMutation = useBulkDeleteCustomers();

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
        ["lifetimeValue", "totalOrders", "healthScore", "lastOrderDate", "createdAt"].includes(field)
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
      const idx = customers.findIndex((c) => c.id === id);
      if (idx !== -1) {
        setLastClickedIndex(idx);
      }
    },
    [handleSelect, customers, setLastClickedIndex]
  );

  const handleViewCustomer = useCallback(
    (customerId: string) => {
      navigate({
        to: "/customers/$customerId",
        params: { customerId },
      });
    },
    [navigate]
  );

  const handleEditCustomer = useCallback(
    (customerId: string) => {
      // Navigate to customer detail with edit mode
      navigate({
        to: "/customers/$customerId",
        params: { customerId },
        search: { edit: true },
      });
    },
    [navigate]
  );

  const handleDeleteCustomer = useCallback(
    async (customerId: string) => {
      const customer = customers.find((c) => c.id === customerId);
      const { confirmed } = await confirmation.confirm({
        ...confirmations.delete(customer?.name ?? "this customer", "customer"),
      });
      if (!confirmed) return;

      try {
        await deleteMutation.mutateAsync(customerId);
        toastSuccess("Customer deleted");
      } catch {
        toastError("Failed to delete customer");
      }
    },
    [deleteMutation, customers, confirmation]
  );

  // Bulk delete handler
  const handleBulkDelete = useCallback(async () => {
    const count = selectedItems.length;
    const { confirmed } = await confirmation.confirm({
      title: `Delete ${count} customers?`,
      description: `This action cannot be undone. All selected customers and their associated data will be permanently deleted.`,
      confirmLabel: "Delete",
      variant: "destructive",
    });
    if (!confirmed) return;

    try {
      await bulkDeleteMutation.mutateAsync(Array.from(selectedIds));
      toastSuccess(`${count} customers deleted`);
      clearSelection();
    } catch {
      toastError("Failed to delete customers");
    }
  }, [bulkDeleteMutation, selectedIds, selectedItems.length, clearSelection, confirmation]);

  // Bulk tag assignment (placeholder)
  const handleBulkAssignTags = useCallback(() => {
    // TODO: Open tag assignment dialog
    toastSuccess("Tag assignment coming soon");
  }, []);

  // Export handler
  const handleExportSelected = useCallback(
    (format: "csv" | "xlsx" | "json") => {
      if (onExport) {
        onExport(Array.from(selectedIds), format);
      }
    },
    [onExport, selectedIds]
  );

  return (
    <>
      <ConfirmationDialog />
      <div className="space-y-4">
        <DomainFilterBar<CustomerFiltersState>
          config={filterConfig}
          filters={filters}
          onFiltersChange={handleFiltersChange}
          defaultFilters={DEFAULT_CUSTOMER_FILTERS}
        />

        {/* Bulk Actions Bar */}
        <BulkActionsBar selectedCount={selectedItems.length} onClear={clearSelection}>
          <Button size="sm" variant="outline" onClick={handleBulkAssignTags}>
            <Tag className="h-4 w-4 mr-1" />
            Assign Tags
          </Button>
          {onExport && (
            <Button size="sm" variant="outline" onClick={() => handleExportSelected("csv")}>
              <Download className="h-4 w-4 mr-1" />
              Export CSV
            </Button>
          )}
          <Button size="sm" variant="destructive" onClick={handleBulkDelete}>
            <Trash2 className="h-4 w-4 mr-1" />
            Delete
          </Button>
        </BulkActionsBar>

        <CustomersListPresenter
          customers={customers}
          isLoading={isCustomersLoading}
          error={customersError as Error | null}
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
          onViewCustomer={handleViewCustomer}
          onEditCustomer={handleEditCustomer}
          onDeleteCustomer={handleDeleteCustomer}
          page={page}
          pageSize={DISPLAY_PAGE_SIZE}
          total={total}
          onPageChange={setPage}
        />
      </div>
    </>
  );
}

export default CustomersListContainer;
