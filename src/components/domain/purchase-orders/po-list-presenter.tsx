/**
 * Purchase Orders List Presenter
 *
 * Unified presenter combining desktop table and mobile cards
 * with responsive switching, loading states, and pagination.
 */

import { memo } from "react";
import { Truck, ChevronLeft, ChevronRight } from "lucide-react";
import {
  DataTableSkeleton,
  DataTableEmpty,
} from "@/components/shared/data-table";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { PurchaseOrderTableData } from "@/lib/schemas/purchase-orders";
import { POTablePresenter } from "./po-table-presenter";
import { POMobileCards } from "./po-mobile-cards";

export interface POListPresenterProps {
  /** Purchase orders to display */
  orders: PurchaseOrderTableData[];
  /** Loading state */
  isLoading: boolean;
  /** Error state */
  error: Error | null;
  /** Set of selected PO IDs */
  selectedIds: Set<string>;
  /** Whether all items are selected */
  isAllSelected: boolean;
  /** Whether some items are selected (indeterminate) */
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
  /** View PO handler */
  onViewPO: (id: string) => void;
  /** Edit PO handler */
  onEditPO: (id: string) => void;
  /** Delete PO handler */
  onDeletePO: (id: string) => void;
  /** Receive goods handler */
  onReceivePO: (id: string) => void;
  /** Pagination */
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
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
                <Skeleton className="h-4 w-24 mb-1" />
                <Skeleton className="h-3 w-32" />
              </div>
              <Skeleton className="h-6 w-20" />
            </div>
            <div className="flex justify-between mt-3">
              <Skeleton className="h-3 w-28" />
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
          { skeleton: { type: "text", width: "w-24" } },
          { skeleton: { type: "text", width: "w-32" } },
          { skeleton: { type: "badge", width: "w-20" } },
          { skeleton: { type: "text", width: "w-20" } },
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
        Showing {start} to {end} of {total} purchase orders
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
 * Unified purchase orders list presenter with responsive table/cards.
 */
export const POListPresenter = memo(function POListPresenter({
  orders,
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
  onViewPO,
  onEditPO,
  onDeletePO,
  onReceivePO,
  page,
  pageSize,
  total,
  onPageChange,
  className,
}: POListPresenterProps) {
  // Error state
  if (error) {
    return (
      <DataTableEmpty
        variant="error"
        title="Failed to load purchase orders"
        description={error.message ?? "An unexpected error occurred"}
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

  // Empty state
  if (orders.length === 0) {
    return (
      <DataTableEmpty
        variant="no-results"
        icon={Truck}
        title="No purchase orders found"
        description="Create your first purchase order to start tracking supplier orders."
        className={className}
      />
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Desktop Table */}
      <div className="hidden md:block">
        <POTablePresenter
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
          onViewPO={onViewPO}
          onEditPO={onEditPO}
          onDeletePO={onDeletePO}
          onReceivePO={onReceivePO}
        />
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden">
        <POMobileCards
          orders={orders}
          onViewPO={onViewPO}
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

POListPresenter.displayName = "POListPresenter";
