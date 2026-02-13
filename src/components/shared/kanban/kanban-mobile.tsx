/**
 * Kanban Mobile
 *
 * Mobile-optimized kanban components with swipeable column tabs.
 *
 * @see docs/design-system/KANBAN-STANDARDS.md
 */

import { memo, useState, useCallback, useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { KanbanColumn, KanbanMoveEvent } from "./types";

// ============================================================================
// MOBILE COLUMN TABS
// ============================================================================

export interface MobileColumnTabsProps<TStatus extends string = string> {
  columns: KanbanColumn<TStatus>[];
  activeColumn: TStatus;
  onColumnChange: (column: TStatus) => void;
  itemCounts?: Record<TStatus, number>;
  className?: string;
}

export const MobileColumnTabs = memo(function MobileColumnTabs<
  TStatus extends string = string
>({
  columns,
  activeColumn,
  onColumnChange,
  itemCounts,
  className,
}: MobileColumnTabsProps<TStatus>) {
  return (
    <Tabs
      value={activeColumn}
      onValueChange={(v) => onColumnChange(v as TStatus)}
      className={cn("w-full", className)}
    >
      <ScrollArea className="w-full">
        <TabsList className="inline-flex w-max h-auto p-1 gap-1.5 rounded-xl">
          {columns.map((column) => {
            const Icon = column.icon;
            const count = itemCounts?.[column.key] ?? 0;

            return (
              <TabsTrigger
                key={column.key}
                value={column.key}
                className="flex items-center gap-2 px-3 py-2 rounded-lg data-[state=active]:shadow-sm"
              >
                {column.color && (
                  <div
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: column.color }}
                  />
                )}
                {Icon && <Icon className="h-4 w-4 shrink-0" />}
                <span className="truncate max-w-[100px] text-xs font-medium">{column.title}</span>
                <Badge
                  variant="secondary"
                  className="size-5 p-0 rounded-full flex items-center justify-center text-[10px]"
                >
                  {count}
                </Badge>
              </TabsTrigger>
            );
          })}
        </TabsList>
      </ScrollArea>
    </Tabs>
  );
}) as <TStatus extends string = string>(
  props: MobileColumnTabsProps<TStatus>
) => React.ReactElement;

// ============================================================================
// MOBILE COLUMN NAVIGATOR (prev/next arrows)
// ============================================================================

export interface MobileColumnNavigatorProps<TStatus extends string = string> {
  columns: KanbanColumn<TStatus>[];
  activeColumn: TStatus;
  onColumnChange: (column: TStatus) => void;
  itemCounts?: Record<TStatus, number>;
  className?: string;
}

