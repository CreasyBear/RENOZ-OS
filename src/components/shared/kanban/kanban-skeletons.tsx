/**
 * Kanban Skeletons
 *
 * Loading state components for kanban boards.
 *
 * @see docs/design-system/KANBAN-STANDARDS.md
 */

import { memo } from "react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

// ============================================================================
// CARD SKELETON
// ============================================================================

export interface KanbanCardSkeletonProps {
  /** Show footer section */
  showFooter?: boolean;
  /** Show tags */
  showTags?: boolean;
  className?: string;
}

export const KanbanCardSkeleton = memo(function KanbanCardSkeleton({
  showFooter = true,
  showTags = true,
  className,
}: KanbanCardSkeletonProps) {
  return (
    <div
      className={cn(
        // Square UI: rounded-2xl, border-border/70
        "bg-background rounded-2xl border border-border/70",
        className
      )}
    >
      {/* Content section - Square UI p-4 */}
      <div className="p-4 space-y-4">
        {/* Header row - priority badge placeholder */}
        <div className="flex items-start justify-between">
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="size-5 rounded" />
        </div>

        {/* Title */}
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-3 w-3/4" />
        </div>

        {/* Tags */}
        {showTags && (
          <div className="flex gap-1.5">
            <Skeleton className="h-5 w-14 rounded-full" />
            <Skeleton className="h-5 w-18 rounded-full" />
          </div>
        )}
      </div>

      {/* Footer section - Square UI border-t border-border/60 */}
      {showFooter && (
        <div className="px-4 py-3 border-t border-border/60">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Skeleton className="h-4 w-14" />
              <Skeleton className="h-4 w-8" />
            </div>
            <div className="flex -space-x-1.5">
              <Skeleton className="size-6 rounded-full border-2 border-background" />
              <Skeleton className="size-6 rounded-full border-2 border-background" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

// ============================================================================
// COLUMN SKELETON
// ============================================================================

export interface KanbanColumnSkeletonProps {
  /** Number of cards to show */
  cardCount?: number;
  /** Show cards with full details */
  fullCards?: boolean;
  className?: string;
}

export const KanbanColumnSkeleton = memo(function KanbanColumnSkeleton({
  cardCount = 3,
  fullCards = true,
  className,
}: KanbanColumnSkeletonProps) {
  return (
    <div
      className={cn(
        // Square UI: rounded-2xl, bg-muted/70, border-border/50
        "flex flex-col w-[300px] min-w-[300px] lg:w-[340px] lg:min-w-[340px]",
        "bg-muted/70 dark:bg-muted/50 rounded-2xl border border-border/50",
        className
      )}
    >
      {/* Header skeleton - Square UI style */}
      <div className="flex items-center justify-between px-3 py-2.5 rounded-t-2xl">
        <div className="flex items-center gap-2">
          {/* Status pill placeholder */}
          <Skeleton className="h-7 w-24 rounded-full" />
          {/* Count badge */}
          <Skeleton className="size-7 rounded-full" />
        </div>
        <div className="flex gap-1">
          <Skeleton className="h-7 w-7 rounded" />
        </div>
      </div>

      {/* Cards skeleton - Square UI spacing */}
      <div className="p-2 space-y-3">
        {Array.from({ length: cardCount }).map((_, i) => (
          <KanbanCardSkeleton
            key={i}
            showFooter={fullCards}
            showTags={fullCards && i === 0}
          />
        ))}
      </div>
    </div>
  );
});

// ============================================================================
// BOARD SKELETON
// ============================================================================

export interface KanbanBoardSkeletonProps {
  /** Number of columns to show */
  columnCount?: number;
  /** Cards per column (can be array for varying counts) */
  cardsPerColumn?: number | number[];
  /** Board height */
  height?: string;
  className?: string;
}

export const KanbanBoardSkeleton = memo(function KanbanBoardSkeleton({
  columnCount = 4,
  cardsPerColumn = [3, 4, 2, 3],
  height = "calc(100vh - 200px)",
  className,
}: KanbanBoardSkeletonProps) {
  const cardCounts = Array.isArray(cardsPerColumn)
    ? cardsPerColumn
    : Array(columnCount).fill(cardsPerColumn);

  return (
    <div
      className={cn("flex gap-5 p-4 overflow-x-auto", className)}
      style={{ height }}
    >
      {Array.from({ length: columnCount }).map((_, i) => (
        <KanbanColumnSkeleton
          key={i}
          cardCount={cardCounts[i % cardCounts.length]}
          fullCards={i < 2}
        />
      ))}
    </div>
  );
});

// ============================================================================
// TOOLBAR SKELETON
// ============================================================================

export interface KanbanToolbarSkeletonProps {
  showViewToggle?: boolean;
  showFilters?: boolean;
  showAddButton?: boolean;
  className?: string;
}

export const KanbanToolbarSkeleton = memo(function KanbanToolbarSkeleton({
  showViewToggle = true,
  showFilters = true,
  showAddButton = true,
  className,
}: KanbanToolbarSkeletonProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-between px-4 py-2 border-b gap-4",
        className
      )}
    >
      <div className="flex items-center gap-2">
        {showViewToggle && <Skeleton className="h-9 w-20 rounded-md" />}
        {showFilters && <Skeleton className="h-9 w-24 rounded-md" />}
      </div>

      <div className="flex items-center gap-2">
        {showAddButton && <Skeleton className="h-9 w-28 rounded-md" />}
      </div>
    </div>
  );
});

// ============================================================================
// FULL PAGE SKELETON
// ============================================================================

export interface KanbanPageSkeletonProps {
  /** Show toolbar */
  showToolbar?: boolean;
  /** Number of columns */
  columnCount?: number;
  /** Board height */
  height?: string;
  className?: string;
}

export const KanbanPageSkeleton = memo(function KanbanPageSkeleton({
  showToolbar = true,
  columnCount = 4,
  height = "calc(100vh - 200px)",
  className,
}: KanbanPageSkeletonProps) {
  return (
    <div className={cn("flex flex-col", className)}>
      {showToolbar && <KanbanToolbarSkeleton />}
      <KanbanBoardSkeleton columnCount={columnCount} height={height} />
    </div>
  );
});
