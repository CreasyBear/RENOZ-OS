'use client';

/**
 * Invoice List Presenter
 *
 * ARCHITECTURE: Presenter Component - pure UI, no hooks.
 * Receives data as props and renders the invoice list.
 * Unified presenter combining desktop table and mobile cards
 * with responsive switching, loading states, and pagination.
 *
 * @see docs/design-system/INVOICE-STANDARDS.md
 * @see STANDARDS.md Section 3.2 (Container/Presenter Pattern)
 * @see docs/design-system/TABLE-STANDARDS.md (Responsive pattern)
 */

import { memo, useMemo, useCallback } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  type SortingState,
  flexRender,
} from '@tanstack/react-table';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ChevronLeft, ChevronRight, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { InvoiceSummaryCards } from './invoice-summary-cards';
import type { InvoiceSummaryData } from '@/lib/schemas/invoices';
import { InvoiceMobileCards } from './invoice-mobile-cards';
import { getInvoiceColumns } from '../columns/invoice-columns';
import type { InvoiceListItem } from '@/lib/schemas/invoices';

// ============================================================================
// TYPES
// ============================================================================

type SortField = 'createdAt' | 'dueDate' | 'total' | 'invoiceNumber' | 'customer';
type SortDirection = 'asc' | 'desc';

export interface InvoiceListPresenterProps {
  /** @source useInvoices(queryFilters) in invoice-list-container.tsx */
  invoices: InvoiceListItem[];
  /** @source useInvoiceSummary() in invoice-list-container.tsx */
  summary: InvoiceSummaryData | null;
  /** @source invoicesData.total from useInvoices in invoice-list-container.tsx */
  total: number;
  /** @source invoicesData.page from useInvoices in invoice-list-container.tsx */
  page: number;
  /** @source invoicesData.pageSize from useInvoices in invoice-list-container.tsx */
  pageSize: number;
  /** @source useState(sortField) in invoice-list-container.tsx */
  sortField: SortField;
  /** @source useState(sortDirection) in invoice-list-container.tsx */
  sortDirection: SortDirection;
  /** @source handleSortChange callback in invoice-list-container.tsx */
  onSortChange: (field: SortField, direction: SortDirection) => void;
  /** @source handlePageChange callback in invoice-list-container.tsx */
  onPageChange?: (page: number) => void;
  /** @source handleViewInvoice callback in invoice-list-container.tsx */
  onRowClick?: (invoiceId: string) => void;
  currency?: string;
  /** @source invoicesLoading from useInvoices in invoice-list-container.tsx */
  isLoading?: boolean;
  // Selection props
  /** @source selectedIds from useTableSelection in invoice-list-container.tsx */
  selectedIds?: Set<string>;
  /** @source isAllSelected from useTableSelection in invoice-list-container.tsx */
  isAllSelected?: boolean;
  /** @source isPartiallySelected from useTableSelection in invoice-list-container.tsx */
  isPartiallySelected?: boolean;
  /** @source handleSelect from useTableSelection in invoice-list-container.tsx */
  onSelect?: (id: string, checked: boolean) => void;
  /** @source handleSelectAll from useTableSelection in invoice-list-container.tsx */
  onSelectAll?: (checked: boolean) => void;
  /** @source handleShiftClickRange from useTableSelection in invoice-list-container.tsx */
  onShiftClickRange?: (startIdx: number, endIdx: number) => void;
  /** @source lastClickedIndex from useTableSelection in invoice-list-container.tsx */
  lastClickedIndex?: number | null;
  /** @source setLastClickedIndex from useTableSelection in invoice-list-container.tsx */
  setLastClickedIndex?: (index: number | null) => void;
  /** @source isSelected from useTableSelection in invoice-list-container.tsx */
  isSelected?: (id: string) => boolean;
}

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * Mobile skeleton component
 */
