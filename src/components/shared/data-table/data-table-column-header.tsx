import { memo } from "react";
import type { Column } from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ArrowUpDown, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export interface DataTableColumnHeaderProps<TData, TValue> {
  /** TanStack Table column */
  column: Column<TData, TValue>;
  /** Header title */
  title: string;
  /** Additional className */
  className?: string;
}

/**
 * Sortable column header with accessibility support.
 *
 * Features:
 * - Ascending/descending sort toggle
 * - aria-sort attribute for screen readers
 * - Column hide option
 * - Keyboard accessible
 *
 * @example
 * ```tsx
 * {
 *   accessorKey: "name",
 *   header: ({ column }) => (
 *     <DataTableColumnHeader column={column} title="Name" />
 *   ),
 * }
 * ```
 */
function DataTableColumnHeaderComponent<TData, TValue>({
  column,
  title,
  className,
}: DataTableColumnHeaderProps<TData, TValue>) {
  if (!column.getCanSort()) {
    return <div className={cn(className)}>{title}</div>;
  }

  const sorted = column.getIsSorted();

  // Determine aria-sort value
  const ariaSort = sorted === "asc"
    ? "ascending"
    : sorted === "desc"
      ? "descending"
      : "none";

  return (
    <div className={cn("flex items-center space-x-2", className)}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="-ml-3 h-8 data-[state=open]:bg-accent"
            aria-sort={ariaSort}
          >
            <span>{title}</span>
            {sorted === "desc" ? (
              <ArrowDown className="ml-2 h-4 w-4" />
            ) : sorted === "asc" ? (
              <ArrowUp className="ml-2 h-4 w-4" />
            ) : (
              <ArrowUpDown className="ml-2 h-4 w-4" />
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem onClick={() => column.toggleSorting(false)}>
            <ArrowUp className="mr-2 h-3.5 w-3.5 text-muted-foreground/70" />
            Asc
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => column.toggleSorting(true)}>
            <ArrowDown className="mr-2 h-3.5 w-3.5 text-muted-foreground/70" />
            Desc
          </DropdownMenuItem>
          {column.getCanHide() && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => column.toggleVisibility(false)}>
                <EyeOff className="mr-2 h-3.5 w-3.5 text-muted-foreground/70" />
                Hide
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

export const DataTableColumnHeader = memo(
  DataTableColumnHeaderComponent
) as typeof DataTableColumnHeaderComponent;

(DataTableColumnHeader as { displayName?: string }).displayName =
  "DataTableColumnHeader";
