/* eslint-disable react-refresh/only-export-components -- Component exports component + helpers */
/**
 * Kanban Column
 *
 * Droppable column component with automatic rendering strategy:
 * - Standard: < 30 items (simple list)
 * - Virtualized: 30-50 items (virtual scrolling)
 * - Summary: > 50 items (collapsed aggregation view)
 *
 * @see docs/design-system/KANBAN-STANDARDS.md
 */

import { memo, useRef, useMemo } from "react";
import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Plus, ChevronDown, ChevronRight, Eye } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { KanbanColumn as KanbanColumnType } from "./types";

// ============================================================================
// THRESHOLDS
// ============================================================================

/** Above this count, use virtual scrolling */
export const VIRTUALIZATION_THRESHOLD = 30;

/** Above this count, show summary mode by default */
export const SUMMARY_THRESHOLD = 50;

/** Estimated card height for virtualization */
const ESTIMATED_CARD_HEIGHT = 140;

// ============================================================================
// DROP PLACEHOLDER
// ============================================================================

/** Visual indicator for where a card will be dropped */
const DropPlaceholder = memo(function DropPlaceholder() {
  return (
    <div className="h-[100px] border-2 border-dashed border-primary/50 rounded-lg bg-primary/5 animate-pulse flex items-center justify-center">
      <span className="text-xs text-primary/60 font-medium">Drop here</span>
    </div>
  );
});

// ============================================================================
// COLUMN HEADER
// ============================================================================

export interface KanbanColumnHeaderProps {
  column: KanbanColumnType;
  itemCount: number;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  onAddItem?: () => void;
  actions?: React.ReactNode;
}

