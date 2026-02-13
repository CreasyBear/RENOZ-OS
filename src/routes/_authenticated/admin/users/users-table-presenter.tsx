/**
 * Users Table Presenter
 *
 * Desktop table view using DataTable with server-side sorting.
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
import type { UserTableItem } from '@/lib/schemas/users';
import { createUserColumns } from './users-columns';

export interface UsersTablePresenterProps {
  users: UserTableItem[];
  selectedIds: Set<string>;
  isAllSelected: boolean;
  isPartiallySelected: boolean;
  onSelect: (id: string, checked: boolean) => void;
  onSelectAll: (checked: boolean) => void;
  onShiftClickRange: (rowIndex: number) => void;
  isSelected: (id: string) => boolean;
  sortField: string;
  sortDirection: 'asc' | 'desc';
  onSort: (field: string) => void;
  onViewUser: (userId: string) => void;
  onDeactivate: (userId: string) => void;
  onReactivate: (userId: string) => void;
  isLoading: boolean;
  className?: string;
}

/**
 * Desktop table presenter for users.
 * Uses TanStack Table with controlled server-side sorting.
 */
export const UsersTablePresenter = memo(function UsersTablePresenter({
  users,
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
  onViewUser,
  onDeactivate,
  onReactivate,
  isLoading,
  className,
}: UsersTablePresenterProps) {
  const columns = useMemo(
    () =>
      createUserColumns({
        onSelect,
        onShiftClickRange,
        isAllSelected,
        isPartiallySelected,
        onSelectAll,
        isSelected,
        onViewUser,
        onDeactivate,
        onReactivate,
        isLoading,
      }),
    [
      onSelect,
      onShiftClickRange,
      isAllSelected,
      isPartiallySelected,
      onSelectAll,
      isSelected,
      onViewUser,
      onDeactivate,
      onReactivate,
      isLoading,
    ]
  );

  const sorting: SortingState = useMemo(
    () => [{ id: sortField, desc: sortDirection === 'desc' }],
    [sortField, sortDirection]
  );

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
    data: users,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualSorting: true,
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

UsersTablePresenter.displayName = 'UsersTablePresenter';
