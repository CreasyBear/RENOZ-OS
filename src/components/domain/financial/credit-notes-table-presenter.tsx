/**
 * Credit Notes Table Presenter
 *
 * Desktop table view using TanStack Table with server-side sorting.
 */

import { memo, useMemo } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  type SortingState,
} from '@tanstack/react-table';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { createCreditNoteColumns, type CreditNoteTableItem } from './credit-note-columns';

export interface CreditNotesTablePresenterProps {
  /** Credit notes to display */
  creditNotes: CreditNoteTableItem[];
  /** Set of selected credit note IDs */
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
  sortDirection: 'asc' | 'desc';
  /** Sort change handler (server-side) */
  onSort: (field: string) => void;
  /** Issue credit note handler */
  onIssue: (id: string) => void;
  /** Apply credit note handler */
  onApply: (id: string) => void;
  /** Void credit note handler */
  onVoid: (id: string) => void;
  /** Generate PDF handler */
  onGeneratePdf: (id: string) => void;
  /** Whether mutations are pending */
  isMutating: boolean;
  /** Whether PDF generation is pending */
  isGeneratingPdf: boolean;
  /** Additional className */
  className?: string;
}

/**
 * Desktop table presenter for credit notes.
 * Uses TanStack Table with controlled server-side sorting.
 */
export const CreditNotesTablePresenter = memo(function CreditNotesTablePresenter({
  creditNotes,
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
  onIssue,
  onApply,
  onVoid,
  onGeneratePdf,
  isMutating,
  isGeneratingPdf,
  className,
}: CreditNotesTablePresenterProps) {
  // Create columns with action handlers
  const columns = useMemo(
    () =>
      createCreditNoteColumns({
        onSelect,
        onShiftClickRange,
        isAllSelected,
        isPartiallySelected,
        onSelectAll,
        isSelected,
        onIssue,
        onApply,
        onVoid,
        onGeneratePdf,
        isMutating,
        isGeneratingPdf,
      }),
    [
      onSelect,
      onShiftClickRange,
      isAllSelected,
      isPartiallySelected,
      onSelectAll,
      isSelected,
      onIssue,
      onApply,
      onVoid,
      onGeneratePdf,
      isMutating,
      isGeneratingPdf,
    ]
  );

  // Convert server sort state to TanStack Table sorting state
  const sorting: SortingState = useMemo(
    () => [{ id: sortField, desc: sortDirection === 'desc' }],
    [sortField, sortDirection]
  );

  // Handle sort changes (server-side)
  const handleSortingChange = (
    updater: SortingState | ((prev: SortingState) => SortingState)
  ) => {
    const newSorting = typeof updater === 'function' ? updater(sorting) : updater;
    if (newSorting.length > 0) {
      onSort(newSorting[0].id);
    }
  };

  // eslint-disable-next-line react-hooks/incompatible-library -- useReactTable returns functions that cannot be memoized; known TanStack Table limitation
  const table = useReactTable({
    data: creditNotes,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualSorting: true, // Server-side sorting
    state: { sorting },
    onSortingChange: handleSortingChange,
  });

  return (
    <div className={cn('border rounded-lg', className)}>
      <Table>
        <TableHeader className="sticky top-0 z-10 bg-background">
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableHead
                  key={header.id}
                  style={{ width: header.getSize() }}
                  className={cn(
                    header.column.getCanSort() && 'cursor-pointer select-none'
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
              className={cn(selectedIds.has(row.original.id) && 'bg-muted/50')}
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

CreditNotesTablePresenter.displayName = 'CreditNotesTablePresenter';
