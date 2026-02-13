/**
 * Receiving Dashboard Component (Presenter)
 *
 * Operational dashboard for goods receiving workflow.
 * Shows purchase orders awaiting receipt with actionable metrics and quick actions.
 *
 * Features:
 * - Actionable metrics (clickable → filtered list)
 * - Proper table structure using TanStack Table (following POTablePresenter pattern)
 * - Bulk selection for bulk receiving
 * - Quick actions (receive single PO)
 * - Real-time updates (30s polling)
 *
 * @see docs/design-system/DASHBOARD-STANDARDS.md (Operational Dashboard)
 * @see docs/design-system/WORKFLOW-CONTINUITY-STANDARDS.md
 * @see docs/design-system/TABLE-STANDARDS.md
 * @see src/components/domain/purchase-orders/po-table-presenter.tsx (reference)
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
import { Package, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ErrorState } from '@/components/shared/error-state';
import { BulkActionsBar, DataTableSkeleton, DataTableEmpty } from '@/components/shared/data-table';
import type { ColumnDef } from '@tanstack/react-table';
import { Link } from '@tanstack/react-router';
import { CheckboxCell, DateCell, PriceCell, DataTableColumnHeader } from '@/components/shared/data-table';
import { TruncateTooltip } from '@/components/shared/truncate-tooltip';
import { cn } from '@/lib/utils';
import type { PurchaseOrderTableData } from '@/lib/schemas/purchase-orders';
import type { ReceivingMetrics } from '@/lib/schemas/procurement/procurement-types';
import { FALLBACK_SUPPLIER_NAME } from '@/lib/constants/procurement';
import { ReceivingStats } from './receiving-stats';

// ============================================================================
// TYPES
// ============================================================================

export interface ReceivingDashboardProps {
  /** Purchase orders awaiting receipt */
  orders: PurchaseOrderTableData[];
  /** Dashboard metrics */
  metrics: ReceivingMetrics;
  /** Loading state */
  isLoading?: boolean;
  /** Error state */
  error?: Error | null;
  /** Refetch function */
  onRefetch?: () => void;
  /** Selected PO IDs */
  selectedIds: Set<string>;
  /** Whether all items are selected */
  isAllSelected: boolean;
  /** Whether some items are selected */
  isPartiallySelected: boolean;
  /** Handle single item selection */
  onSelect: (id: string, checked: boolean) => void;
  /** Handle select all */
  onSelectAll: (checked: boolean) => void;
  /** Handle shift-click range selection */
  onShiftClickRange: (startIdx: number, endIdx: number) => void;
  /** Clear selection */
  onClearSelection: () => void;
  /** Check if item is selected */
  isSelected: (id: string) => boolean;
  /** Navigate to PO detail view */
  onViewPO?: (poId: string) => void;
  /** Open receiving dialog for single PO */
  onReceivePO?: (poId: string) => void;
  /** Bulk receive handler */
  onBulkReceive?: () => void;
  /** Additional className */
  className?: string;
}

// ============================================================================
// COLUMN DEFINITIONS
// ============================================================================

