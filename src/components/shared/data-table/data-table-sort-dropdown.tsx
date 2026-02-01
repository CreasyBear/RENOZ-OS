import { memo } from "react";
import type { Table } from "@tanstack/react-table";
import { ArrowUpDown, ArrowUp, ArrowDown, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export interface DataTableSortDropdownProps<TData> {
  /** TanStack Table instance */
  table: Table<TData>;
  /** Button size */
  size?: "sm" | "default";
  /** Additional className */
  className?: string;
}

/**
 * Sort dropdown for data table toolbar.
 *
 * Shows sortable columns and allows ascending/descending sort.
 *
 * @example
 * ```tsx
 * <DataTableSortDropdown table={table} />
 * ```
 */
function DataTableSortDropdownComponent<TData>({
  table,
  size = "sm",
  className,
}: DataTableSortDropdownProps<TData>) {
  const sortableColumns = table
    .getAllColumns()
    .filter((column) => column.getCanSort());

  const currentSort = table.getState().sorting[0];
  const hasActiveSort = !!currentSort;

  if (sortableColumns.length === 0) {
    return null;
  }

  const handleSort = (columnId: string, desc: boolean) => {
    table.setSorting([{ id: columnId, desc }]);
  };

  const handleClearSort = () => {
    table.setSorting([]);
  };

  // Get column header label from meta or fallback to id
  const getColumnLabel = (columnId: string): string => {
    const column = table.getColumn(columnId);
    const meta = column?.columnDef.meta as { headerLabel?: string } | undefined;
    return meta?.headerLabel || columnId.charAt(0).toUpperCase() + columnId.slice(1);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size={size}
          className={cn("gap-1.5 bg-muted/50", size === "sm" && "h-8", className)}
        >
          {hasActiveSort ? (
            currentSort.desc ? (
              <ArrowDown className="size-3.5" />
            ) : (
              <ArrowUp className="size-3.5" />
            )
          ) : (
            <ArrowUpDown className="size-3.5" />
          )}
          <span>Sort</span>
          {hasActiveSort && (
            <span className="text-xs text-muted-foreground">
              ({getColumnLabel(currentSort.id)})
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-48">
        {sortableColumns.map((column) => {
          const label = getColumnLabel(column.id);
          const isActive = currentSort?.id === column.id;

          return (
            <div key={column.id} className="px-2 py-1.5">
              <p className="text-xs font-medium text-muted-foreground mb-1">
                {label}
              </p>
              <div className="flex items-center gap-1">
                <Button
                  variant={isActive && !currentSort.desc ? "secondary" : "ghost"}
                  size="sm"
                  className="h-7 flex-1 justify-start"
                  onClick={() => handleSort(column.id, false)}
                >
                  <ArrowUp className="size-3 mr-1.5" />
                  Asc
                </Button>
                <Button
                  variant={isActive && currentSort.desc ? "secondary" : "ghost"}
                  size="sm"
                  className="h-7 flex-1 justify-start"
                  onClick={() => handleSort(column.id, true)}
                >
                  <ArrowDown className="size-3 mr-1.5" />
                  Desc
                </Button>
              </div>
            </div>
          );
        })}
        {hasActiveSort && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleClearSort}>
              <X className="size-3.5 mr-2" />
              Clear sort
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export const DataTableSortDropdown = memo(
  DataTableSortDropdownComponent
) as typeof DataTableSortDropdownComponent;

(DataTableSortDropdown as { displayName?: string }).displayName =
  "DataTableSortDropdown";
