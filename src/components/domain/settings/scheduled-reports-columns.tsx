/* eslint-disable react-refresh/only-export-components -- Column file exports column factory with JSX cell renderers */
/**
 * Scheduled Reports Column Definitions
 *
 * TanStack Table column definitions using shared cell components.
 */

import { memo } from 'react';
import { Play, Pause, Loader2, Mail, Pencil, Trash2 } from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import {
  CheckboxCell,
  StatusCell,
  ActionsCell,
  DataTableColumnHeader,
} from '@/components/shared/data-table';
import type { ActionItem } from '@/components/shared/data-table/cells/actions-cell';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { ScheduledReport } from '@/lib/schemas/reports/scheduled-reports';
import {
  SCHEDULED_REPORT_STATUS_CONFIG,
  getScheduledReportStatus,
} from './scheduled-reports-status-config';
import { format, formatDistanceToNow } from 'date-fns';

const FREQUENCY_LABELS: Record<string, string> = {
  daily: 'Daily',
  weekly: 'Weekly',
  biweekly: 'Biweekly',
  monthly: 'Monthly',
  quarterly: 'Quarterly',
};

const FORMAT_LABELS: Record<string, string> = {
  pdf: 'PDF',
  csv: 'CSV',
  xlsx: 'XLSX',
  html: 'HTML',
};

export interface CreateScheduledReportsColumnsOptions {
  onSelect: (id: string, checked: boolean) => void;
  onShiftClickRange: (rowIndex: number) => void;
  isAllSelected: boolean;
  isPartiallySelected: boolean;
  onSelectAll: (checked: boolean) => void;
  isSelected: (id: string) => boolean;
  onEdit: (report: ScheduledReport) => void;
  onDelete: (report: ScheduledReport) => void;
  onExecute: (report: ScheduledReport) => void;
  onToggleActive: (report: ScheduledReport) => void;
  executingReportId: string | null;
}

const NameCell = memo(
  ({ name, description }: { name: string; description?: string | null }) => (
    <div>
      <div className="font-medium">{name}</div>
      {description && (
        <div className="text-xs text-muted-foreground line-clamp-1">{description}</div>
      )}
    </div>
  )
);
NameCell.displayName = 'NameCell';

const RecipientsCell = memo(
  ({ emails }: { emails: string[] }) => (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger className="flex items-center gap-1 text-sm">
          <Mail className="h-3 w-3" />
          <span>{emails?.length ?? 0}</span>
        </TooltipTrigger>
        <TooltipContent>
          {emails?.length > 0 ? (
            <ul className="text-xs">
              {emails.map((email: string) => (
                <li key={email}>{email}</li>
              ))}
            </ul>
          ) : (
            <p>No recipients</p>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
);
RecipientsCell.displayName = 'RecipientsCell';

const NextRunCell = memo(
  ({ report }: { report: ScheduledReport }) => {
    if (!report.isActive) {
      return <span className="text-muted-foreground">—</span>;
    }
    if (!report.nextRunAt) {
      return <span className="text-muted-foreground">Not scheduled</span>;
    }
    const nextRun = new Date(report.nextRunAt);
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger className="text-sm">
            {formatDistanceToNow(nextRun, { addSuffix: true })}
          </TooltipTrigger>
          <TooltipContent>
            <p>{format(nextRun, 'PPpp')}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }
);
NextRunCell.displayName = 'NextRunCell';

const LastRunCell = memo(
  ({ report }: { report: ScheduledReport }) => {
    if (!report.lastRunAt) {
      return <span className="text-muted-foreground">Never</span>;
    }
    const lastRun = new Date(report.lastRunAt);
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger className="text-sm text-muted-foreground">
            {formatDistanceToNow(lastRun, { addSuffix: true })}
          </TooltipTrigger>
          <TooltipContent>
            <p>{format(lastRun, 'PPpp')}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }
);
LastRunCell.displayName = 'LastRunCell';

export function createScheduledReportsColumns(
  options: CreateScheduledReportsColumnsOptions
): ColumnDef<ScheduledReport>[] {
  const {
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
  } = options;

  return [
    {
      id: 'select',
      header: () => (
        <CheckboxCell
          checked={isAllSelected}
          indeterminate={isPartiallySelected}
          onChange={onSelectAll}
          ariaLabel="Select all reports"
        />
      ),
      cell: ({ row }) => (
        <CheckboxCell
          checked={isSelected(row.original.id)}
          onChange={(checked) => onSelect(row.original.id, checked)}
          onShiftClick={() => onShiftClickRange(row.index)}
          ariaLabel={`Select ${row.original.name}`}
        />
      ),
      enableSorting: false,
      enableHiding: false,
      size: 48,
    },
    {
      id: 'name',
      accessorKey: 'name',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Report" />
      ),
      cell: ({ row }) => (
        <NameCell
          name={row.original.name}
          description={row.original.description}
        />
      ),
      enableSorting: false,
      size: 200,
    },
    {
      id: 'frequency',
      accessorKey: 'frequency',
      header: 'Frequency',
      cell: ({ row }) => (
        <span className="text-sm">
          {FREQUENCY_LABELS[row.original.frequency] ?? row.original.frequency}
        </span>
      ),
      enableSorting: false,
      size: 100,
    },
    {
      id: 'format',
      accessorKey: 'format',
      header: 'Format',
      cell: ({ row }) => (
        <span className="text-sm">
          {FORMAT_LABELS[row.original.format] ?? row.original.format}
        </span>
      ),
      enableSorting: false,
      size: 80,
    },
    {
      id: 'recipients',
      accessorFn: (row) => row.recipients?.emails?.length ?? 0,
      header: 'Recipients',
      cell: ({ row }) => (
        <RecipientsCell emails={row.original.recipients?.emails ?? []} />
      ),
      enableSorting: false,
      size: 90,
    },
    {
      id: 'status',
      accessorFn: (row) => getScheduledReportStatus(row),
      header: 'Status',
      cell: ({ row }) => (
        <StatusCell
          status={getScheduledReportStatus(row.original)}
          statusConfig={SCHEDULED_REPORT_STATUS_CONFIG}
          showIcon
        />
      ),
      enableSorting: false,
      size: 100,
    },
    {
      id: 'nextRunAt',
      accessorKey: 'nextRunAt',
      header: 'Next Run',
      cell: ({ row }) => <NextRunCell report={row.original} />,
      enableSorting: false,
      size: 110,
    },
    {
      id: 'lastRunAt',
      accessorKey: 'lastRunAt',
      header: 'Last Run',
      cell: ({ row }) => <LastRunCell report={row.original} />,
      enableSorting: false,
      size: 110,
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => {
        const report = row.original;
        const isExecuting = executingReportId === report.id;

        const actions: ActionItem[] = [
          {
            label: 'Run Now',
            icon: isExecuting ? Loader2 : Play,
            onClick: () => onExecute(report),
            disabled: isExecuting,
          },
          {
            label: report.isActive ? 'Pause' : 'Activate',
            icon: report.isActive ? Pause : Play,
            onClick: () => onToggleActive(report),
          },
          {
            label: 'Edit',
            icon: Pencil,
            onClick: () => onEdit(report),
          },
          {
            label: 'Delete',
            icon: Trash2,
            onClick: () => onDelete(report),
            variant: 'destructive',
            separator: true,
          },
        ];

        return <ActionsCell actions={actions} />;
      },
      enableSorting: false,
      enableHiding: false,
      size: 48,
    },
  ];
}