function MobileSkeleton() {
  return (
    <div className="md:hidden space-y-3">
      {[1, 2, 3].map((i) => (
        <Card key={i}>
          <CardContent className="p-4">
            <Skeleton className="h-4 w-24 mb-2" />
            <Skeleton className="h-3 w-32 mb-3" />
            <div className="flex justify-between">
              <Skeleton className="h-6 w-20" />
              <Skeleton className="h-4 w-16" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

/**
 * Pagination component
 */
function Pagination({
  page,
  pageSize,
  total,
  onPageChange,
}: {
  page: number;
  pageSize: number;
  total: number;
  onPageChange?: (page: number) => void;
}) {
  const totalPages = Math.ceil(total / pageSize);

  if (totalPages <= 1) return null;

  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  return (
    <div className="flex items-center justify-between px-2">
      <p className="text-sm text-muted-foreground">
        Showing {start} to {end} of {total} invoices
      </p>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange?.(Math.max(1, page - 1))}
          disabled={page === 1}
        >
          <ChevronLeft className="h-4 w-4" />
          Previous
        </Button>
        <span className="text-sm tabular-nums">
          Page {page} of {totalPages}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange?.(Math.min(totalPages, page + 1))}
          disabled={page >= totalPages}
        >
          Next
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export const InvoiceListPresenter = memo(function InvoiceListPresenter({
  invoices,
  summary,
  total,
  page,
  pageSize,
  sortField,
  sortDirection,
  onSortChange,
  onPageChange,
  onRowClick,
  currency = 'AUD',
  isLoading = false,
  // Selection props
  selectedIds: _selectedIds = new Set(),
  isAllSelected = false,
  isPartiallySelected = false,
  onSelect,
  onSelectAll,
  onShiftClickRange,
  lastClickedIndex = null,
  setLastClickedIndex,
  isSelected,
}: InvoiceListPresenterProps) {
  // Handle shift-click range selection with index tracking
  const handleShiftClickRangeWithIndex = useCallback(
    (rowIndex: number) => {
      if (onShiftClickRange && lastClickedIndex !== null) {
        onShiftClickRange(lastClickedIndex, rowIndex);
      }
      setLastClickedIndex?.(rowIndex);
    },
    [onShiftClickRange, lastClickedIndex, setLastClickedIndex]
  );

  // Handle single select with index tracking
  const handleSelectWithIndex = useCallback(
    (id: string, checked: boolean) => {
      onSelect?.(id, checked);
      const idx = invoices.findIndex((inv) => inv.id === id);
      if (idx !== -1) {
        setLastClickedIndex?.(idx);
      }
    },
    [onSelect, invoices, setLastClickedIndex]
  );

  // Create columns with selection handlers
  const columns = useMemo(
    () =>
      getInvoiceColumns({
        onSelect: handleSelectWithIndex,
        onShiftClickRange: handleShiftClickRangeWithIndex,
        isAllSelected,
        isPartiallySelected,
        onSelectAll,
        isSelected,
      }),
    [
      handleSelectWithIndex,
      handleShiftClickRangeWithIndex,
      isAllSelected,
      isPartiallySelected,
      onSelectAll,
      isSelected,
    ]
  );

  // Convert server sort state to TanStack Table sorting state
  // Map sort fields to column IDs (column IDs may differ from sort field names)
  // Note: createdAt is a valid server sort field but has no visible column
  const sortFieldToColumnId = useMemo(() => {
    const fieldMap: Record<SortField, string | null> = {
      createdAt: null, // No visible column for createdAt
      dueDate: 'invoiceDueDate',
      total: 'total',
      invoiceNumber: 'invoiceNumber',
      customer: 'customer',
    };
    return fieldMap[sortField] ?? null;
  }, [sortField]);

  // Only set sorting state if there's a corresponding column
  const sorting: SortingState = useMemo(() => {
    if (!sortFieldToColumnId) return []; // No visual sort indicator for createdAt
    return [{ id: sortFieldToColumnId, desc: sortDirection === 'desc' }];
  }, [sortFieldToColumnId, sortDirection]);

  // Handle sort changes (server-side)
  // Map column IDs to sort fields (column IDs may differ from query field names)
  const mapColumnIdToSortField = useCallback((columnId: string): SortField => {
    const fieldMap: Record<string, SortField> = {
      invoiceNumber: 'invoiceNumber',
      customer: 'customer',
      invoiceDueDate: 'dueDate', // Column ID -> sort field
      total: 'total',
      balanceDue: 'total', // Balance sorts by total (balanceDue not in sortBy enum)
      createdAt: 'createdAt', // Handle createdAt even if column not visible
    };
    return (fieldMap[columnId] ?? 'createdAt') as SortField;
  }, []);

  const handleSortingChange = useCallback(
    (updater: SortingState | ((prev: SortingState) => SortingState)) => {
      const newSorting = typeof updater === 'function' ? updater(sorting) : updater;
      if (newSorting.length > 0) {
        const columnId = newSorting[0].id;
        const field = mapColumnIdToSortField(columnId);
        const direction = newSorting[0].desc ? 'desc' : 'asc';
        onSortChange(field, direction);
      }
    },
    [sorting, onSortChange, mapColumnIdToSortField]
  );

   
  const table = useReactTable({
    data: invoices,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    manualPagination: true,
    manualSorting: true, // Server-side sorting
    pageCount: Math.ceil(total / pageSize),
    state: {
      pagination: {
        pageIndex: page - 1,
        pageSize,
      },
      sorting,
    },
    onSortingChange: handleSortingChange,
  });

  const handleViewInvoice = useMemo(() => {
    return (invoiceId: string) => {
      onRowClick?.(invoiceId);
    };
  }, [onRowClick]);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <InvoiceSummaryCards summary={summary} currency={currency} />

      {/* Loading state */}
      {isLoading && (
        <div className="space-y-3">
          <div className="hidden md:block rounded-md border">
            <Table>
              <TableHeader>
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <TableHead key={header.id}>
                        <Skeleton className="h-4 w-20" />
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {[1, 2, 3, 4, 5].map((i) => (
                  <TableRow key={i}>
                    {columns.map((_, idx) => (
                      <TableCell key={idx}>
                        <Skeleton className="h-4 w-24" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <MobileSkeleton />
        </div>
      )}

      {/* Content: Desktop Table + Mobile Cards */}
      {!isLoading && (
        <>
          {/* Desktop Table */}
          <div className="hidden md:block rounded-md border">
            <Table>
              <TableHeader>
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <TableHead key={header.id}>
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
                {table.getRowModel().rows?.length ? (
                  table.getRowModel().rows.map((row) => (
                    <TableRow
                      key={row.id}
                      data-state={isSelected?.(row.original.id) && 'selected'}
                      className={cn(
                        onRowClick && 'cursor-pointer transition-colors duration-200 hover:bg-muted/50',
                        isSelected?.(row.original.id) && 'bg-muted/50'
                      )}
                      onClick={() => onRowClick?.(row.original.id)}
                      onKeyDown={(e) => {
                        if ((e.key === 'Enter' || e.key === ' ') && onRowClick) {
                          e.preventDefault();
                          onRowClick(row.original.id);
                        }
                      }}
                      tabIndex={onRowClick ? 0 : undefined}
                      role={onRowClick ? 'button' : undefined}
                      aria-label={onRowClick ? `View invoice ${row.original.invoiceNumber || row.original.orderNumber}` : undefined}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id}>
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext()
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={columns.length}
                      className="h-24 text-center"
                    >
                      No invoices found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden">
            {invoices.length > 0 ? (
              <InvoiceMobileCards
                invoices={invoices}
                onViewInvoice={handleViewInvoice}
              />
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No invoices found.</p>
              </div>
            )}
          </div>
        </>
      )}

      {/* Pagination */}
      <Pagination
        page={page}
        pageSize={pageSize}
        total={total}
        onPageChange={onPageChange}
      />
    </div>
  );
});

InvoiceListPresenter.displayName = 'InvoiceListPresenter';
