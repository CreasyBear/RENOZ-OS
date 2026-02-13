/**
 * Alerts Table Presenter
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
import { createAlertColumns, type AlertTableItem } from "./alert-columns";

export interface AlertsTablePresenterProps {
  /** Alerts to display */
  alerts: AlertTableItem[];
  /** Current sort field */
  sortField: string;
  /** Current sort direction */
  sortDirection: "asc" | "desc";
  /** Sort change handler (server-side) */
  onSort: (field: string) => void;
  /** Selected alert IDs */
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
  /** Toggle active handler */
  onToggleActive?: (alertId: string, isActive: boolean) => void;
  /** Edit alert handler */
  onEdit?: (alert: AlertTableItem) => void;
  /** Delete alert handler */
  onDelete?: (alert: AlertTableItem) => void;
  /** Additional className */
  className?: string;
}

/**
 * Desktop table presenter for alerts.
 * Uses TanStack Table with controlled server-side sorting.
 */
export const AlertsTablePresenter = memo(function AlertsTablePresenter({
  alerts,
  sortField,
  sortDirection,
  onSort,
  selectedIds: _selectedIds,
  isAllSelected,
  isPartiallySelected,
  onSelect,
  onSelectAll,
  onShiftClickRange,
  isSelected,
  onToggleActive,
  onEdit,
  onDelete,
  className,
}: AlertsTablePresenterProps) {
  // Note: _selectedIds available for row highlighting if needed
  // Create columns with handlers
  const columns = useMemo(
    () =>
      createAlertColumns({
        onSelect,
        onShiftClickRange,
        isAllSelected,
        isPartiallySelected,
        onSelectAll,
        isSelected,
        onToggleActive,
        onEdit,
        onDelete,
      }),
    [
      onSelect,
      onShiftClickRange,
      isAllSelected,
      isPartiallySelected,
      onSelectAll,
      isSelected,
      onToggleActive,
      onEdit,
      onDelete,
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

  // eslint-disable-next-line react-hooks/incompatible-library -- useReactTable returns functions that cannot be memoized; known TanStack Table limitation
  const table = useReactTable({
    data: alerts,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualSorting: true, // Server-side sorting
    state: { sorting },
    onSortingChange: handleSortingChange,
  });

  return (
    <div className={cn("border rounded-lg overflow-hidden", className)}>
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
            <TableRow key={row.id}>
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

AlertsTablePresenter.displayName = "AlertsTablePresenter";
