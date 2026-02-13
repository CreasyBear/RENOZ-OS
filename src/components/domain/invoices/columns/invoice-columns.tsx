/* eslint-disable react-refresh/only-export-components -- Column file exports column factory with JSX cell renderers */
'use client';

/**
 * Invoice Table Columns
 *
 * Memoized table column definitions for invoice list.
 * Follows TABLE-STANDARDS.md for memoization patterns.
 *
 * @see docs/design-system/TABLE-STANDARDS.md
 * @see docs/design-system/INVOICE-STANDARDS.md
 */

import { memo } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { Link } from '@tanstack/react-router';
import { buttonVariants } from '@/components/ui/button';
import { DataTableColumnHeader, CheckboxCell } from '@/components/shared/data-table';
import { cn } from '@/lib/utils';
import { InvoiceStatusBadge } from '../invoice-status-badge';
import { hasInvoice } from '@/lib/utils/invoice-helpers';
import type { InvoiceListItem } from '@/lib/schemas/invoices';
import type { InvoiceStatus } from '@/lib/constants/invoice-status';

export interface CreateInvoiceColumnsOptions {
  /** Handle single item selection */
  onSelect?: (id: string, checked: boolean) => void;
  /** Handle shift-click range selection */
  onShiftClickRange?: (rowIndex: number) => void;
  /** Whether all items are selected */
  isAllSelected?: boolean;
  /** Whether some items are selected (indeterminate) */
  isPartiallySelected?: boolean;
  /** Handle select all */
  onSelectAll?: (checked: boolean) => void;
  /** Check if item is selected */
  isSelected?: (id: string) => boolean;
}

// ============================================================================
// MEMOIZED CELL COMPONENTS
// ============================================================================

/**
 * Invoice number cell with link
 * Links to invoice detail if invoiceNumber exists, otherwise links to order detail
 */
export const InvoiceNumberCell = memo(function InvoiceNumberCell({
  invoiceNumber,
  orderNumber,
  id,
}: {
  invoiceNumber: string | null;
  orderNumber: string;
  id: string;
}) {
  const displayNumber = invoiceNumber || orderNumber;
  const invoiceExists = hasInvoice({ invoiceNumber });
  
  if (invoiceExists) {
    return (
      <Link
        to="/invoices/$invoiceId"
        params={{ invoiceId: id }}
        className="font-medium text-primary hover:underline"
        onClick={(e) => e.stopPropagation()}
      >
        {displayNumber}
      </Link>
    );
  }
  
  return (
    <Link
      to="/orders/$orderId"
      params={{ orderId: id }}
      className="font-medium text-primary hover:underline"
      onClick={(e) => e.stopPropagation()}
    >
      {displayNumber}
    </Link>
  );
});

/**
 * Customer name cell with link
 */
export const CustomerCell = memo(function CustomerCell({
  customerId,
  name,
  email,
}: {
  customerId: string;
  name: string;
  email: string | null;
}) {
  return (
    <div className="flex flex-col min-w-[180px]">
      <Link
        to="/customers/$customerId"
        params={{ customerId }}
        search={{}}
        className="font-medium hover:underline text-primary"
        onClick={(e) => e.stopPropagation()}
      >
        {name}
      </Link>
      {email && <span className="text-xs text-muted-foreground">{email}</span>}
    </div>
  );
});

/**
 * Status badge cell
 */
export const StatusCell = memo(function StatusCell({
  status,
}: {
  status: InvoiceStatus | null;
}) {
  return <InvoiceStatusBadge status={status} />;
});

/**
 * Date cell
 */
export const DateCell = memo(function DateCell({
  date,
}: {
  date: string | Date | null;
}) {
  if (!date) return <span className="text-muted-foreground">-</span>;

  const formatted = new Date(date).toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  return <span>{formatted}</span>;
});

/**
 * Amount cell with currency formatting
 */
export const AmountCell = memo(function AmountCell({
  amount,
  currency = 'AUD',
}: {
  amount: number | null;
  currency?: string;
}) {
  if (amount == null) return <span className="text-muted-foreground">-</span>;

  const formatted = new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency,
  }).format(amount);

  return <span className="font-medium tabular-nums">{formatted}</span>;
});

