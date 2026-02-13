/* eslint-disable react-refresh/only-export-components -- Column file exports column factory with JSX cell renderers */
/**
 * Approval Column Definitions
 *
 * TanStack Table column definitions using shared cell components.
 * Follows TABLE-STANDARDS.md patterns with memoized cell components.
 *
 * @see docs/design-system/TABLE-STANDARDS.md
 */

import { memo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { ColumnDef, Column } from '@tanstack/react-table';
import {
  CheckboxCell,
  StatusCell,
  PriceCell,
  DateCell,
  ActionsCell,
  DataTableColumnHeader,
} from '@/components/shared/data-table';
import type { ActionItem } from '@/components/shared/data-table/cells/actions-cell';
import { APPROVAL_STATUS_CONFIG, APPROVAL_PRIORITY_CONFIG } from './approval-status-config';
import { getDaysOverdue } from '@/lib/utils/approvals';
import { cn } from '@/lib/utils';
import type { ApprovalItem } from '@/lib/schemas/approvals';

// ============================================================================
// TYPES
// ============================================================================

export interface CreateApprovalColumnsOptions {
  /** Whether this is the pending tab (affects which columns are shown) */
  isPendingTab: boolean;
  /** Handle single item selection */
  onSelect: (id: string, checked: boolean) => void;
  /** Handle select all */
  onSelectAll: (checked: boolean) => void;
  /** Handle decision click (review action) */
  onDecisionClick: (item: ApprovalItem) => void;
  /** Selected item IDs */
  selectedItems: string[];
  /** All items (for select all) */
  allItems: ApprovalItem[];
}

// ============================================================================
// MEMOIZED CUSTOM CELL COMPONENTS
// ============================================================================

const LevelCell = memo(function LevelCell({ level }: { level?: number }) {
  return (
    <Badge variant="outline">
      Level {level ?? '-'}
    </Badge>
  );
});
LevelCell.displayName = 'LevelCell';

const DaysOverdueCell = memo(function DaysOverdueCell({ dueDate }: { dueDate?: string }) {
  const daysOverdue = getDaysOverdue(dueDate);
  if (daysOverdue === null) {
    return <span className="text-sm text-muted-foreground">-</span>;
  }
  return (
    <Badge variant="destructive">
      {daysOverdue}d overdue
    </Badge>
  );
});
DaysOverdueCell.displayName = 'DaysOverdueCell';

const EscalationCell = memo(function EscalationCell({ escalatedTo }: { escalatedTo?: string | null }) {
  if (!escalatedTo) {
    return <span className="text-sm text-muted-foreground">-</span>;
  }
  return (
    <StatusCell
      status="escalated"
      statusConfig={APPROVAL_STATUS_CONFIG}
      showIcon
    />
  );
});
EscalationCell.displayName = 'EscalationCell';

const PoNumberCell = memo(function PoNumberCell({ 
  poNumber, 
  isPendingTab 
}: { 
  poNumber?: string; 
  isPendingTab: boolean;
}) {
  return (
    <div className={cn(
      'text-sm font-mono',
      isPendingTab && 'sticky left-12 z-10 bg-background',
      !isPendingTab && 'sticky left-0 z-10 bg-background'
    )}>
      {poNumber || '-'}
    </div>
  );
});
PoNumberCell.displayName = 'PoNumberCell';

const ReviewActionsCell = memo(function ReviewActionsCell({
  item,
  isPendingTab,
  onDecisionClick,
}: {
  item: ApprovalItem;
  isPendingTab: boolean;
  onDecisionClick: (item: ApprovalItem) => void;
}) {
  if (!isPendingTab) {
    return null;
  }

  const actions: ActionItem[] = [
    {
      label: 'Review',
      onClick: () => onDecisionClick(item),
    },
  ];

  return (
    <div className="flex items-center gap-2">
      {/* Desktop: Button */}
      <Button
        size="sm"
        onClick={(e) => {
          e.stopPropagation();
          onDecisionClick(item);
        }}
        className="hidden md:inline-flex transition-colors"
        aria-label={`Review ${item.poNumber || 'approval'}`}
      >
        Review
      </Button>
      {/* Mobile: Dropdown menu */}
      <ActionsCell
        actions={actions}
        align="end"
        className="md:hidden"
      />
    </div>
  );
});
ReviewActionsCell.displayName = 'ReviewActionsCell';

// ============================================================================
// COLUMN DEFINITIONS
// ============================================================================

export function createApprovalColumns(
  options: CreateApprovalColumnsOptions
): ColumnDef<ApprovalItem>[] {
  const { isPendingTab, onSelect, onSelectAll, onDecisionClick, selectedItems, allItems } = options;

  const allSelected = selectedItems.length === allItems.length && allItems.length > 0;
  const isPartiallySelected = selectedItems.length > 0 && selectedItems.length < allItems.length;

  const columns: ColumnDef<ApprovalItem>[] = [];

  // Checkbox column (only on pending tab)
  if (isPendingTab) {
    const CheckboxHeaderCell = memo(function CheckboxHeaderCell() {
      return (
        <div className="sticky left-0 z-10 bg-background">
          <CheckboxCell
            checked={allSelected}
            indeterminate={isPartiallySelected}
            onChange={onSelectAll}
            ariaLabel="Select all approvals"
          />
        </div>
      );
    });
    CheckboxHeaderCell.displayName = 'CheckboxHeaderCell';

    const CheckboxRowCell = memo(function CheckboxRowCell({ itemId, poNumber }: { itemId: string; poNumber?: string }) {
      return (
        <div className="sticky left-0 z-10 bg-background">
          <CheckboxCell
            checked={selectedItems.includes(itemId)}
            onChange={(checked) => onSelect(itemId, checked)}
            ariaLabel={`Select ${poNumber || itemId}`}
          />
        </div>
      );
    });
    CheckboxRowCell.displayName = 'CheckboxRowCell';

    columns.push({
      id: 'select',
      header: () => <CheckboxHeaderCell />,
      cell: ({ row }) => (
        <CheckboxRowCell itemId={row.original.id} poNumber={row.original.poNumber} />
      ),
      enableSorting: false,
      size: 50,
    });
  }

  // PO Number column
  const PoNumberHeaderCell = memo(function PoNumberHeaderCell({ column }: { column: Column<ApprovalItem, unknown> }) {
    return (
      <div className={cn(
        isPendingTab && 'sticky left-12 z-10 bg-background',
        !isPendingTab && 'sticky left-0 z-10 bg-background'
      )}>
        <DataTableColumnHeader column={column} title="PO Number" />
      </div>
    );
  });
  PoNumberHeaderCell.displayName = 'PoNumberHeaderCell';

  columns.push({
    id: 'poNumber',
    accessorKey: 'poNumber',
    header: ({ column }) => <PoNumberHeaderCell column={column} />,
    cell: ({ row }) => (
      <PoNumberCell poNumber={row.original.poNumber} isPendingTab={isPendingTab} />
    ),
    enableSorting: true,
    size: 120,
  });

  // Status column
  columns.push({
    id: 'status',
    accessorKey: 'status',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Status" />
    ),
    cell: ({ row }) => (
      <StatusCell
        status={row.original.status}
        statusConfig={APPROVAL_STATUS_CONFIG}
        showIcon
      />
    ),
    enableSorting: true,
    size: 100,
  });

  // Level column
  columns.push({
    id: 'level',
    accessorKey: 'level',
    header: 'Level',
    cell: ({ row }) => <LevelCell level={row.original.level} />,
    enableSorting: false,
    size: 80,
  });

  // Supplier column
  columns.push({
    id: 'supplierName',
    accessorKey: 'supplierName',
    header: 'Supplier',
    cell: ({ row }) => (
      <span className="text-sm">{row.original.supplierName || '-'}</span>
    ),
    enableSorting: false,
    size: 150,
  });

  // Requester column
  columns.push({
    id: 'requester',
    accessorKey: 'requester',
    header: 'Requester',
    cell: ({ row }) => (
      <span className="text-sm">{row.original.requester}</span>
    ),
    enableSorting: false,
    size: 120,
  });

  // Amount column
  columns.push({
    id: 'amount',
    accessorKey: 'amount',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Amount" />
    ),
    cell: ({ row }) => (
      <PriceCell
        value={row.original.amount}
        currency={row.original.currency}
        showCents={true}
        align="right"
        className="font-medium"
      />
    ),
    enableSorting: true,
    size: 100,
  });

  // Priority column
  columns.push({
    id: 'priority',
    accessorKey: 'priority',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Priority" />
    ),
    cell: ({ row }) => (
      <StatusCell
        status={row.original.priority as 'low' | 'medium' | 'high' | 'urgent'}
        statusConfig={APPROVAL_PRIORITY_CONFIG}
        showIcon
      />
    ),
    enableSorting: true,
    size: 100,
  });

  // Days Overdue column (only on pending tab)
  if (isPendingTab) {
    columns.push({
      id: 'daysOverdue',
      accessorFn: (row) => getDaysOverdue(row.dueDate),
      header: 'Days Overdue',
      cell: ({ row }) => <DaysOverdueCell dueDate={row.original.dueDate} />,
      enableSorting: true,
      size: 120,
    });
  }

  // Escalation column
  columns.push({
    id: 'escalation',
    accessorKey: 'escalatedTo',
    header: 'Escalation',
    cell: ({ row }) => <EscalationCell escalatedTo={row.original.escalatedTo} />,
    enableSorting: false,
    size: 100,
  });

  // Submitted date column
  columns.push({
    id: 'submittedAt',
    accessorKey: 'submittedAt',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Submitted" />
    ),
    cell: ({ row }) => (
      <DateCell value={row.original.submittedAt} format="short" />
    ),
    enableSorting: true,
    size: 100,
  });

  // Due date column (only on pending tab)
  if (isPendingTab) {
    columns.push({
      id: 'dueDate',
      accessorKey: 'dueDate',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Due" />
      ),
      cell: ({ row }) => (
        <DateCell value={row.original.dueDate || null} format="short" fallback="-" />
      ),
      enableSorting: true,
      size: 100,
    });
  }

  // Actions column
  const ActionsHeaderCell = memo(function ActionsHeaderCell() {
    return <div className="sticky right-0 z-10 bg-background" />;
  });
  ActionsHeaderCell.displayName = 'ActionsHeaderCell';

  columns.push({
    id: 'actions',
    header: () => <ActionsHeaderCell />,
    cell: ({ row }) => (
      <div className="sticky right-0 z-10 bg-background">
        <ReviewActionsCell
          item={row.original}
          isPendingTab={isPendingTab}
          onDecisionClick={onDecisionClick}
        />
      </div>
    ),
    enableSorting: false,
    size: 100,
  });

  return columns;
}
