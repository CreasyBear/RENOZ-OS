/**
 * Kanban Board Enhanced
 *
 * Full-featured kanban board with:
 * - Optimistic updates for instant feedback
 * - Column drag reordering
 * - Keyboard navigation (j/k, Cmd+arrows)
 * - Multi-select with Shift/Cmd+Click
 * - Framer Motion animations
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
import {
  SortableContext,
  horizontalListSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import {
  KanbanColumnAuto,
  VIRTUALIZATION_THRESHOLD,
  SUMMARY_THRESHOLD,
  type KanbanColumnAutoProps,
} from "./kanban-column";
import {
  SelectionProvider,
  KeyboardNavigationProvider,
  useOptimisticMoves,
} from "./kanban-context";
import { columnSpring } from "./kanban-animations";
import type { KanbanBoardProps, KanbanColumn, KanbanMoveEvent } from "./types";

// ============================================================================
// SORTABLE COLUMN WRAPPER
// ============================================================================

interface SortableColumnWrapperProps {
  id: string;
  children: React.ReactNode;
  disabled?: boolean;
}

const SortableColumnWrapper = memo(function SortableColumnWrapper({
  id,
  children,
  disabled = false,
}: SortableColumnWrapperProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, disabled });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      layout
      transition={columnSpring}
      className={cn(isDragging && "opacity-50 z-50")}
      {...attributes}
      {...listeners}
    >
      {children}
    </motion.div>
  );
});

// ============================================================================
// ENHANCED BOARD COMPONENT
// ============================================================================

export interface KanbanBoardEnhancedProps<TItem, TStatus extends string = string>
  extends Omit<KanbanBoardProps<TItem, TStatus>, "onMove"> {
  /** Called when item is moved - can return false to cancel */
  onMove: (event: KanbanMoveEvent<TStatus>) => void | Promise<void> | boolean | Promise<boolean>;
  /** Called when columns are reordered */
  onColumnReorder?: (columnKeys: TStatus[]) => void;
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
  /** Enable column reordering */
  enableColumnReorder?: boolean;
  /** Enable keyboard navigation */
  enableKeyboardNav?: boolean;
  /** Enable multi-select */
  enableMultiSelect?: boolean;
  /** Called when selection changes */
  onSelectionChange?: (selectedIds: Set<string>) => void;
  /** Board class name */
  className?: string;
}

