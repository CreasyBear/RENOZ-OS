/**
 * Credit Note Column Definitions
 *
 * TanStack Table column definitions using shared cell components.
 */

import { Link } from '@tanstack/react-router';
import { FileText, Receipt, Download, Ban } from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import {
  StatusCell,
  PriceCell,
  DateCell,
  ActionsCell,
  DataTableColumnHeader,
  CheckboxCell,
} from '@/components/shared/data-table';
import type { ActionItem } from '@/components/shared/data-table/cells/actions-cell';
import { CREDIT_NOTE_STATUS_CONFIG } from './credit-note-status-config';
import type { CreditNoteWithCustomer } from '@/lib/schemas/financial/credit-notes';

/**
 * Credit note list item type - matches server function response
 */
export type CreditNoteTableItem = CreditNoteWithCustomer;

export interface CreateCreditNoteColumnsOptions {
  /** Handle single item selection */
  onSelect: (id: string, checked: boolean) => void;
  /** Handle shift-click range selection */
  onShiftClickRange: (rowIndex: number) => void;
  /** Whether all items are selected */
  isAllSelected: boolean;
  /** Whether some items are selected (indeterminate) */
  isPartiallySelected: boolean;
  /** Handle select all */
  onSelectAll: (checked: boolean) => void;
  /** Check if item is selected */
  isSelected: (id: string) => boolean;
  /** Issue credit note handler */
  onIssue: (id: string) => void;
  /** Apply credit note handler (opens dialog) */
  onApply: (id: string) => void;
  /** Void credit note handler */
  onVoid: (id: string) => void;
  /** Generate PDF handler */
  onGeneratePdf: (id: string) => void;
  /** Whether mutations are pending */
  isMutating: boolean;
  /** Whether PDF generation is pending */
  isGeneratingPdf: boolean;
}

/**
 * Create column definitions for the credit notes table.
 */
export function createCreditNoteColumns(
  options: CreateCreditNoteColumnsOptions
): ColumnDef<CreditNoteTableItem>[] {
  const {
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
          ariaLabel="Select all credit notes"
        />
      ),
      cell: ({ row }) => (
        <CheckboxCell
          checked={isSelected(row.original.id)}
          onChange={(checked) => onSelect(row.original.id, checked)}
          onShiftClick={() => onShiftClickRange(row.index)}
          ariaLabel={`Select credit note ${row.original.creditNoteNumber ?? row.original.id}`}
        />
      ),
      enableSorting: false,
      enableHiding: false,
      size: 48,
    },

    // Credit Note Number column (not sortable - server doesn't support it)
    {
      id: 'creditNoteNumber',
      accessorKey: 'creditNoteNumber',
      header: 'Credit Note #',
      cell: ({ row }) => {
        const number = row.original.creditNoteNumber;
        const displayNumber = number ?? `CN-${row.original.id.slice(0, 8)}`;
        const id = row.original.id;
        return (
          <Link
            to="/financial/credit-notes/$creditNoteId"
            params={{ creditNoteId: id }}
            className="font-medium text-sm text-primary hover:underline"
          >
            {displayNumber}
          </Link>
        );
      },
      enableSorting: false, // Server doesn't support sorting by creditNoteNumber
      size: 140,
    },

    // Date column
    {
      id: 'createdAt',
      accessorKey: 'createdAt',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Date" />
      ),
      cell: ({ row }) => (
        <DateCell value={row.original.createdAt} format="short" />
      ),
      enableSorting: true,
      size: 120,
    },

    // Customer column
    {
      id: 'customer',
      accessorFn: (row) => row.customer?.name ?? row.customerId,
      header: 'Customer',
      cell: ({ row }) => {
        const customer = row.original.customer;
        if (customer) {
          return (
            <Link
              to="/customers/$customerId"
              params={{ customerId: customer.id }}
              search={{}}
              className="text-sm hover:underline text-primary"
              onClick={(e) => e.stopPropagation()}
            >
              {customer.name}
            </Link>
          );
        }
        return (
          <span className="text-sm text-muted-foreground">
            {row.original.customerId.slice(0, 8)}...
          </span>
        );
      },
      enableSorting: true,
      size: 180,
    },

    // Amount column
    {
      id: 'amount',
      accessorKey: 'amount',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Amount" />
      ),
      cell: ({ row }) => (
        <PriceCell value={row.original.amount} align="right" />
      ),
      enableSorting: true,
      size: 120,
    },

    // Status column
    {
      id: 'status',
      accessorKey: 'status',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Status" />
      ),
      cell: ({ row }) => (
        <StatusCell
          status={row.original.status}
          statusConfig={CREDIT_NOTE_STATUS_CONFIG}
          showIcon
        />
      ),
      enableSorting: true,
      size: 120,
    },

    // Applied To column (shows order number if applied)
    {
      id: 'appliedTo',
      accessorFn: (row) => row.appliedToOrderId ?? null,
      header: 'Applied To',
      cell: ({ row }) => {
        const appliedToOrderId = row.original.appliedToOrderId;
        const order = row.original.order;
        
        if (appliedToOrderId) {
          const orderNumber = order?.orderNumber ?? `Order ${appliedToOrderId.slice(0, 8)}`;
          return (
            <Link
              to="/orders/$orderId"
              params={{ orderId: appliedToOrderId }}
              className="text-sm hover:underline text-primary"
              onClick={(e) => e.stopPropagation()}
            >
              {orderNumber}
            </Link>
          );
        }
        return <span className="text-sm text-muted-foreground">—</span>;
      },
      enableSorting: false,
      size: 140,
    },

    // Actions column
    {
      id: 'actions',
      cell: ({ row }) => {
        const creditNote = row.original;
        const status = creditNote.status;
        const actions: ActionItem[] = [];

        // Issue action (draft only)
        if (status === 'draft') {
          actions.push({
            label: 'Issue',
            icon: FileText,
            onClick: () => onIssue(creditNote.id),
            disabled: isMutating,
          });
        }

        // Apply action (issued only)
        if (status === 'issued') {
          actions.push({
            label: 'Apply to Invoice',
            icon: Receipt,
            onClick: () => onApply(creditNote.id),
            disabled: isMutating,
          });
        }

        // PDF generation (issued or applied)
        if (status === 'issued' || status === 'applied') {
          actions.push({
            label: 'Download PDF',
            icon: Download,
            onClick: () => onGeneratePdf(creditNote.id),
            disabled: isGeneratingPdf,
            separator: actions.length > 0,
          });
        }

        // Void action (draft or issued)
        if (status === 'draft' || status === 'issued') {
          actions.push({
            label: 'Void',
            icon: Ban,
            onClick: () => onVoid(creditNote.id),
            variant: 'destructive',
            disabled: isMutating,
            separator: actions.length > 0,
          });
        }

        return <ActionsCell actions={actions} />;
      },
      enableSorting: false,
      size: 50,
    },
  ];
}