export const MobileColumnNavigator = memo(function MobileColumnNavigator<
  TStatus extends string = string
>({
  columns,
  activeColumn,
  onColumnChange,
  itemCounts,
  className,
}: MobileColumnNavigatorProps<TStatus>) {
  const currentIndex = columns.findIndex((c) => c.key === activeColumn);
  const currentColumn = columns[currentIndex];

  const canGoPrev = currentIndex > 0;
  const canGoNext = currentIndex < columns.length - 1;

  const handlePrev = () => {
    if (canGoPrev) {
      onColumnChange(columns[currentIndex - 1].key);
    }
  };

  const handleNext = () => {
    if (canGoNext) {
      onColumnChange(columns[currentIndex + 1].key);
    }
  };

  if (!currentColumn) return null;

  const Icon = currentColumn.icon;
  const count = itemCounts?.[activeColumn] ?? 0;

  return (
    <div className={cn("flex items-center justify-between gap-2", className)}>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 shrink-0"
        onClick={handlePrev}
        disabled={!canGoPrev}
        aria-label="Previous column"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>

      <div className="flex items-center gap-2 flex-1 justify-center min-w-0">
        {currentColumn.color && (
          <div
            className="w-2.5 h-2.5 rounded-full shrink-0"
            style={{ backgroundColor: currentColumn.color }}
          />
        )}
        {Icon && <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />}
        <span className="font-medium truncate">{currentColumn.title}</span>
        <Badge variant="secondary" className="text-xs">
          {count}
        </Badge>
      </div>

      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 shrink-0"
        onClick={handleNext}
        disabled={!canGoNext}
        aria-label="Next column"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}) as <TStatus extends string = string>(
  props: MobileColumnNavigatorProps<TStatus>
) => React.ReactElement;

// ============================================================================
// MOBILE KANBAN BOARD
// ============================================================================

export interface MobileKanbanBoardProps<TItem, TStatus extends string = string> {
  columns: KanbanColumn<TStatus>[];
  items: TItem[];
  getColumnKey: (item: TItem) => TStatus;
  getItemKey: (item: TItem) => string;
  renderCard: (item: TItem) => React.ReactNode;
  onMove?: (event: KanbanMoveEvent<TStatus>) => void | Promise<void>;
  /** Initial active column */
  defaultColumn?: TStatus;
  /** Navigation style */
  navigationStyle?: "tabs" | "arrows";
  /** Empty message */
  emptyMessage?: string;
  /** Loading state */
  isLoading?: boolean;
  className?: string;
}

export const MobileKanbanBoard = memo(function MobileKanbanBoard<
  TItem,
  TStatus extends string = string
>({
  columns,
  items,
  getColumnKey,
  getItemKey,
  renderCard,
  onMove: _onMove, // Mobile doesn't support DnD, prefixed for lint
  defaultColumn,
  navigationStyle = "tabs",
  emptyMessage = "No items",
  isLoading,
  className,
}: MobileKanbanBoardProps<TItem, TStatus>) {
  const [activeColumn, setActiveColumn] = useState<TStatus>(
    defaultColumn ?? columns[0]?.key ?? ("" as TStatus)
  );

  // Group items by column
  const itemsByColumn = useMemo(() => {
    const grouped: Record<string, TItem[]> = {};

    for (const column of columns) {
      grouped[column.key] = [];
    }

    for (const item of items) {
      const columnKey = getColumnKey(item);
      if (grouped[columnKey]) {
        grouped[columnKey].push(item);
      }
    }

    return grouped as Record<TStatus, TItem[]>;
  }, [items, columns, getColumnKey]);

  // Item counts for badges
  const itemCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const column of columns) {
      counts[column.key] = itemsByColumn[column.key]?.length ?? 0;
    }
    return counts as Record<TStatus, number>;
  }, [columns, itemsByColumn]);

  const columnItems = itemsByColumn[activeColumn] ?? [];

  const handleColumnChange = useCallback((column: TStatus) => {
    setActiveColumn(column);
  }, []);

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Column navigation */}
      <div className="shrink-0 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-10 p-2">
        {navigationStyle === "tabs" ? (
          <MobileColumnTabs
            columns={columns}
            activeColumn={activeColumn}
            onColumnChange={handleColumnChange}
            itemCounts={itemCounts}
          />
        ) : (
          <MobileColumnNavigator
            columns={columns}
            activeColumn={activeColumn}
            onColumnChange={handleColumnChange}
            itemCounts={itemCounts}
          />
        )}
      </div>

      {/* Column content - Square UI spacing */}
      <ScrollArea className="flex-1">
        <div
          className={cn(
            "p-3 space-y-3 min-h-[200px]",
            isLoading && "opacity-50 pointer-events-none"
          )}
        >
          {columnItems.length === 0 ? (
            <div className="flex items-center justify-center h-32 border-2 border-dashed border-border/50 rounded-xl text-muted-foreground text-xs">
              {emptyMessage}
            </div>
          ) : (
            columnItems.map((item) => (
              <div key={getItemKey(item)}>{renderCard(item)}</div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}) as <TItem, TStatus extends string = string>(
  props: MobileKanbanBoardProps<TItem, TStatus>
) => React.ReactElement;

// ============================================================================
// RESPONSIVE KANBAN BOARD WRAPPER
// ============================================================================

export interface ResponsiveKanbanBoardProps<TItem, TStatus extends string = string> {
  /** Desktop board component */
  desktopBoard: React.ReactNode;
  /** Mobile board props (used when mobile) */
  mobileProps: Omit<MobileKanbanBoardProps<TItem, TStatus>, "className">;
  /** Breakpoint for mobile (default: 768px) */
  breakpoint?: number;
  className?: string;
}

export const ResponsiveKanbanBoard = memo(function ResponsiveKanbanBoard<
  TItem,
  TStatus extends string = string
>({
  desktopBoard,
  mobileProps,
  breakpoint: _breakpoint = 768, // Unused - using Tailwind md: breakpoint
  className,
}: ResponsiveKanbanBoardProps<TItem, TStatus>) {
  return (
    <div className={className}>
      {/* Desktop board - visible at md and above */}
      <div className="hidden md:block">{desktopBoard}</div>

      {/* Mobile board - visible below md */}
      <div className="md:hidden">
        <MobileKanbanBoard {...mobileProps} />
      </div>
    </div>
  );
}) as <TItem, TStatus extends string = string>(
  props: ResponsiveKanbanBoardProps<TItem, TStatus>
) => React.ReactElement;
