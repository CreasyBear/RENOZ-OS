/**
 * Purchase Orders Table Presenter
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
import type { PurchaseOrderTableData } from "@/lib/schemas/purchase-orders";
import { createPOColumns } from "./po-columns";

export interface POTablePresenterProps {
  /** Purchase orders to display */
  orders: PurchaseOrderTableData[];
  /** Set of selected PO IDs */
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
  /** View PO handler */
  onViewPO: (id: string) => void;
  /** Edit PO handler */
  onEditPO: (id: string) => void;
  /** Delete PO handler */
  onDeletePO: (id: string) => void;
  /** Receive goods handler */
  onReceivePO: (id: string) => void;
  /** Additional className */
  className?: string;
}

/**
 * Desktop table presenter for purchase orders.
 * Uses TanStack Table with controlled server-side sorting.
 */
export const POTablePresenter = memo(function POTablePresenter({
  orders,
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
  onViewPO,
  onEditPO,
  onDeletePO,
  onReceivePO,
  className,
}: POTablePresenterProps) {
  // Create columns with selection and action handlers
  const columns = useMemo(
    () =>
      createPOColumns({
        onSelect,
        onShiftClickRange,
        isAllSelected,
        isPartiallySelected,
        onSelectAll,
        isSelected,
        onViewPO,
        onEditPO,
        onDeletePO,
        onReceivePO,
      }),
    [
      onSelect,
      onShiftClickRange,
      isAllSelected,
      isPartiallySelected,
      onSelectAll,
      isSelected,
      onViewPO,
      onEditPO,
      onDeletePO,
      onReceivePO,
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
    data: orders,
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
                "cursor-pointer hover:bg-muted/50",
                selectedIds.has(row.original.id) && "bg-muted/50"
              )}
              onClick={() => onViewPO(row.original.id)}
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

POTablePresenter.displayName = "POTablePresenter";