/**
 * Actions cell
 */
export const ActionsCell = memo(function ActionsCell({ id }: { id: string }) {
  return (
    <Link
      to="/invoices/$invoiceId"
      params={{ invoiceId: id }}
      className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }))}
      onClick={(e) => e.stopPropagation()}
    >
      View
    </Link>
  );
});

// ============================================================================
// COLUMN DEFINITIONS
// ============================================================================

export function getInvoiceColumns(
  options: CreateInvoiceColumnsOptions = {}
): ColumnDef<InvoiceListItem>[] {
  const {
    onSelect,
    onShiftClickRange,
    isAllSelected = false,
    isPartiallySelected = false,
    onSelectAll,
    isSelected,
  } = options;

  return [
    {
      id: 'select',
      header: () =>
        onSelectAll ? (
          <CheckboxCell
            checked={isAllSelected}
            indeterminate={isPartiallySelected}
            onChange={onSelectAll}
            ariaLabel="Select all invoices"
          />
        ) : null,
      cell: ({ row }) => {
        if (!onSelect || !isSelected) return null;
        const rowIndex = row.index;
        return (
          <CheckboxCell
            checked={isSelected(row.original.id)}
            onChange={(checked) => onSelect(row.original.id, checked)}
            onShiftClick={
              onShiftClickRange
                ? () => {
                    onShiftClickRange(rowIndex);
                  }
                : undefined
            }
            ariaLabel={`Select invoice ${row.original.invoiceNumber || row.original.orderNumber}`}
          />
        );
      },
      enableSorting: false,
      enableHiding: false,
      size: 48,
    },
    {
      accessorKey: 'invoiceNumber',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Invoice #" />
      ),
      cell: ({ row }) => (
        <InvoiceNumberCell
          invoiceNumber={row.original.invoiceNumber}
          orderNumber={row.original.orderNumber}
          id={row.original.id}
        />
      ),
      enableSorting: true,
      size: 120,
    },
    {
      accessorKey: 'orderNumber',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Order #" />
      ),
      cell: ({ row }) => (
        <Link
          to="/orders/$orderId"
          params={{ orderId: row.original.id }}
          className="text-sm text-muted-foreground hover:text-primary hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          {row.original.orderNumber}
        </Link>
      ),
      enableSorting: true,
      size: 120,
    },
    {
      accessorKey: 'customer',
      accessorFn: (row) => row.customer?.name ?? row.customerId,
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Customer" />
      ),
      cell: ({ row }) => (
        <CustomerCell
          customerId={row.original.customer.id}
          name={row.original.customer.name}
          email={row.original.customer.email}
        />
      ),
      enableSorting: true,
      size: 180,
    },
    {
      accessorKey: 'invoiceStatus',
      header: 'Status',
      cell: ({ row }) => <StatusCell status={row.original.invoiceStatus} />,
      enableSorting: false,
      size: 100,
    },
    {
      accessorKey: 'invoiceDueDate',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Due Date" />
      ),
      cell: ({ row }) => <DateCell date={row.original.invoiceDueDate} />,
      enableSorting: true,
      size: 110,
    },
    {
      accessorKey: 'total',
      header: ({ column }) => (
        <div className="text-right">
          <DataTableColumnHeader column={column} title="Amount" />
        </div>
      ),
      cell: ({ row }) => (
        <div className="text-right">
          <AmountCell amount={row.original.total} />
        </div>
      ),
      enableSorting: true,
      size: 120,
    },
    {
      accessorKey: 'balanceDue',
      header: ({ column }) => (
        <div className="text-right">
          <DataTableColumnHeader column={column} title="Balance" />
        </div>
      ),
      cell: ({ row }) => (
        <div className="text-right">
          <AmountCell amount={row.original.balanceDue} />
        </div>
      ),
      enableSorting: true,
      size: 120,
    },
    {
      id: 'actions',
      cell: ({ row }) => <ActionsCell id={row.original.id} />,
      size: 80,
    },
  ];
}
