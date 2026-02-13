/**
 * Kanban Toolbar
 *
 * Toolbar component with view toggle, filters, and actions.
 *
 * @see docs/design-system/KANBAN-STANDARDS.md
 */

import { memo } from "react";
import { LayoutGrid, List, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { KanbanFiltersPopover, KanbanFilterChips } from "./kanban-filters";
import type { KanbanToolbarProps, KanbanViewMode } from "./types";

// ============================================================================
// TOOLBAR
// ============================================================================

export const KanbanToolbar = memo(function KanbanToolbar({
  viewMode = "board",
  onViewModeChange,
  filters,
  onFiltersChange,
  onAddItem,
  addItemLabel = "Add Item",
  showViewToggle = true,
  showFilters = true,
  children,
}: KanbanToolbarProps) {
  return (
    <div className="flex items-center justify-between px-4 py-2 border-b gap-4">
      <div className="flex items-center gap-2 flex-wrap">
        {/* View toggle */}
        {showViewToggle && onViewModeChange && (
          <ToggleGroup
            type="single"
            value={viewMode}
            onValueChange={(value) => {
              if (value) onViewModeChange(value as KanbanViewMode);
            }}
          >
            <ToggleGroupItem value="board" aria-label="Board view">
              <LayoutGrid className="h-4 w-4" />
            </ToggleGroupItem>
            <ToggleGroupItem value="table" aria-label="Table view">
              <List className="h-4 w-4" />
            </ToggleGroupItem>
          </ToggleGroup>
        )}

        {/* Filters */}
        {showFilters && filters && onFiltersChange && (
          <KanbanFiltersPopover filters={filters} onChange={onFiltersChange} />
        )}

        {/* Custom children (additional toolbar items) */}
        {children}

        {/* Filter chips */}
        {showFilters && filters && onFiltersChange && (
          <KanbanFilterChips
            filters={filters}
            onChange={onFiltersChange}
            className="hidden md:flex"
          />
        )}
      </div>

      <div className="flex items-center gap-2">
        {/* Add button */}
        {onAddItem && (
          <Button onClick={onAddItem}>
            <Plus className="h-4 w-4 mr-2" />
            {addItemLabel}
          </Button>
        )}
      </div>
    </div>
  );
});

// ============================================================================
// COMPACT TOOLBAR (for embedded boards)
// ============================================================================

export interface KanbanToolbarCompactProps {
  title?: string;
  itemCount?: number;
  onAddItem?: () => void;
  addItemLabel?: string;
  actions?: React.ReactNode;
  className?: string;
}

export const KanbanToolbarCompact = memo(function KanbanToolbarCompact({
  title,
  itemCount,
  onAddItem,
  addItemLabel = "Add",
  actions,
  className,
}: KanbanToolbarCompactProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-between px-4 py-2 border-b",
        className
      )}
    >
      <div className="flex items-center gap-2">
        {title && <h3 className="font-medium text-sm">{title}</h3>}
        {itemCount !== undefined && (
          <span className="text-sm text-muted-foreground">
            ({itemCount} items)
          </span>
        )}
      </div>

      <div className="flex items-center gap-2">
        {actions}
        {onAddItem && (
          <Button variant="outline" size="sm" onClick={onAddItem}>
            <Plus className="h-4 w-4 mr-1" />
            {addItemLabel}
          </Button>
        )}
      </div>
    </div>
  );
});
