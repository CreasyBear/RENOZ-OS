/**
 * Suppliers List Presenter
 *
 * Unified presenter combining desktop table and mobile cards
 * with responsive switching, loading states, and pagination.
 */

import { memo } from "react";
import { Building2, ChevronLeft, ChevronRight } from "lucide-react";
import {
  DataTableSkeleton,
  DataTableEmpty,
} from "@/components/shared/data-table";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { SuppliersTablePresenter } from "./suppliers-table-presenter";
import { SuppliersMobileCards } from "./suppliers-mobile-cards";
import type { SupplierTableItem } from "./supplier-columns";

export interface SuppliersListPresenterProps {
  /** Suppliers to display */
  suppliers: SupplierTableItem[];
  /** Loading state */
  isLoading: boolean;
  /** Error state */
  error: Error | null;
  /** Set of selected supplier IDs */
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
  /** View supplier handler */
  onViewSupplier: (id: string) => void;
  /** Edit supplier handler */
  onEditSupplier: (id: string) => void;
  /** Delete supplier handler */
  onDeleteSupplier: (id: string) => void;
  /** Pagination */
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  /** Retry handler for error state */
  onRetry?: () => void;
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
            <div className="flex justify-between mb-2">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-5 w-16" />
            </div>
            <Skeleton className="h-3 w-48 mb-3" />
            <div className="flex justify-between">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-24" />
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
          { skeleton: { type: "badge", width: "w-24" } },
          { skeleton: { type: "badge", width: "w-20" } },
          { skeleton: { type: "text", width: "w-28" } },
          { skeleton: { type: "text", width: "w-16" } },
          { skeleton: { type: "text", width: "w-20" } },
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
        Showing {start} to {end} of {total} suppliers
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
 * Unified suppliers list presenter with responsive table/cards.
 */
export const SuppliersListPresenter = memo(function SuppliersListPresenter({
  suppliers,
  isLoading,
  error,
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
  onViewSupplier,
  onEditSupplier,
  onDeleteSupplier,
  page,
  pageSize,
  total,
  onPageChange,
  onRetry,
  className,
}: SuppliersListPresenterProps) {
  // Error state
  if (error) {
    return (
      <DataTableEmpty
        variant="error"
        title="Failed to load suppliers"
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

  // Empty state
  if (suppliers.length === 0) {
    return (
      <DataTableEmpty
        variant="no-results"
        icon={Building2}
        title="No suppliers found"
        description="No suppliers match the current filters"
        className={className}
      />
    );
  }

  return (
    <div className={cn("space-y-3", className)}>
      {/* Desktop Table */}
      <div className="hidden md:block">
        <SuppliersTablePresenter
          suppliers={suppliers}
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
          onViewSupplier={onViewSupplier}
          onEditSupplier={onEditSupplier}
          onDeleteSupplier={onDeleteSupplier}
        />
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden">
        <SuppliersMobileCards
          suppliers={suppliers}
          selectedIds={selectedIds}
          onSelect={onSelect}
          onViewSupplier={onViewSupplier}
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

SuppliersListPresenter.displayName = "SuppliersListPresenter";