function createReceivingColumns(
  options: {
    isAllSelected: boolean;
    isPartiallySelected: boolean;
    onSelectAll: (checked: boolean) => void;
    onSelect: (id: string, checked: boolean) => void;
    onShiftClickRange: (startIdx: number, endIdx: number) => void;
    isSelected: (id: string) => boolean;
    onReceivePO?: (poId: string) => void;
  }
): ColumnDef<PurchaseOrderTableData>[] {
  const {
    isAllSelected,
    isPartiallySelected,
    onSelectAll,
    onSelect,
    onShiftClickRange,
    isSelected,
    onReceivePO,
  } = options;

  return [
    // Checkbox column
    {
      id: 'select',
      header: () => (
        <CheckboxCell
          checked={isAllSelected}
          indeterminate={isPartiallySelected}
          onChange={onSelectAll}
          ariaLabel="Select all purchase orders"
        />
      ),
      cell: ({ row }) => (
        <CheckboxCell
          checked={isSelected(row.original.id)}
          onChange={(checked) => onSelect(row.original.id, checked)}
          onShiftClick={() => onShiftClickRange(row.index, row.index)}
          ariaLabel={`Select purchase order ${row.original.poNumber}`}
        />
      ),
      enableSorting: false,
      enableHiding: false,
      size: 48,
    },

    // PO Number column
    {
      id: 'poNumber',
      accessorKey: 'poNumber',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="PO #" />
      ),
      cell: ({ row }) => (
        <Link
          to="/purchase-orders/$poId"
          params={{ poId: row.original.id }}
          className="font-medium text-primary hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          {row.original.poNumber}
        </Link>
      ),
      enableSorting: true,
      size: 120,
    },

    // Supplier column
    {
      id: 'supplierName',
      accessorKey: 'supplierName',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Supplier" />
      ),
      cell: ({ row }) => {
        const supplierName = row.original.supplierName;
        return (
          <span className="text-sm truncate block max-w-[200px]">
            {supplierName ? (
              <Link
                to="/suppliers/$supplierId"
                params={{ supplierId: row.original.supplierId }}
                className="hover:underline"
                onClick={(e) => e.stopPropagation()}
              >
                <TruncateTooltip text={supplierName} maxLength={24} />
              </Link>
            ) : (
              <span className="text-muted-foreground">{FALLBACK_SUPPLIER_NAME}</span>
            )}
          </span>
        );
      },
      enableSorting: true,
      size: 200,
    },

    // Order Date column
    {
      id: 'orderDate',
      accessorKey: 'orderDate',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Order Date" />
      ),
      cell: ({ row }) => (
        <DateCell value={row.original.orderDate} format="short" />
      ),
      enableSorting: true,
      size: 120,
    },

    // Expected Delivery column
    {
      id: 'expectedDeliveryDate',
      accessorKey: 'expectedDeliveryDate',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Expected Delivery" />
      ),
      cell: ({ row }) => (
        <DateCell value={row.original.expectedDeliveryDate} format="short" />
      ),
      enableSorting: true,
      size: 140,
    },

    // Total Amount column
    {
      id: 'totalAmount',
      accessorKey: 'totalAmount',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Total" className="justify-end" />
      ),
      cell: ({ row }) => (
        <PriceCell value={row.original.totalAmount} currency={row.original.currency} align="right" />
      ),
      enableSorting: true,
      size: 120,
    },

    // Actions column
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <div className="flex items-center justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onReceivePO?.(row.original.id);
            }}
            className="h-8"
          >
            <Package className="h-4 w-4 mr-1.5" />
            Receive
          </Button>
        </div>
      ),
      enableSorting: false,
      enableHiding: false,
      size: 120,
    },
  ];
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const ReceivingDashboard = memo(function ReceivingDashboard({
  orders,
  metrics,
  isLoading = false,
  error,
  onRefetch,
  selectedIds,
  isAllSelected,
  isPartiallySelected,
  onSelect,
  onSelectAll,
  onShiftClickRange,
  onClearSelection,
  isSelected,
  onViewPO,
  onReceivePO,
  onBulkReceive,
  className,
}: ReceivingDashboardProps) {
  // Create column definitions
  const columns = useMemo<ColumnDef<PurchaseOrderTableData>[]>(
    () =>
      createReceivingColumns({
        isAllSelected,
        isPartiallySelected,
        onSelectAll,
        onSelect,
        onShiftClickRange,
        isSelected,
        onReceivePO,
      }),
    [
      isAllSelected,
      isPartiallySelected,
      onSelectAll,
      onSelect,
      onShiftClickRange,
      isSelected,
      onReceivePO,
    ]
  );

  // Table instance (client-side sorting for operational dashboard)
  const sorting: SortingState = useMemo(() => [], []);

  // eslint-disable-next-line react-hooks/incompatible-library -- useReactTable returns functions that cannot be memoized; known TanStack Table limitation
  const table = useReactTable({
    data: orders,
    columns,
    getCoreRowModel: getCoreRowModel(),
    state: { sorting },
  });

  // Loading state
  if (isLoading && orders.length === 0) {
    return (
      <div className={cn('space-y-6', className)}>
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Goods Receiving</h2>
            <p className="text-muted-foreground mt-1">
              Receive goods against purchase orders and update inventory
            </p>
          </div>
        </div>

        {/* Metrics skeleton */}
        <ReceivingStats
          totalOrders={0}
          totalValue={0}
          supplierCount={0}
          oldestOrderDate={null}
          isLoading={true}
        />

        {/* Table skeleton */}
        <DataTableSkeleton
          rows={5}
          columns={[
            { skeleton: { type: 'checkbox' } },
            { skeleton: { type: 'text', width: 'w-24' } },
            { skeleton: { type: 'text', width: 'w-32' } },
            { skeleton: { type: 'text', width: 'w-24' } },
            { skeleton: { type: 'text', width: 'w-28' } },
            { skeleton: { type: 'text', width: 'w-20' } },
            { skeleton: { type: 'actions' } },
          ]}
        />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className={cn('space-y-6', className)}>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Goods Receiving</h2>
            <p className="text-muted-foreground mt-1">
              Receive goods against purchase orders and update inventory
            </p>
          </div>
        </div>
        <ErrorState
          title="Failed to load receiving data"
          message={error.message || 'Unable to load purchase orders awaiting receipt.'}
          onRetry={onRefetch}
        />
      </div>
    );
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header with refresh */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Goods Receiving</h2>
          <p className="text-muted-foreground mt-1">
            Receive goods against purchase orders and update inventory
          </p>
        </div>
        {onRefetch && (
          <Button variant="outline" size="sm" onClick={onRefetch} disabled={isLoading}>
            <RefreshCw className={cn('h-4 w-4 mr-2', isLoading && 'animate-spin')} />
            Refresh
          </Button>
        )}
      </div>

      {/* Metrics */}
      <ReceivingStats
        totalOrders={metrics.totalOrders}
        totalValue={metrics.totalValue}
        supplierCount={metrics.supplierCount}
        oldestOrderDate={metrics.oldestOrderDate}
        isLoading={isLoading}
      />

      {/* Orders Table */}
      {orders.length === 0 ? (
        <DataTableEmpty
          variant="no-results"
          icon={Package}
          title="No orders awaiting receipt"
          description="All purchase orders have been received. New orders will appear here once they are marked as 'ordered'."
        />
      ) : (
        <div className={cn('border rounded-lg')}>
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
                  className={cn(
                    'cursor-pointer hover:bg-muted/50 transition-colors',
                    selectedIds.has(row.original.id) && 'bg-muted/50'
                  )}
                  onClick={() => onViewPO?.(row.original.id)}
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
      )}

      {/* Bulk Actions Bar */}
      <BulkActionsBar selectedCount={selectedIds.size} onClear={onClearSelection}>
        <Button
          size="sm"
          onClick={onBulkReceive}
          disabled={!onBulkReceive || selectedIds.size === 0}
        >
          <Package className="h-4 w-4 mr-2" />
          Bulk Receive ({selectedIds.size})
        </Button>
      </BulkActionsBar>
    </div>
  );
});