export const KanbanColumnHeader = memo(function KanbanColumnHeader({
  column,
  itemCount,
  isCollapsed,
  onToggleCollapse,
  onAddItem,
  actions,
}: KanbanColumnHeaderProps) {
  const StatusIcon = column.icon;
  const isOverWipLimit = column.wipLimit && itemCount > column.wipLimit;

  return (
    <div
      className={cn(
        // Square UI: cleaner header, no border-b, relies on column bg contrast
        "flex items-center justify-between px-3 py-2.5 rounded-t-2xl",
        isOverWipLimit && "bg-amber-50/50 dark:bg-amber-950/20"
      )}
    >
      <div className="flex items-center gap-2 min-w-0">
        {/* Collapse toggle */}
        {onToggleCollapse && (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 shrink-0 hover:bg-background/50"
            onClick={onToggleCollapse}
            aria-label={isCollapsed ? "Expand column" : "Collapse column"}
          >
            {isCollapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        )}

        {/* Status pill with color - Square UI style */}
        <div
          className={cn(
            "flex items-center gap-1.5 px-2.5 py-1.5 rounded-full",
            "text-xs font-medium"
          )}
          style={column.color ? {
            backgroundColor: `${column.color}20`,
            color: column.color
          } : undefined}
        >
          {StatusIcon && <StatusIcon className="size-4" />}
          <span>{column.title}</span>
        </div>

        {/* Count badge - Square UI style */}
        <Badge
          variant="secondary"
          className={cn(
            "size-7 p-0 rounded-full flex items-center justify-center",
            "text-xs font-medium bg-background",
            isOverWipLimit && "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200"
          )}
        >
          {itemCount}
        </Badge>
        {column.wipLimit && (
          <span className="text-[10px] text-muted-foreground">
            /{column.wipLimit}
          </span>
        )}
      </div>

      <div className="flex items-center gap-1 shrink-0">
        {/* Aggregate value */}
        {column.aggregate && (
          <span className="text-xs text-muted-foreground mr-2">
            {column.aggregate.value}
          </span>
        )}

        {/* Add button - cleaner */}
        {onAddItem && (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 hover:bg-background/50"
            onClick={onAddItem}
            aria-label={`Add item to ${column.title}`}
          >
            <Plus className="h-4 w-4" />
          </Button>
        )}

        {/* Custom actions */}
        {actions}
      </div>
    </div>
  );
});

// ============================================================================
// STANDARD COLUMN (< 30 items)
// ============================================================================

export interface KanbanColumnProps<TItem> {
  column: KanbanColumnType;
  items: TItem[];
  getItemKey: (item: TItem) => string;
  renderCard: (item: TItem) => React.ReactNode;
  isOver?: boolean;
  onAddItem?: () => void;
  actions?: React.ReactNode;
  emptyMessage?: string;
  className?: string;
}

export const KanbanColumn = memo(function KanbanColumn<TItem>({
  column,
  items,
  getItemKey,
  renderCard,
  isOver,
  onAddItem,
  actions,
  emptyMessage = "No items",
  className,
}: KanbanColumnProps<TItem>) {
  const { setNodeRef } = useDroppable({
    id: column.key,
    disabled: column.acceptsDrop === false,
  });

  const itemIds = useMemo(
    () => items.map((item) => getItemKey(item)),
    [items, getItemKey]
  );

  return (
    <div
      className={cn(
        // Square UI: rounded-2xl, softer bg, subtle border
        // h-full ensures column stretches to board height
        "flex flex-col h-full w-[300px] min-w-[300px] lg:w-[340px] lg:min-w-[340px]",
        "bg-muted/70 dark:bg-muted/50 rounded-2xl border border-border/50",
        isOver && "ring-2 ring-primary/50 ring-offset-2 ring-offset-background",
        className
      )}
      role="region"
      aria-label={column.title}
    >
      <KanbanColumnHeader
        column={column}
        itemCount={items.length}
        onAddItem={onAddItem}
        actions={actions}
      />

      <div ref={setNodeRef} className="flex-1 min-h-0 overflow-hidden">
        <ScrollArea className="h-full">
          <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
            <div className="p-2 space-y-3 min-h-[200px]">
              {/* Drop placeholder when hovering over empty column */}
              {isOver && items.length === 0 && <DropPlaceholder />}

              {items.length === 0 && !isOver ? (
                <div className="flex items-center justify-center h-24 border-2 border-dashed border-border/50 rounded-xl text-muted-foreground text-xs">
                  {emptyMessage}
                </div>
              ) : (
                <>
                  {items.map((item) => (
                    <div key={getItemKey(item)}>{renderCard(item)}</div>
                  ))}
                  {/* Drop placeholder at end when hovering with items */}
                  {isOver && items.length > 0 && <DropPlaceholder />}
                </>
              )}
            </div>
          </SortableContext>
        </ScrollArea>
      </div>
    </div>
  );
}) as <TItem>(props: KanbanColumnProps<TItem>) => React.ReactElement;

// ============================================================================
// VIRTUALIZED COLUMN (30-50 items)
// ============================================================================

export interface KanbanColumnVirtualizedProps<TItem>
  extends Omit<KanbanColumnProps<TItem>, "className"> {
  /** Estimated height of each card */
  estimatedCardHeight?: number;
  /** Extra cards to render outside viewport */
  overscan?: number;
  className?: string;
}

export const KanbanColumnVirtualized = memo(function KanbanColumnVirtualized<TItem>({
  column,
  items,
  getItemKey,
  renderCard,
  isOver,
  onAddItem,
  actions,
  emptyMessage = "No items",
  estimatedCardHeight = ESTIMATED_CARD_HEIGHT,
  overscan = 5,
  className,
}: KanbanColumnVirtualizedProps<TItem>) {
  const { setNodeRef } = useDroppable({
    id: column.key,
    disabled: column.acceptsDrop === false,
  });

  const parentRef = useRef<HTMLDivElement>(null);

  // eslint-disable-next-line react-hooks/incompatible-library -- useVirtualizer returns functions that cannot be memoized; known TanStack Virtual limitation
  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => estimatedCardHeight,
    overscan,
  });

  const itemIds = useMemo(
    () => items.map((item) => getItemKey(item)),
    [items, getItemKey]
  );

  return (
    <div
      className={cn(
        // Square UI: same styling as standard column
        // h-full ensures column stretches to board height
        "flex flex-col h-full w-[300px] min-w-[300px] lg:w-[340px] lg:min-w-[340px]",
        "bg-muted/70 dark:bg-muted/50 rounded-2xl border border-border/50",
        isOver && "ring-2 ring-primary/50 ring-offset-2 ring-offset-background",
        className
      )}
      role="region"
      aria-label={column.title}
    >
      <KanbanColumnHeader
        column={column}
        itemCount={items.length}
        onAddItem={onAddItem}
        actions={actions}
      />

      <div ref={setNodeRef} className="flex-1 min-h-0 overflow-hidden">
        {items.length === 0 ? (
          <div className="p-2 min-h-[200px] flex items-center justify-center">
            <div className="flex items-center justify-center h-24 w-full border-2 border-dashed border-border/50 rounded-xl text-muted-foreground text-xs">
              {emptyMessage}
            </div>
          </div>
        ) : (
          <div ref={parentRef} className="h-full overflow-y-auto p-2">
            <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
              <div
                style={{
                  height: `${virtualizer.getTotalSize()}px`,
                  position: "relative",
                }}
              >
                {virtualizer.getVirtualItems().map((virtualRow) => {
                  const item = items[virtualRow.index];
                  return (
                    <div
                      key={getItemKey(item)}
                      style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        width: "100%",
                        transform: `translateY(${virtualRow.start}px)`,
                      }}
                      className="pb-3"
                    >
                      {renderCard(item)}
                    </div>
                  );
                })}
              </div>
            </SortableContext>
          </div>
        )}
      </div>
    </div>
  );
}) as <TItem>(props: KanbanColumnVirtualizedProps<TItem>) => React.ReactElement;

