/**
 * Scheduled Reports Table Presenter
 *
 * Desktop table view using DataTable.
 */

import { memo, useMemo } from 'react';
import { useReactTable, getCoreRowModel, flexRender } from '@tanstack/react-table';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { createScheduledReportsColumns } from './scheduled-reports-columns';
import type { ScheduledReport } from '@/lib/schemas/reports/scheduled-reports';

export interface ScheduledReportsTablePresenterProps {
  reports: ScheduledReport[];
  selectedIds: Set<string>;
  isAllSelected: boolean;
  isPartiallySelected: boolean;
  onSelect: (id: string, checked: boolean) => void;
  onSelectAll: (checked: boolean) => void;
  onShiftClickRange: (rowIndex: number) => void;
  isSelected: (id: string) => boolean;
  onEdit: (report: ScheduledReport) => void;
  onDelete: (report: ScheduledReport) => void;
  onExecute: (report: ScheduledReport) => void;
  onToggleActive: (report: ScheduledReport) => void;
  executingReportId: string | null;
  className?: string;
}

export const ScheduledReportsTablePresenter = memo(
  function ScheduledReportsTablePresenter({
    reports,
    selectedIds,
    isAllSelected,
    isPartiallySelected,
    onSelect,
    onSelectAll,
    onShiftClickRange,
    isSelected,
    onEdit,
    onDelete,
    onExecute,
    onToggleActive,
    executingReportId,
    className,
  }: ScheduledReportsTablePresenterProps) {
    const columns = useMemo(
      () =>
        createScheduledReportsColumns({
          onSelect,
          onShiftClickRange,
          isAllSelected,
          isPartiallySelected,
          onSelectAll,
          isSelected,
          onEdit,
          onDelete,
          onExecute,
          onToggleActive,
          executingReportId,
        }),
      [
        onSelect,
        onShiftClickRange,
        isAllSelected,
        isPartiallySelected,
        onSelectAll,
        isSelected,
        onEdit,
        onDelete,
        onExecute,
        onToggleActive,
        executingReportId,
      ]
    );

    // eslint-disable-next-line react-hooks/incompatible-library -- useReactTable returns functions that cannot be memoized; known TanStack Table limitation
    const table = useReactTable({
      data: reports,
      columns,
      getCoreRowModel: getCoreRowModel(),
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
  }
);

ScheduledReportsTablePresenter.displayName = 'ScheduledReportsTablePresenter';
