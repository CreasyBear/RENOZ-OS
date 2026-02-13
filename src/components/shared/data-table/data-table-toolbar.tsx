import { memo, type ReactNode } from "react";
import type { JSX } from "react";
import type { Table } from "@tanstack/react-table";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  DataTableFilterDropdown,
  type DataTableFilter,
} from "./data-table-filter-dropdown";
import { DataTableSortDropdown } from "./data-table-sort-dropdown";
import { cn } from "@/lib/utils";

export interface DataTableToolbarProps<TData> {
  /** TanStack Table instance */
  table: Table<TData>;
  /** Optional title displayed on the left */
  title?: string;
  /** Search input placeholder */
  searchPlaceholder?: string;
  /** Column key to search on */
  searchColumn?: string;
  /** Filter configurations */
  filters?: DataTableFilter[];
  /** Show sort dropdown (default: true) */
  showSort?: boolean;
  /** Action buttons (right side) */
  actions?: ReactNode;
  /** Bulk action content (shown when items selected) */
  bulkActions?: ReactNode;
  /** Additional className */
  className?: string;
}

/**
 * Unified toolbar with search, filters, and actions.
 *
 * @example
 * ```tsx
 * <DataTableToolbar
 *   table={table}
 *   title="Orders"
 *   searchPlaceholder="Search orders..."
 *   searchColumn="orderNumber"
 *   filters={filters}
 *   actions={<Button>New Order</Button>}
 *   bulkActions={
 *     <BulkActionsBar selectedCount={selectedCount} onClear={clearSelection}>
 *       <Button size="sm" onClick={handleDelete}>Delete</Button>
 *     </BulkActionsBar>
 *   }
 * />
 * ```
 */
export const DataTableToolbar = memo(function DataTableToolbar<TData>({
  table,
  title,
  searchPlaceholder = "Search...",
  searchColumn = "name",
  filters,
  showSort = true,
  actions,
  bulkActions,
  className,
}: DataTableToolbarProps<TData>) {
  const hasActiveFilters = filters?.some((f) => f.value !== f.defaultValue);
  const selectedCount = table.getFilteredSelectedRowModel().rows.length;

  const column = table.getColumn(searchColumn);
  const searchValue = (column?.getFilterValue() as string) ?? "";

  return (
    <div
      className={cn(
        "flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 py-3.5 border-b",
        className
      )}
    >
      <div className="flex items-center gap-3 flex-wrap">
        {title && <h3 className="font-medium text-base">{title}</h3>}

        {title && <div className="h-5 w-px bg-border hidden sm:block" />}

        {/* Search */}
        {column && (
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
            <Input
              placeholder={searchPlaceholder}
              value={searchValue}
              onChange={(e) => column.setFilterValue(e.target.value)}
              className="pl-8 h-8 w-[200px] text-sm bg-muted/50"
              aria-label={searchPlaceholder.replace("...", "").trim()}
            />
          </div>
        )}

        {/* Filter Dropdown */}
        <DataTableFilterDropdown
          filters={filters}
          hasActiveFilters={hasActiveFilters}
        />

        {/* Sort Dropdown */}
        {showSort && <DataTableSortDropdown table={table} />}
      </div>

      <div className="flex items-center gap-2">
        {selectedCount >= 2 && bulkActions}
        {actions}
      </div>
    </div>
  );
}) as <TData>(props: DataTableToolbarProps<TData>) => JSX.Element;

(DataTableToolbar as unknown as { displayName: string }).displayName =
  "DataTableToolbar";