export const KanbanBoardEnhanced = memo(function KanbanBoardEnhanced<
  TItem,
  TStatus extends string = string
>({
  columns: initialColumns,
  items,
  getColumnKey,
  getItemKey,
  onMove,
  onColumnReorder,
  renderCard,
  renderOverlay,
  onCardClick: _onCardClick,
  columnActions,
  boardActions: _boardActions,
  computeSummary,
  onViewAllColumn,
  summaryModeColumns,
  virtualizationThreshold = VIRTUALIZATION_THRESHOLD,
  summaryThreshold = SUMMARY_THRESHOLD,
  isLoading,
  emptyMessage = "No items",
  reducedMotion,
  height = "calc(100vh - 200px)",
  enableColumnReorder = false,
  enableKeyboardNav = true,
  enableMultiSelect = false,
  onSelectionChange,
  className,
}: KanbanBoardEnhancedProps<TItem, TStatus>) {
  // Column order state (for reordering)
  const [columnOrder, setColumnOrder] = useState<TStatus[]>(() =>
    initialColumns.map((c) => c.key)
  );

  // Ordered columns based on current order
  const columns = useMemo(() => {
    const columnMap = new Map(initialColumns.map((c) => [c.key, c]));
    return columnOrder
      .map((key) => columnMap.get(key))
      .filter((c): c is KanbanColumn<TStatus> => c !== undefined);
  }, [initialColumns, columnOrder]);

  // Optimistic move tracking
  const { addPendingMove, removePendingMove, getPendingColumn, hasPendingMove } =
    useOptimisticMoves<TStatus>();

  // Track active drag
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [activeType, setActiveType] = useState<"item" | "column" | null>(null);

  // Configure sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Group items by column (with optimistic updates)
  const itemsByColumn = useMemo(() => {
    const grouped: Record<string, TItem[]> = {};

    for (const column of columns) {
      grouped[column.key] = [];
    }

    for (const item of items) {
      const itemId = getItemKey(item);
      // Check for optimistic move
      const pendingColumn = getPendingColumn(itemId);
      const columnKey = pendingColumn ?? getColumnKey(item);

      if (grouped[columnKey]) {
        grouped[columnKey].push(item);
      } else {
        const firstColumn = columns[0];
        if (firstColumn) {
          grouped[firstColumn.key].push(item);
        }
      }
    }

    return grouped as Record<TStatus, TItem[]>;
  }, [items, columns, getColumnKey, getItemKey, getPendingColumn]);

  // All item IDs (for selection/navigation)
  const allItemIds = useMemo(
    () => items.map((item) => getItemKey(item)),
    [items, getItemKey]
  );

  // Get active item for drag overlay
  const activeItem = useMemo(() => {
    if (!activeId || activeType !== "item") return null;
    return items.find((item) => getItemKey(item) === activeId) ?? null;
  }, [activeId, activeType, items, getItemKey]);

  // Get active column for drag overlay
  const activeColumn = useMemo(() => {
    if (!activeId || activeType !== "column") return null;
    return columns.find((col) => col.key === activeId) ?? null;
  }, [activeId, activeType, columns]);

  // Handlers
  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const id = event.active.id as string;
      setActiveId(id);

      // Determine if dragging item or column
      if (columns.some((c) => c.key === id)) {
        setActiveType("column");
      } else {
        setActiveType("item");
      }
    },
    [columns]
  );

  const handleDragOver = useCallback((event: DragOverEvent) => {
    setOverId((event.over?.id as string) ?? null);
  }, []);

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;

      setActiveId(null);
      setOverId(null);
      setActiveType(null);

      if (!over) return;

      // Handle column reorder
      if (activeType === "column" && enableColumnReorder) {
        const oldIndex = columnOrder.indexOf(active.id as TStatus);
        const newIndex = columnOrder.indexOf(over.id as TStatus);

        if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
          const newOrder = [...columnOrder];
          newOrder.splice(oldIndex, 1);
          newOrder.splice(newIndex, 0, active.id as TStatus);
          setColumnOrder(newOrder);
          onColumnReorder?.(newOrder);
        }
        return;
      }

      // Handle item move
      if (activeType === "item") {
        const itemId = active.id as string;
        const item = items.find((i) => getItemKey(i) === itemId);
        if (!item) return;

        const fromColumn = getColumnKey(item);

        // Determine target column
        let toColumn: TStatus | null = null;

        const targetColumn = columns.find((c) => c.key === over.id);
        if (targetColumn) {
          toColumn = targetColumn.key;
        } else {
          const targetItem = items.find((i) => getItemKey(i) === over.id);
          if (targetItem) {
            toColumn = getColumnKey(targetItem);
          }
        }

        if (!toColumn || toColumn === fromColumn) return;

        // Check constraints
        const targetColumnDef = columns.find((c) => c.key === toColumn);
        if (targetColumnDef?.acceptsDrop === false) return;

        const sourceColumnDef = columns.find((c) => c.key === fromColumn);
        if (sourceColumnDef?.allowsDrag === false) return;

        // Optimistic update
        addPendingMove({ itemId, fromColumn, toColumn });

        try {
          const result = await onMove({
            itemId,
            fromColumn,
            toColumn,
            index: 0,
          });

          // If move was cancelled, remove optimistic update
          if (result === false) {
            removePendingMove(itemId);
          }
        } catch {
          // Revert on error
          removePendingMove(itemId);
        } finally {
          // Clear optimistic state after a delay (let server state catch up)
          setTimeout(() => {
            removePendingMove(itemId);
          }, 500);
        }
      }
    },
    [
      activeType,
      enableColumnReorder,
      columnOrder,
      onColumnReorder,
      items,
      columns,
      getItemKey,
      getColumnKey,
      addPendingMove,
      removePendingMove,
      onMove,
    ]
  );

  // Keyboard move handler for navigation context
  const handleKeyboardMove = useCallback(
    (itemId: string, toColumn: string) => {
      const item = items.find((i) => getItemKey(i) === itemId);
      if (!item) return;

      const fromColumn = getColumnKey(item);
      if (fromColumn === toColumn) return;

      onMove({
        itemId,
        fromColumn,
        toColumn: toColumn as TStatus,
        index: 0,
      });
    },
    [items, getItemKey, getColumnKey, onMove]
  );

  // Check if reduced motion is preferred
  const prefersReducedMotion = useMemo(() => {
    if (reducedMotion !== undefined) return reducedMotion;
    if (typeof window === "undefined") return false;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, [reducedMotion]);

  // Render the board content
  const boardContent = (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <ScrollArea className="w-full" style={{ height }}>
        <SortableContext
          items={columnOrder}
          strategy={horizontalListSortingStrategy}
          disabled={!enableColumnReorder}
        >
          <div
            className={cn(
              "flex gap-4 p-4 min-w-max",
              isLoading && "opacity-50 pointer-events-none",
              className
            )}
            role="region"
            aria-label="Kanban board"
          >
            <AnimatePresence mode="popLayout">
              {columns.map((column) => {
                const columnItems = itemsByColumn[column.key] ?? [];
                const isForcedSummary = summaryModeColumns?.has(column.key);

                const columnElement = (
                  <KanbanColumnAuto
                    key={column.key}
                    column={column}
                    items={columnItems}
                    getItemKey={getItemKey}
                    renderCard={(item) => {
                      const itemId = getItemKey(item);
                      const isPending = hasPendingMove(itemId);
                      return (
                        <div className={cn(isPending && "opacity-70")}>
                          {renderCard(item)}
                        </div>
                      );
                    }}
                    isOver={overId === column.key}
                    actions={columnActions?.(column)}
                    emptyMessage={emptyMessage}
                    virtualizationThreshold={virtualizationThreshold}
                    summaryThreshold={summaryThreshold}
                    computeSummary={computeSummary}
                    onViewAll={
                      onViewAllColumn ? () => onViewAllColumn(column) : undefined
                    }
                    forceMode={isForcedSummary ? "summary" : undefined}
                  />
                );

                if (enableColumnReorder) {
                  return (
                    <SortableColumnWrapper
                      key={column.key}
                      id={column.key}
                      disabled={!enableColumnReorder}
                    >
                      {columnElement}
                    </SortableColumnWrapper>
                  );
                }

                return (
                  <motion.div
                    key={column.key}
                    layout={!prefersReducedMotion}
                    transition={columnSpring}
                  >
                    {columnElement}
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </SortableContext>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

      {/* Drag Overlay */}
      <DragOverlay>
        {activeItem ? (
          <motion.div
            initial={{ scale: 1, rotate: 0 }}
            animate={{ scale: 1.02, rotate: prefersReducedMotion ? 0 : 3 }}
            className="opacity-90"
          >
            {renderOverlay ? renderOverlay(activeItem) : renderCard(activeItem)}
          </motion.div>
        ) : activeColumn ? (
          <motion.div
            initial={{ scale: 1 }}
            animate={{ scale: 1.02 }}
            className="opacity-70"
          >
            <div className="w-72 lg:w-80 h-48 bg-muted/50 rounded-lg border-2 border-dashed border-primary/50 flex items-center justify-center">
              <span className="text-sm font-medium text-muted-foreground">
                {activeColumn.title}
              </span>
            </div>
          </motion.div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );

  // Wrap with contexts based on features
  let wrappedContent = boardContent;

  if (enableKeyboardNav) {
    wrappedContent = (
      <KeyboardNavigationProvider
        itemIds={allItemIds}
        columnKeys={columnOrder}
        getItemColumn={(id) => {
          const item = items.find((i) => getItemKey(i) === id);
          return item ? getColumnKey(item) : columnOrder[0];
        }}
        onMoveItem={handleKeyboardMove}
        enabled={enableKeyboardNav}
      >
        {wrappedContent}
      </KeyboardNavigationProvider>
    );
  }

  if (enableMultiSelect) {
    wrappedContent = (
      <SelectionProvider itemIds={allItemIds} onSelectionChange={onSelectionChange}>
        {wrappedContent}
      </SelectionProvider>
    );
  }

  return wrappedContent;
}) as <TItem, TStatus extends string = string>(
  props: KanbanBoardEnhancedProps<TItem, TStatus>
) => React.ReactElement;