// ============================================================================
// SUMMARY COLUMN (> 50 items)
// ============================================================================

export interface KanbanColumnSummaryProps<TItem> {
  column: KanbanColumnType;
  items: TItem[];
  isOver?: boolean;
  onAddItem?: () => void;
  onViewAll?: () => void;
  /** Compute summary stats from items */
  computeSummary?: (items: TItem[]) => {
    totalValue?: string;
    avgValue?: string;
    oldestDate?: string;
    newestDate?: string;
    [key: string]: string | undefined;
  };
  className?: string;
}

export const KanbanColumnSummary = memo(function KanbanColumnSummary<TItem>({
  column,
  items,
  isOver,
  onAddItem,
  onViewAll,
  computeSummary,
  className,
}: KanbanColumnSummaryProps<TItem>) {
  const { setNodeRef } = useDroppable({
    id: column.key,
    disabled: column.acceptsDrop === false,
  });

  const summary = useMemo(
    () => computeSummary?.(items) ?? {},
    [items, computeSummary]
  );

  return (
    <div
      ref={setNodeRef}
      className={cn(
        // Square UI: same styling as standard column
        // h-full ensures column stretches to board height
        "flex flex-col h-full w-[300px] min-w-[300px] lg:w-[340px] lg:min-w-[340px]",
        "bg-muted/70 dark:bg-muted/50 rounded-2xl border border-border/50",
        isOver && "ring-2 ring-primary/50 ring-offset-2 ring-offset-background",
        className
      )}
      role="region"
      aria-label={column.title}
    >
      <KanbanColumnHeader
        column={column}
        itemCount={items.length}
        onAddItem={onAddItem}
      />

      <div className="flex-1 min-h-0 p-4 space-y-4 overflow-auto">
        {/* Summary stats - Square UI card style */}
        <div className="bg-background rounded-xl border border-border/60 p-4 space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-xs text-muted-foreground">Total items</span>
            <span className="text-sm font-medium">{items.length}</span>
          </div>
          {summary.totalValue && (
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground">Total value</span>
              <span className="text-sm font-medium">{summary.totalValue}</span>
            </div>
          )}
          {summary.avgValue && (
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground">Avg value</span>
              <span className="text-sm font-medium">{summary.avgValue}</span>
            </div>
          )}
          {Object.entries(summary)
            .filter(([key]) => !["totalValue", "avgValue", "oldestDate", "newestDate"].includes(key))
            .map(([key, value]) => (
              <div key={key} className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground capitalize">
                  {key.replace(/([A-Z])/g, " $1").trim()}
                </span>
                <span className="text-sm font-medium">{value}</span>
              </div>
            ))}
        </div>

        {/* View all button - Square UI style */}
        {onViewAll && (
          <Button
            variant="outline"
            className="w-full rounded-xl h-10"
            onClick={onViewAll}
          >
            <Eye className="h-4 w-4 mr-2" />
            View all {items.length} items
          </Button>
        )}

        {/* Drop placeholder - Square UI style */}
        <div className="flex items-center justify-center h-20 border-2 border-dashed border-border/50 rounded-xl text-muted-foreground text-xs">
          Drop items here
        </div>
      </div>
    </div>
  );
}) as <TItem>(props: KanbanColumnSummaryProps<TItem>) => React.ReactElement;

