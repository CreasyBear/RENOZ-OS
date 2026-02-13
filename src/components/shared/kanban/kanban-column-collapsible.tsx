/* eslint-disable react-refresh/only-export-components -- Component exports component + helpers */
/**
 * Kanban Column Collapsible
 *
 * Column wrapper with animated collapse/expand functionality.
 *
 * @see docs/design-system/KANBAN-STANDARDS.md
 */

import { memo, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight } from "lucide-react";
// cn utility available if needed for className merging
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { KanbanColumn as KanbanColumnType } from "./types";

// ============================================================================
// TYPES
// ============================================================================

export interface KanbanColumnCollapsibleProps {
  column: KanbanColumnType;
  itemCount: number;
  isCollapsed?: boolean;
  onToggleCollapse?: (collapsed: boolean) => void;
  /** Aggregate value to show when collapsed */
  aggregateValue?: React.ReactNode;
  /** Children (the column content) */
  children: React.ReactNode;
  /** Reduce motion for accessibility */
  reducedMotion?: boolean;
  className?: string;
}

// ============================================================================
// COLLAPSED COLUMN VIEW
// ============================================================================

interface CollapsedColumnProps {
  column: KanbanColumnType;
  itemCount: number;
  aggregateValue?: React.ReactNode;
  onExpand: () => void;
}

const CollapsedColumn = memo(function CollapsedColumn({
  column,
  itemCount,
  aggregateValue,
  onExpand,
}: CollapsedColumnProps) {
  const StatusIcon = column.icon;

  return (
    <motion.div
      initial={{ width: 48, opacity: 0 }}
      animate={{ width: 48, opacity: 1 }}
      exit={{ width: 0, opacity: 0 }}
      transition={{ duration: 0.2, ease: "easeInOut" }}
      // Square UI: rounded-2xl, bg-muted/70, border-border/50
      className="flex flex-col h-full bg-muted/70 dark:bg-muted/50 rounded-2xl border border-border/50 overflow-hidden"
    >
      <Button
        variant="ghost"
        size="sm"
        className="h-auto py-4 px-2 flex flex-col items-center gap-2.5 rounded-none hover:bg-muted/50"
        onClick={onExpand}
        aria-label={`Expand ${column.title} column`}
      >
        <ChevronRight className="h-4 w-4" />

        {/* Color indicator */}
        {column.color && (
          <div
            className="w-2.5 h-2.5 rounded-full"
            style={{ backgroundColor: column.color }}
          />
        )}

        {/* Status icon */}
        {StatusIcon && <StatusIcon className="h-4 w-4 text-muted-foreground" />}

        {/* Vertical title */}
        <span
          className="text-xs font-medium writing-mode-vertical-rl"
          style={{ writingMode: "vertical-rl", textOrientation: "mixed" }}
        >
          {column.title}
        </span>

        {/* Count badge - Square UI style */}
        <Badge variant="secondary" className="size-6 p-0 rounded-full flex items-center justify-center text-[10px]">
          {itemCount}
        </Badge>

        {/* Aggregate value */}
        {aggregateValue && (
          <span className="text-[10px] text-muted-foreground">{aggregateValue}</span>
        )}
      </Button>
    </motion.div>
  );
});

// ============================================================================
// COLLAPSIBLE COLUMN WRAPPER
// ============================================================================

export const KanbanColumnCollapsible = memo(function KanbanColumnCollapsible({
  column,
  itemCount,
  isCollapsed: controlledCollapsed,
  onToggleCollapse,
  aggregateValue,
  children,
  reducedMotion = false,
  className,
}: KanbanColumnCollapsibleProps) {
  // Support both controlled and uncontrolled collapse state
  const [internalCollapsed, setInternalCollapsed] = useState(false);
  const isCollapsed = controlledCollapsed ?? internalCollapsed;

  const handleToggle = useCallback(() => {
    const newState = !isCollapsed;
    setInternalCollapsed(newState);
    onToggleCollapse?.(newState);
  }, [isCollapsed, onToggleCollapse]);

  // No animation version
  if (reducedMotion) {
    if (isCollapsed) {
      return (
        <CollapsedColumn
          column={column}
          itemCount={itemCount}
          aggregateValue={aggregateValue}
          onExpand={handleToggle}
        />
      );
    }
    return <div className={className}>{children}</div>;
  }

  return (
    <AnimatePresence mode="wait" initial={false}>
      {isCollapsed ? (
        <CollapsedColumn
          key="collapsed"
          column={column}
          itemCount={itemCount}
          aggregateValue={aggregateValue}
          onExpand={handleToggle}
        />
      ) : (
        <motion.div
          key="expanded"
          initial={{ width: 48, opacity: 0 }}
          animate={{ width: "auto", opacity: 1 }}
          exit={{ width: 48, opacity: 0 }}
          transition={{ duration: 0.2, ease: "easeInOut" }}
          className={className}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
});

// ============================================================================
// HOOK FOR MANAGING COLLAPSED COLUMNS
// ============================================================================

export interface UseCollapsedColumnsOptions<TStatus extends string> {
  /** Initial collapsed columns */
  initialCollapsed?: Set<TStatus>;
  /** Persist to localStorage with this key */
  storageKey?: string;
}

export function useCollapsedColumns<TStatus extends string>({
  initialCollapsed = new Set(),
  storageKey,
}: UseCollapsedColumnsOptions<TStatus> = {}) {
  const [collapsed, setCollapsed] = useState<Set<TStatus>>(() => {
    // Try to restore from localStorage
    if (storageKey && typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem(storageKey);
        if (stored) {
          return new Set(JSON.parse(stored));
        }
      } catch {
        // Ignore errors
      }
    }
    return initialCollapsed;
  });

  const toggleCollapsed = useCallback(
    (columnKey: TStatus) => {
      setCollapsed((prev) => {
        const next = new Set(prev);
        if (next.has(columnKey)) {
          next.delete(columnKey);
        } else {
          next.add(columnKey);
        }

        // Persist to localStorage
        if (storageKey && typeof window !== "undefined") {
          try {
            localStorage.setItem(storageKey, JSON.stringify([...next]));
          } catch {
            // Ignore errors
          }
        }

        return next;
      });
    },
    [storageKey]
  );

  const isCollapsed = useCallback(
    (columnKey: TStatus) => collapsed.has(columnKey),
    [collapsed]
  );

  const collapseAll = useCallback(() => {
    // This would need the column keys passed in
  }, []);

  const expandAll = useCallback(() => {
    setCollapsed(new Set());
    if (storageKey && typeof window !== "undefined") {
      try {
        localStorage.removeItem(storageKey);
      } catch {
        // Ignore errors
      }
    }
  }, [storageKey]);

  return {
    collapsed,
    toggleCollapsed,
    isCollapsed,
    collapseAll,
    expandAll,
  };
}
