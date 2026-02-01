/**
 * Projects Table Presenter
 *
 * Desktop table view using DataTable with server-side sorting.
 */

import { memo, useMemo } from "react";
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  type SortingState,
} from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { createProjectColumns, type ProjectTableItem } from "./project-columns";

export interface ProjectsTablePresenterProps {
  /** Projects to display */
  projects: ProjectTableItem[];
  /** Set of selected project IDs */
  selectedIds: Set<string>;
  /** Whether all items are selected */
  isAllSelected: boolean;
  /** Whether some items are selected (indeterminate) */
  isPartiallySelected: boolean;
  /** Handle single item selection */
  onSelect: (id: string, checked: boolean) => void;
  /** Handle select all */
  onSelectAll: (checked: boolean) => void;
  /** Handle shift-click range selection */
  onShiftClickRange: (rowIndex: number) => void;
  /** Check if item is selected */
  isSelected: (id: string) => boolean;
  /** Current sort field */
  sortField: string;
  /** Current sort direction */
  sortDirection: "asc" | "desc";
  /** Sort change handler (server-side) */
  onSort: (field: string) => void;
  /** View project handler */
  onViewProject: (id: string) => void;
  /** Edit project handler */
  onEditProject: (id: string) => void;
  /** Delete project handler */
  onDeleteProject: (id: string) => void;
  /** Row click handler for navigation */
  onRowClick?: (project: ProjectTableItem) => void;
  /** Additional className */
  className?: string;
}

/**
 * Desktop table presenter for projects.
 * Uses TanStack Table with controlled server-side sorting.
 */
export const ProjectsTablePresenter = memo(function ProjectsTablePresenter({
  projects,
  selectedIds,
  isAllSelected,
  isPartiallySelected,
  onSelect,
  onSelectAll,
  onShiftClickRange,
  isSelected,
  sortField,
  sortDirection,
  onSort,
  onViewProject,
  onEditProject,
  onDeleteProject,
  onRowClick,
  className,
}: ProjectsTablePresenterProps) {
  // Create columns with selection handlers
  const columns = useMemo(
    () =>
      createProjectColumns({
        onSelect,
        onShiftClickRange,
        isAllSelected,
        isPartiallySelected,
        onSelectAll,
        isSelected,
        onViewProject,
        onEditProject,
        onDeleteProject,
      }),
    [
      onSelect,
      onShiftClickRange,
      isAllSelected,
      isPartiallySelected,
      onSelectAll,
      isSelected,
      onViewProject,
      onEditProject,
      onDeleteProject,
    ]
  );

  // Convert server sort state to TanStack Table sorting state
  const sorting: SortingState = useMemo(
    () => [{ id: sortField, desc: sortDirection === "desc" }],
    [sortField, sortDirection]
  );

  // Handle sort changes (server-side)
  const handleSortingChange = (
    updater: SortingState | ((prev: SortingState) => SortingState)
  ) => {
    const newSorting = typeof updater === "function" ? updater(sorting) : updater;
    if (newSorting.length > 0) {
      onSort(newSorting[0].id);
    }
  };

  const table = useReactTable({
    data: projects,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualSorting: true, // Server-side sorting
    state: { sorting },
    onSortingChange: handleSortingChange,
  });

  return (
    <div className={cn("border rounded-lg", className)}>
      <Table>
        <TableHeader className="sticky top-0 z-10 bg-background">
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableHead
                  key={header.id}
                  style={{ width: header.getSize() }}
                  className={cn(
                    header.column.getCanSort() && "cursor-pointer select-none"
                  )}
                >
                  {header.isPlaceholder
                    ? null
                    : flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.map((row) => (
            <TableRow
              key={row.id}
              className={cn(
                selectedIds.has(row.original.id) && "bg-muted/50",
                onRowClick && "cursor-pointer hover:bg-muted/30"
              )}
              onClick={() => onRowClick?.(row.original)}
            >
              {row.getVisibleCells().map((cell) => (
                <TableCell key={cell.id}>
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
});

ProjectsTablePresenter.displayName = "ProjectsTablePresenter";