// ============================================================================
// AUTO COLUMN (automatically selects rendering strategy)
// ============================================================================

export interface KanbanColumnAutoProps<TItem>
  extends Omit<KanbanColumnProps<TItem>, "className"> {
  /** Override virtualization threshold */
  virtualizationThreshold?: number;
  /** Override summary threshold */
  summaryThreshold?: number;
  /** Compute summary for summary mode */
  computeSummary?: KanbanColumnSummaryProps<TItem>["computeSummary"];
  /** Called when user clicks "View All" in summary mode */
  onViewAll?: () => void;
  /** Force a specific rendering mode */
  forceMode?: "standard" | "virtualized" | "summary";
  className?: string;
}

export const KanbanColumnAuto = memo(function KanbanColumnAuto<TItem>({
  column,
  items,
  getItemKey,
  renderCard,
  isOver,
  onAddItem,
  actions,
  emptyMessage,
  virtualizationThreshold = VIRTUALIZATION_THRESHOLD,
  summaryThreshold = SUMMARY_THRESHOLD,
  computeSummary,
  onViewAll,
  forceMode,
  className,
}: KanbanColumnAutoProps<TItem>) {
  const itemCount = items.length;

  // Determine rendering mode
  const mode = useMemo(() => {
    if (forceMode) return forceMode;
    if (itemCount > summaryThreshold) return "summary";
    if (itemCount > virtualizationThreshold) return "virtualized";
    return "standard";
  }, [itemCount, forceMode, summaryThreshold, virtualizationThreshold]);

  if (mode === "summary") {
    return (
      <KanbanColumnSummary
        column={column}
        items={items}
        isOver={isOver}
        onAddItem={onAddItem}
        onViewAll={onViewAll}
        computeSummary={computeSummary}
        className={className}
      />
    );
  }

  if (mode === "virtualized") {
    return (
      <KanbanColumnVirtualized
        column={column}
        items={items}
        getItemKey={getItemKey}
        renderCard={renderCard}
        isOver={isOver}
        onAddItem={onAddItem}
        actions={actions}
        emptyMessage={emptyMessage}
        className={className}
      />
    );
  }

  return (
    <KanbanColumn
      column={column}
      items={items}
      getItemKey={getItemKey}
      renderCard={renderCard}
      isOver={isOver}
      onAddItem={onAddItem}
      actions={actions}
      emptyMessage={emptyMessage}
      className={className}
    />
  );
}) as <TItem>(props: KanbanColumnAutoProps<TItem>) => React.ReactElement;
