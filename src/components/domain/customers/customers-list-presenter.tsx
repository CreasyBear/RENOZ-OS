/**
 * Customers List Presenter
 *
 * Unified presenter combining desktop table and mobile cards
 * with responsive switching, loading states, and pagination.
 */

import { memo, useMemo } from "react";
import { Users, ChevronLeft, ChevronRight } from "lucide-react";
import {
  DataTableSkeleton,
  DataTableEmpty,
} from "@/components/shared/data-table";
import { FilterEmptyState } from "@/components/shared/filter-empty-state";
import { buildFilterItems } from "@/components/shared/filters";
import { countActiveFilters } from "@/components/shared/filters/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { CustomersTablePresenter } from "./customers-table-presenter";
import { CustomersMobileCards } from "./customers-mobile-cards";
import type { CustomerTableData } from "./customer-columns";
import {
  type CustomerFiltersState,
  DEFAULT_CUSTOMER_FILTERS,
  CUSTOMER_FILTER_CONFIG,
} from "./customer-filter-config";

export interface CustomersListPresenterProps {
  /** Customers to display */
  customers: CustomerTableData[];
  /** Loading state */
  isLoading: boolean;
  /** Error state */
  error: Error | null;
  /** Retry handler for error state */
  onRetry?: () => void;
  /** Set of selected customer IDs */
  selectedIds: Set<string>;
  /** Whether all items are selected */
  isAllSelected: boolean;
  /** Whether some items are selected */
  isPartiallySelected: boolean;
  /** Handle single item selection */
  onSelect: (id: string, checked: boolean) => void;
  /** Handle select all */
  onSelectAll: (checked: boolean) => void;
  /** Handle shift-click range selection */
  onShiftClickRange: (rowIndex: number) => void;
  /** Check if item is selected */
  isSelected: (id: string) => boolean;
  /** Current sort field */
  sortField: string;
  /** Current sort direction */
  sortDirection: "asc" | "desc";
  /** Sort change handler */
  onSort: (field: string) => void;
  /** View customer handler */
  onViewCustomer: (id: string) => void;
  /** Edit customer handler */
  onEditCustomer?: (id: string) => void;
  /** Delete customer handler */
  onDeleteCustomer?: (id: string) => void;
  /** Create customer handler (for empty-state CTA) */
  onCreateCustomer?: () => void;
  /** Pagination */
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  /** Current filters */
  filters?: CustomerFiltersState;
  /** Filter change handler */
  onFiltersChange?: (filters: CustomerFiltersState) => void;
  /** Clear all filters handler */
  onClearFilters?: () => void;
  /** Additional className */
  className?: string;
}

/**
 * Mobile skeleton component
 */
