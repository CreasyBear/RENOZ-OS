/**
 * Customers Table Presenter
 *
 * Desktop table view using DataTable with server-side sorting.
 */

import { memo, useMemo, useCallback } from "react";
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
import { createCustomerColumns, type CustomerTableData } from "./customer-columns";

export interface CustomersTablePresenterProps {
  /** Customers to display */
  customers: CustomerTableData[];
  /** Set of selected customer IDs */
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
  /** View customer handler */
  onViewCustomer: (id: string) => void;
  /** Edit customer handler */
  onEditCustomer?: (id: string) => void;
  /** Delete customer handler */
  onDeleteCustomer?: (id: string) => void;
  /** Additional className */
  className?: string;
}

/**
 * Desktop table presenter for customers.
 * Uses TanStack Table with controlled server-side sorting.
 */
export const CustomersTablePresenter = memo(function CustomersTablePresenter({
  customers,
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
  onViewCustomer,
  onEditCustomer,
  onDeleteCustomer,
  className,
}: CustomersTablePresenterProps) {
  // Create columns with selection handlers
  const columns = useMemo(
    () =>
      createCustomerColumns({
        onSelect,
        onShiftClickRange,
        isAllSelected,
        isPartiallySelected,
        onSelectAll,
        isSelected,
        onViewCustomer,
        onEditCustomer,
        onDeleteCustomer,
      }),
    [
      onSelect,
      onShiftClickRange,
      isAllSelected,
      isPartiallySelected,
      onSelectAll,
      isSelected,
      onViewCustomer,
      onEditCustomer,
      onDeleteCustomer,
    ]
  );

  // Convert server sort state to TanStack Table sorting state
  const sorting: SortingState = useMemo(
    () => [{ id: sortField, desc: sortDirection === "desc" }],
    [sortField, sortDirection]
  );

  // Handle sort changes (server-side)
  const handleSortingChange = useCallback(
    (updater: SortingState | ((prev: SortingState) => SortingState)) => {
      const newSorting = typeof updater === "function" ? updater(sorting) : updater;
      if (newSorting.length > 0) {
        onSort(newSorting[0].id);
      }
    },
    [sorting, onSort]
  );

  // eslint-disable-next-line react-hooks/incompatible-library -- useReactTable returns functions that cannot be memoized; known TanStack Table limitation
  const table = useReactTable({
    data: customers,
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
              className={cn(selectedIds.has(row.original.id) && "bg-muted/50")}
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

CustomersTablePresenter.displayName = "CustomersTablePresenter";
