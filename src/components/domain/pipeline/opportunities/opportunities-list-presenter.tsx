/**
 * Opportunities List Presenter
 *
 * Unified presenter combining desktop table and mobile cards
 * with responsive switching, loading states, and pagination.
 */

import { memo } from "react";
import { Target, ChevronLeft, ChevronRight } from "lucide-react";
import {
  DataTableSkeleton,
  DataTableEmpty,
} from "@/components/shared/data-table";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { FormatAmount } from "@/components/shared/format";
import { cn } from "@/lib/utils";
import { OpportunitiesTablePresenter } from "./opportunities-table-presenter";
import { OpportunitiesMobileCards } from "./opportunities-mobile-cards";
import type { OpportunityTableItem } from "@/lib/schemas/pipeline";
import type { OpportunityStage } from "@/lib/schemas/pipeline";

export interface OpportunitiesListPresenterProps {
  /** Opportunities to display */
  opportunities: OpportunityTableItem[];
  /** Loading state */
  isLoading: boolean;
  /** Error state */
  error: Error | null;
  /** Set of selected opportunity IDs */
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
  /** View opportunity handler */
  onViewOpportunity: (id: string) => void;
  /** Edit opportunity handler */
  onEditOpportunity: (id: string) => void;
  /** Change stage handler */
  onChangeStage: (id: string, stage: OpportunityStage) => void;
  /** Delete opportunity handler */
  onDeleteOpportunity?: (id: string) => void;
  /** Pagination */
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  /** Total value of all opportunities */
  totalValue?: number;
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
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-5 w-20 rounded-full" />
            </div>
            <Skeleton className="h-3 w-24 mb-2" />
            <div className="flex justify-between">
              <Skeleton className="h-4 w-20" />
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
          { skeleton: { type: "avatar-text", width: "w-40" } },
          { skeleton: { type: "badge", width: "w-20" } },
          { skeleton: { type: "text", width: "w-20" } },
          { skeleton: { type: "text", width: "w-12" } },
          { skeleton: { type: "text", width: "w-24" } },
          { skeleton: { type: "icon-text", width: "w-12" } },
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
        Showing {start} to {end} of {total} opportunities
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
 * Footer summary showing total count and value
 */
function FooterSummary({
  showing,
  total,
  totalValue,
}: {
  showing: number;
  total: number;
  totalValue?: number;
}) {
  return (
    <div className="flex items-center justify-between text-sm text-muted-foreground px-2">
      <span>
        Showing {showing} of {total} opportunities
      </span>
      {totalValue !== undefined && (
        <span>
          Total Value:{" "}
          <span className="font-medium">
            <FormatAmount amount={totalValue} />
          </span>
        </span>
      )}
    </div>
  );
}

/**
 * Unified opportunities list presenter with responsive table/cards.
 */
export const OpportunitiesListPresenter = memo(function OpportunitiesListPresenter({
  opportunities,
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
  onViewOpportunity,
  onEditOpportunity,
  onChangeStage,
  onDeleteOpportunity,
  page,
  pageSize,
  total,
  onPageChange,
  totalValue,
  className,
}: OpportunitiesListPresenterProps) {
  // Error state
  if (error) {
    return (
      <DataTableEmpty
        variant="error"
        title="Failed to load opportunities"
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
  if (opportunities.length === 0) {
    return (
      <DataTableEmpty
        variant="no-results"
        icon={Target}
        title="No opportunities found"
        description="No opportunities match the current filters"
        className={className}
      />
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Desktop Table */}
      <div className="hidden md:block">
        <OpportunitiesTablePresenter
          opportunities={opportunities}
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
          onViewOpportunity={onViewOpportunity}
          onEditOpportunity={onEditOpportunity}
          onChangeStage={onChangeStage}
          onDeleteOpportunity={onDeleteOpportunity}
          onRowClick={onEditOpportunity}
        />
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden">
        <OpportunitiesMobileCards
          opportunities={opportunities}
          selectedIds={selectedIds}
          onSelect={onSelect}
          onViewOpportunity={onViewOpportunity}
        />
      </div>

      {/* Footer Summary (when not using pagination) */}
      {total <= pageSize && (
        <FooterSummary
          showing={opportunities.length}
          total={total}
          totalValue={totalValue}
        />
      )}

      {/* Pagination (when more than one page) */}
      {total > pageSize && (
        <Pagination
          page={page}
          pageSize={pageSize}
          total={total}
          onPageChange={onPageChange}
        />
      )}
    </div>
  );
});

OpportunitiesListPresenter.displayName = "OpportunitiesListPresenter";