function MobileSkeleton() {
  return (
    <div className="md:hidden space-y-3">
      {[1, 2, 3].map((i) => (
        <Card key={i}>
          <CardContent className="p-4">
            <div className="flex items-start justify-between mb-2">
              <div>
                <Skeleton className="h-4 w-32 mb-1" />
                <Skeleton className="h-3 w-20" />
              </div>
              <Skeleton className="h-6 w-16" />
            </div>
            <div className="flex gap-3 mb-3">
              <Skeleton className="h-3 w-28" />
              <Skeleton className="h-3 w-24" />
            </div>
            <div className="flex justify-between pt-2 border-t">
              <div className="flex gap-4">
                <Skeleton className="h-8 w-16" />
                <Skeleton className="h-8 w-12" />
              </div>
              <Skeleton className="h-8 w-12" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

/**
 * Desktop skeleton using shared DataTableSkeleton
 */
function DesktopSkeleton() {
  return (
    <div className="hidden md:block">
      <DataTableSkeleton
        rows={5}
        columns={[
          { skeleton: { type: "checkbox" } },
          { skeleton: { type: "text", width: "w-40" } },
          { skeleton: { type: "badge", width: "w-20" } },
          { skeleton: { type: "text", width: "w-20" } },
          { skeleton: { type: "text", width: "w-16" } },
          { skeleton: { type: "text", width: "w-24" } },
          { skeleton: { type: "text", width: "w-28" } },
          { skeleton: { type: "text", width: "w-20" } },
          { skeleton: { type: "text", width: "w-12" } },
          { skeleton: { type: "text", width: "w-16" } },
          { skeleton: { type: "text", width: "w-20" } },
          { skeleton: { type: "actions" } },
        ]}
      />
    </div>
  );
}

/**
 * Pagination component
 */
function Pagination({
  page,
  pageSize,
  total,
  onPageChange,
}: {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
}) {
  const totalPages = Math.ceil(total / pageSize);

  if (totalPages <= 1) return null;

  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  return (
    <div className="flex items-center justify-between px-2">
      <p className="text-sm text-muted-foreground">
        Showing {start} to {end} of {total} customers
      </p>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={page === 1}
        >
          <ChevronLeft className="h-4 w-4" />
          Previous
        </Button>
        <span className="text-sm tabular-nums">
          Page {page} of {totalPages}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          disabled={page === totalPages}
        >
          Next
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

/**
 * Unified customers list presenter with responsive table/cards.
 */
export const CustomersListPresenter = memo(function CustomersListPresenter({
  customers,
  isLoading,
  error,
  onRetry,
  selectedIds,
  isAllSelected,
  isPartiallySelected,
  onSelect,
  onSelectAll,
  onShiftClickRange,
  isSelected,
  sortField,
  sortDirection,
  onSort,
  onViewCustomer,
  onEditCustomer,
  onDeleteCustomer,
  onCreateCustomer,
  page,
  pageSize,
  total,
  onPageChange,
  filters,
  onFiltersChange,
  onClearFilters,
  className,
}: CustomersListPresenterProps) {
  // Check if filters are active
  const hasActiveFilters = useMemo(() => {
    if (!filters) return false;
    return countActiveFilters(filters, ["search"]) > 0;
  }, [filters]);

  // Build filter items for FilterEmptyState using shared utility
  const filterItems = useMemo(() => {
    if (!filters || !hasActiveFilters || !onFiltersChange) return [];
    return buildFilterItems({
      filters,
      config: CUSTOMER_FILTER_CONFIG,
      defaultFilters: DEFAULT_CUSTOMER_FILTERS,
      onFiltersChange,
      excludeKeys: ["search"],
    });
  }, [filters, hasActiveFilters, onFiltersChange]);
  // Error state
  if (error) {
    return (
      <DataTableEmpty
        variant="error"
        title="Failed to load customers"
        description={error.message ?? "An unexpected error occurred"}
        action={onRetry ? { label: "Try again", onClick: onRetry } : undefined}
        className={className}
      />
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <div className={cn("space-y-4", className)}>
        <DesktopSkeleton />
        <MobileSkeleton />
      </div>
    );
  }

  // Empty state - use FilterEmptyState if filters are active, otherwise use DataTableEmpty
  if (customers.length === 0) {
    // If filters are active, use FilterEmptyState
    if (hasActiveFilters && filterItems.length > 0 && onClearFilters) {
      return (
        <div className={cn("py-12", className)}>
          <FilterEmptyState
            entityName="customers"
            filters={filterItems}
            onClearAll={onClearFilters}
          />
        </div>
      );
    }

    // First visit / no filters - use DataTableEmpty
    return (
      <DataTableEmpty
        variant="empty"
        icon={Users}
        title="No customers found"
        description="Get started by adding your first customer"
        action={onCreateCustomer ? { label: "Add Customer", onClick: onCreateCustomer } : undefined}
        className={className}
      />
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Desktop Table */}
      <div className="hidden md:block">
        <CustomersTablePresenter
          customers={customers}
          selectedIds={selectedIds}
          isAllSelected={isAllSelected}
          isPartiallySelected={isPartiallySelected}
          onSelect={onSelect}
          onSelectAll={onSelectAll}
          onShiftClickRange={onShiftClickRange}
          isSelected={isSelected}
          sortField={sortField}
          sortDirection={sortDirection}
          onSort={onSort}
          onViewCustomer={onViewCustomer}
          onEditCustomer={onEditCustomer}
          onDeleteCustomer={onDeleteCustomer}
        />
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden">
        <CustomersMobileCards
          customers={customers}
          selectedIds={selectedIds}
          onSelect={onSelect}
          onViewCustomer={onViewCustomer}
        />
      </div>

      {/* Pagination */}
      <Pagination
        page={page}
        pageSize={pageSize}
        total={total}
        onPageChange={onPageChange}
      />
    </div>
  );
});

CustomersListPresenter.displayName = "CustomersListPresenter";
