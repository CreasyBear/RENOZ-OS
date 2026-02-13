/**
 * Kanban Board
 *
 * Main board component with DnD context and column layout.
 * Supports multiple rendering strategies based on item count.
 *
 * @see docs/design-system/KANBAN-STANDARDS.md
 */

import { memo, useState, useCallback, useMemo } from "react";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { cn } from "@/lib/utils";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import {
  KanbanColumnAuto,
  VIRTUALIZATION_THRESHOLD,
  SUMMARY_THRESHOLD,
  type KanbanColumnAutoProps,
} from "./kanban-column";
import type { KanbanBoardProps, KanbanColumn, KanbanMoveEvent } from "./types";

// ============================================================================
// BOARD COMPONENT
// ============================================================================

export interface KanbanBoardComponentProps<TItem, TStatus extends string = string>
  extends Omit<KanbanBoardProps<TItem, TStatus>, "onMove"> {
  /** Called when item is moved - can return false to cancel */
  onMove: (event: KanbanMoveEvent<TStatus>) => void | Promise<void> | boolean | Promise<boolean>;
  /** Render overlay card during drag */
  renderOverlay?: (item: TItem) => React.ReactNode;
  /** Compute summary for summary mode columns */
  computeSummary?: KanbanColumnAutoProps<TItem>["computeSummary"];
  /** Called when user clicks "View All" in summary mode */
  onViewAllColumn?: (column: KanbanColumn<TStatus>) => void;
  /** Force columns into summary mode (user preference) */
  summaryModeColumns?: Set<TStatus>;
  /** Virtualization threshold override */
  virtualizationThreshold?: number;
  /** Summary threshold override */
  summaryThreshold?: number;
  /** Board height (default: calc(100vh - 200px)) */
  height?: string;
  /** Board class name */
  className?: string;
}

export const KanbanBoard = memo(function KanbanBoard<TItem, TStatus extends string = string>({
  columns,
  items,
  getColumnKey,
  getItemKey,
  onMove,
  renderCard,
  renderOverlay,
  onCardClick: _onCardClick, // Card click is handled via renderCard prop
  columnActions,
  onAddItem,
  boardActions, // Reserved for future board-level toolbar
  computeSummary,
  onViewAllColumn,
  summaryModeColumns,
  virtualizationThreshold = VIRTUALIZATION_THRESHOLD,
  summaryThreshold = SUMMARY_THRESHOLD,
  isLoading,
  emptyMessage = "No items",
  reducedMotion,
  height = "calc(100vh - 200px)",
  className,
}: KanbanBoardComponentProps<TItem, TStatus>) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

  // Configure sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px movement before drag starts
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Group items by column
  const itemsByColumn = useMemo(() => {
    const grouped: Record<string, TItem[]> = {};

    // Initialize all columns
    for (const column of columns) {
      grouped[column.key] = [];
    }

    // Group items
    for (const item of items) {
      const columnKey = getColumnKey(item);
      if (grouped[columnKey]) {
        grouped[columnKey].push(item);
      } else {
        // Item has unknown status, put in first column
        const firstColumn = columns[0];
        if (firstColumn) {
          grouped[firstColumn.key].push(item);
        }
      }
    }

    return grouped as Record<TStatus, TItem[]>;
  }, [items, columns, getColumnKey]);

  // Get active item for drag overlay
  const activeItem = useMemo(() => {
    if (!activeId) return null;
    return items.find((item) => getItemKey(item) === activeId) ?? null;
  }, [activeId, items, getItemKey]);

  // Handlers
  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  }, []);

  const handleDragOver = useCallback((event: DragOverEvent) => {
    setOverId((event.over?.id as string) ?? null);
  }, []);

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;

      setActiveId(null);
      setOverId(null);

      if (!over) return;

      const itemId = active.id as string;
      const item = items.find((i) => getItemKey(i) === itemId);
      if (!item) return;

      const fromColumn = getColumnKey(item);

      // Determine target column
      let toColumn: TStatus | null = null;

      // Check if dropped on a column
      const targetColumn = columns.find((c) => c.key === over.id);
      if (targetColumn) {
        toColumn = targetColumn.key;
      } else {
        // Dropped on another item - get that item's column
        const targetItem = items.find((i) => getItemKey(i) === over.id);
        if (targetItem) {
          toColumn = getColumnKey(targetItem);
        }
      }

      if (!toColumn || toColumn === fromColumn) return;

      // Check if column accepts drops
      const targetColumnDef = columns.find((c) => c.key === toColumn);
      if (targetColumnDef?.acceptsDrop === false) return;

      // Check if source column allows drag
      const sourceColumnDef = columns.find((c) => c.key === fromColumn);
      if (sourceColumnDef?.allowsDrag === false) return;

      // Call onMove
      await onMove({
        itemId,
        fromColumn,
        toColumn,
        index: 0, // TODO: Calculate actual index if needed
      });
    },
    [items, columns, getItemKey, getColumnKey, onMove]
  );

  // Check if reduced motion is preferred
  const prefersReducedMotion = useMemo(() => {
    if (reducedMotion !== undefined) return reducedMotion;
    if (typeof window === "undefined") return false;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, [reducedMotion]);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <ScrollArea className="w-full h-full min-w-0" style={{ height }}>
        {boardActions ? (
          <div className="flex items-center justify-end gap-2 px-4 pb-2">{boardActions}</div>
        ) : null}
        <div
          className={cn(
            // Square UI: gap-5 for better column separation
            // h-full ensures columns can inherit height from ScrollArea
            "flex gap-5 p-4 min-w-max h-full",
            isLoading && "opacity-50 pointer-events-none",
            className
          )}
          role="region"
          aria-label="Kanban board"
        >
          {columns.map((column) => {
            const columnItems = itemsByColumn[column.key] ?? [];
            const isForcedSummary = summaryModeColumns?.has(column.key);

            return (
              <KanbanColumnAuto
                key={column.key}
                column={column}
                items={columnItems}
                getItemKey={getItemKey}
                renderCard={(item) => renderCard(item)}
                isOver={overId === column.key}
                onAddItem={
                  onAddItem ? () => onAddItem(column) : undefined
                }
                actions={columnActions?.(column)}
                emptyMessage={emptyMessage}
                virtualizationThreshold={virtualizationThreshold}
                summaryThreshold={summaryThreshold}
                computeSummary={computeSummary}
                onViewAll={
                  onViewAllColumn
                    ? () => onViewAllColumn(column)
                    : undefined
                }
                forceMode={isForcedSummary ? "summary" : undefined}
              />
            );
          })}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

      {/* Drag Overlay */}
      <DragOverlay>
        {activeItem ? (
          <div className={cn(!prefersReducedMotion && "rotate-3", "opacity-90")}>
            {renderOverlay ? renderOverlay(activeItem) : renderCard(activeItem)}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}) as <TItem, TStatus extends string = string>(
  props: KanbanBoardComponentProps<TItem, TStatus>
) => React.ReactElement;

// ============================================================================
// COMPOUND EXPORTS
// ============================================================================

export { KanbanColumnAuto, KanbanColumn, KanbanColumnVirtualized, KanbanColumnSummary } from "./kanban-column";
