/**
 * Orders List Presenter
 *
 * Unified presenter combining desktop table and mobile cards
 * with responsive switching, loading states, and pagination.
 */

import { memo, useMemo } from "react";
import { Package, ChevronLeft, ChevronRight } from "lucide-react";
import {
  DataTableSkeleton,
  DataTableEmpty,
} from "@/components/shared/data-table";
import { FilterEmptyState } from "@/components/shared/filter-empty-state";
import { countActiveFilters } from "@/components/shared/filters/types";
import { buildFilterItems } from "@/components/shared/filters/build-filter-items";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { OrdersTablePresenter } from "./orders-table-presenter";
import { OrdersMobileCards } from "./orders-mobile-cards";
import type { OrderTableItem } from "@/lib/schemas/orders";
import type { OrderFiltersState } from "./order-filter-config";
import { ORDER_FILTER_CONFIG, DEFAULT_ORDER_FILTERS } from "./order-filter-config";

export interface OrdersListPresenterProps {
  /** Orders to display */
  orders: OrderTableItem[];
  /** Loading state */
  isLoading: boolean;
  /** Error state */
  error: Error | null;
  /** Retry handler for error state */
  onRetry?: () => void;
  /** Current filters */
  filters?: OrderFiltersState;
  /** Update filters handler */
  onFiltersChange?: (filters: OrderFiltersState) => void;
  /** Clear all filters handler */
  onClearFilters?: () => void;
  /** Create order handler (for empty state CTA) */
  onCreateOrder?: () => void;
  /** Set of selected order IDs */
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
  /** View order handler */
  onViewOrder: (id: string) => void;
  /** Duplicate order handler */
  onDuplicateOrder: (id: string) => void;
  /** Delete order handler */
  onDeleteOrder: (id: string) => void;
  /** Pagination */
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  /** When creating RMA from issue - preserve in order links */
  fromIssueId?: string;
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
            <Skeleton className="h-4 w-24 mb-2" />
            <Skeleton className="h-3 w-32 mb-3" />
            <div className="flex justify-between">
              <Skeleton className="h-6 w-20" />
              <Skeleton className="h-4 w-16" />
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
          { skeleton: { type: "text", width: "w-24" } },
          { skeleton: { type: "text", width: "w-32" } },
          { skeleton: { type: "text", width: "w-20" } },
          { skeleton: { type: "text", width: "w-16" } },
          { skeleton: { type: "badge", width: "w-20" } },
          { skeleton: { type: "badge", width: "w-16" } },
          { skeleton: { type: "text", width: "w-12" } },
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
        Showing {start} to {end} of {total} orders
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
 * Unified orders list presenter with responsive table/cards.
 */
export const OrdersListPresenter = memo(function OrdersListPresenter({
  orders,
  isLoading,
  error,
  onRetry,
  filters,
  onFiltersChange,
  onClearFilters,
  onCreateOrder,
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
  onViewOrder,
  onDuplicateOrder,
  onDeleteOrder,
  page,
  pageSize,
  total,
  onPageChange,
  fromIssueId,
  className,
}: OrdersListPresenterProps) {
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
      config: ORDER_FILTER_CONFIG,
      defaultFilters: DEFAULT_ORDER_FILTERS,
      onFiltersChange,
      excludeKeys: ["search"],
    });
  }, [filters, hasActiveFilters, onFiltersChange]);

  // Error state
  if (error) {
    return (
      <DataTableEmpty
        variant="error"
        title="Failed to load orders"
        description={error.message ?? "An unexpected error occurred"}
        action={onRetry ? { label: "Try again", onClick: onRetry } : undefined}
        className={className}
      />
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <div className={cn("space-y-3", className)}>
        <DesktopSkeleton />
        <MobileSkeleton />
      </div>
    );
  }

  // Empty state - use FilterEmptyState if filters are active, otherwise use DataTableEmpty
  if (orders.length === 0) {
    // If filters are active, use FilterEmptyState
    if (hasActiveFilters && filterItems.length > 0 && onClearFilters) {
      return (
        <div className={cn("py-12", className)}>
          <FilterEmptyState
            entityName="orders"
            filters={filterItems}
            onClearAll={onClearFilters}
          />
        </div>
      );
    }

    // First visit / no filters - use DataTableEmpty with CTA
    return (
      <DataTableEmpty
        variant="empty"
        icon={Package}
        title="No orders yet"
        description={total === 0 
          ? "Create your first order to get started with order management."
          : "No orders match your current search or filters."}
        action={onCreateOrder ? {
          label: "Create Order",
          onClick: onCreateOrder,
        } : undefined}
        className={className}
      />
    );
  }

  return (
    <div className={cn("space-y-3", className)}>
      {/* Desktop Table */}
      <div className="hidden md:block">
        <OrdersTablePresenter
          orders={orders}
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
          onViewOrder={onViewOrder}
          onDuplicateOrder={onDuplicateOrder}
          onDeleteOrder={onDeleteOrder}
          fromIssueId={fromIssueId}
        />
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden">
        <OrdersMobileCards
          orders={orders}
          selectedIds={selectedIds}
          onSelect={onSelect}
          onViewOrder={onViewOrder}
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

OrdersListPresenter.displayName = "OrdersListPresenter";
