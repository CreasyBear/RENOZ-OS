/**
 * RMA List Component
 *
 * Displays a list of RMAs with filters and actions.
 * Can be used on customer detail pages or dedicated RMA page.
 *
 * @see src/hooks/use-rma.ts for data hooks
 * @see _Initiation/_prd/2-domains/support/support.prd.json - DOM-SUP-003c
 */

'use client';

import { useMemo } from 'react';
import { type ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/shared/data-table/data-table';
import { CheckboxCell, DataTableColumnHeader } from '@/components/shared/data-table';
import { RmaStatusBadge, RmaReasonBadge, RmaResolutionBadge } from './rma-status-badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/shared/empty-state';
import { LoadingState } from '@/components/shared/loading-state';
import { ErrorState } from '@/components/shared/error-state';
import type {
  LinkedIssueOpenState,
  RmaExecutionStatus,
  RmaReason,
  RmaResolution,
  RmaResponse,
  RmaStatus,
} from '@/lib/schemas/support/rma';
import { formatDistanceToNow } from 'date-fns';
import { Plus, Search, Package, Eye, MoreHorizontal } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  getRmaExecutionContextSummary,
  getRmaExecutionStatusLabel,
  RMA_EXECUTION_STATUS_OPTIONS,
  RMA_LINKED_ISSUE_STATE_OPTIONS,
  RMA_REASON_OPTIONS,
  RMA_RESOLUTION_OPTIONS,
  RMA_STATUS_OPTIONS,
} from './rma-options';
import type { RmaSortField, SortDirection } from './rma-sorting';

interface RmaListProps {
  /** From route container (useRmas). */
  rmas: RmaResponse[];
  /** From route container (useRmas). */
  totalCount: number;
  /** From route container (useRmas). */
  isLoading?: boolean;
  /** From route container (useRmas). */
  error?: Error | null;
  /** From route container (useRmas). */
  onRetry?: () => void;
  /** From route container (filter state). */
  statusFilter: RmaStatus | 'all';
  /** From route container (filter state). */
  reasonFilter: RmaReason | 'all';
  resolutionFilter: RmaResolution | 'all';
  executionStatusFilter: RmaExecutionStatus | 'all';
  linkedIssueOpenStateFilter: LinkedIssueOpenState;
  /** From route container (filter state). */
  searchQuery: string;
  /** From route container (pagination state). */
  page: number;
  /** From route container (sorting state). */
  sortBy: RmaSortField;
  sortOrder: SortDirection;
  /** From route container (filter handler). */
  onStatusFilterChange: (value: RmaStatus | 'all') => void;
  /** From route container (filter handler). */
  onReasonFilterChange: (value: RmaReason | 'all') => void;
  onResolutionFilterChange: (value: RmaResolution | 'all') => void;
  onExecutionStatusFilterChange: (value: RmaExecutionStatus | 'all') => void;
  onLinkedIssueOpenStateChange: (value: LinkedIssueOpenState) => void;
  /** From route container (filter handler). */
  onSearchChange: (value: string) => void;
  /** From route container (pagination handler). */
  onPageChange: (page: number) => void;
  /** From route container (sorting handler). */
  onSortChange?: (sortBy: RmaSortField, sortOrder: SortDirection) => void;
  /** Callback to create new RMA */
  onCreateRma?: () => void;
  /** Callback when RMA is clicked */
  onRmaClick?: (rma: RmaResponse) => void;
  /** Show create button */
  showCreateButton?: boolean;
  /** Show filters */
  showFilters?: boolean;
  /** Page size */
  pageSize?: number;
  /** Additional class names */
  className?: string;
  /** Selection state for bulk actions (when provided, shows checkbox column) */
  selection?: {
    isSelected: (id: string) => boolean;
    isAllSelected: boolean;
    isPartiallySelected: boolean;
    onSelect: (id: string, checked: boolean) => void;
    onSelectAll: (checked: boolean) => void;
    onShiftClickRange: (rowIndex: number) => void;
    lastClickedIndex: number | null;
    setLastClickedIndex: (index: number | null) => void;
  };
}

export function RmaList({
  rmas,
  totalCount,
  isLoading,
  error,
  onRetry,
  statusFilter,
  reasonFilter,
  resolutionFilter,
  executionStatusFilter,
  linkedIssueOpenStateFilter,
  searchQuery,
  page,
  sortBy,
  sortOrder,
  onStatusFilterChange,
  onReasonFilterChange,
  onResolutionFilterChange,
  onExecutionStatusFilterChange,
  onLinkedIssueOpenStateChange,
  onSearchChange,
  onPageChange,
  onSortChange,
  onCreateRma,
  onRmaClick,
  showCreateButton = true,
  showFilters = true,
  pageSize = 10,
  className,
  selection,
}: RmaListProps) {
  // Column definitions
  const columns: ColumnDef<RmaResponse>[] = useMemo(
    () => [
      ...(selection
        ? [
            {
              id: 'select',
              header: () => (
                <CheckboxCell
                  checked={selection.isAllSelected}
                  onChange={selection.onSelectAll}
                  indeterminate={selection.isPartiallySelected}
                  ariaLabel="Select all"
                />
              ),
              cell: ({ row }) => (
                <div onClick={(e) => e.stopPropagation()}>
                  <CheckboxCell
                    checked={selection.isSelected(row.original.id)}
                    onChange={(checked) => selection.onSelect(row.original.id, checked)}
                    onShiftClick={() => selection.onShiftClickRange(row.index)}
                    ariaLabel={`Select ${row.original.rmaNumber}`}
                  />
                </div>
              ),
              meta: { skipRowClick: true },
            } as ColumnDef<RmaResponse>,
          ]
        : []),
      {
        accessorKey: 'rmaNumber',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="RMA Number" />
        ),
        cell: ({ row }) => (
          <span className="font-mono text-sm font-medium">{row.original.rmaNumber}</span>
        ),
      },
      {
        accessorKey: 'status',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Status" />
        ),
        cell: ({ row }) => <RmaStatusBadge status={row.original.status} />,
      },
      {
        accessorKey: 'reason',
        header: 'Reason',
        cell: ({ row }) => <RmaReasonBadge reason={row.original.reason} />,
      },
      {
        id: 'resolution',
        header: 'Remedy',
        cell: ({ row }) => (
          <div className="flex flex-col gap-1">
            {row.original.resolution ? (
              <RmaResolutionBadge resolution={row.original.resolution} />
            ) : (
              <span className="text-muted-foreground text-sm">Not selected</span>
            )}
            <ExecutionBadge status={row.original.executionStatus} />
          </div>
        ),
      },
      {
        id: 'context',
        header: 'Context',
        cell: ({ row }) => {
          const summary = getRmaExecutionContextSummary(row.original.execution, row.original.issueId);

          return (
            <div className="space-y-1 text-sm">
              <div className="font-medium">{summary.title}</div>
              {summary.detail ? (
                <div className="text-muted-foreground line-clamp-2">{summary.detail}</div>
              ) : null}
              <div className="text-muted-foreground">
                {row.original.orderId ? `Order ${row.original.orderId.slice(0, 8)}` : 'No order'}
                {row.original.linkedIssueOpen !== null && row.original.linkedIssueOpen !== undefined
                  ? ` · Issue ${row.original.linkedIssueOpen ? 'open' : 'closed'}`
                  : ''}
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: 'createdAt',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Created" />
        ),
        cell: ({ row }) => (
          <span className="text-muted-foreground text-sm">
            {formatDistanceToNow(new Date(row.original.createdAt), {
              addSuffix: true,
            })}
          </span>
        ),
      },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onRmaClick?.(row.original)}>
                <Eye className="mr-2 h-4 w-4" />
                View Details
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      },
    ],
    [onRmaClick, selection]
  );

  // Loading state
  if (isLoading) {
    return <LoadingState text="Loading RMAs..." />;
  }

  // Error state
  if (error) {
    return <ErrorState title="Failed to load RMAs" message={error.message} onRetry={onRetry} />;
  }

  return (
    <div className={className}>
      {/* Header with filters */}
      {showFilters && (
        <div className="mb-4 flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative min-w-[200px] flex-1">
            <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
            <Input
              placeholder="Search by RMA number..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Status filter */}
          <Select
            value={statusFilter}
            onValueChange={(v) => onStatusFilterChange(v as RmaStatus | 'all')}
          >
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              {RMA_STATUS_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Reason filter */}
          <Select
            value={reasonFilter}
            onValueChange={(v) => onReasonFilterChange(v as RmaReason | 'all')}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Reason" />
            </SelectTrigger>
            <SelectContent>
              {RMA_REASON_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={resolutionFilter}
            onValueChange={(v) => onResolutionFilterChange(v as RmaResolution | 'all')}
          >
            <SelectTrigger className="w-[170px]">
              <SelectValue placeholder="Resolution" />
            </SelectTrigger>
            <SelectContent>
              {RMA_RESOLUTION_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={executionStatusFilter}
            onValueChange={(v) => onExecutionStatusFilterChange(v as RmaExecutionStatus | 'all')}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Execution" />
            </SelectTrigger>
            <SelectContent>
              {RMA_EXECUTION_STATUS_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={linkedIssueOpenStateFilter}
            onValueChange={(v) => onLinkedIssueOpenStateChange(v as LinkedIssueOpenState)}
          >
            <SelectTrigger className="w-[170px]">
              <SelectValue placeholder="Issue State" />
            </SelectTrigger>
            <SelectContent>
              {RMA_LINKED_ISSUE_STATE_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Create button */}
          {showCreateButton && onCreateRma && (
            <Button onClick={onCreateRma}>
              <Plus className="mr-2 h-4 w-4" />
              Create RMA
            </Button>
          )}
        </div>
      )}

      {/* Empty state */}
      {rmas.length === 0 ? (
        <EmptyState
          icon={Package}
          title="No RMAs found"
          message={
            searchQuery ||
            statusFilter !== 'all' ||
            reasonFilter !== 'all' ||
            resolutionFilter !== 'all' ||
            executionStatusFilter !== 'all' ||
            linkedIssueOpenStateFilter !== 'any'
              ? 'Try adjusting your filters'
              : 'Create your first RMA to get started'
          }
          primaryAction={
            showCreateButton && onCreateRma
              ? {
                  label: 'Create RMA',
                  onClick: onCreateRma,
                }
              : undefined
          }
        />
      ) : (
        <DataTable
          data={rmas}
          columns={columns}
          onRowClick={onRmaClick}
          pagination={{
            pageSize,
            pageIndex: page - 1,
          }}
          enableSorting
          manualSorting
          sorting={{ field: sortBy, direction: sortOrder }}
          onSortChange={(field, direction) => onSortChange?.(field as RmaSortField, direction)}
        />
      )}

      {/* Pagination info */}
      {totalCount > 0 && (
        <div className="text-muted-foreground mt-4 flex items-center justify-between text-sm">
          <span>
            Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, totalCount)} of{' '}
            {totalCount} RMAs
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 1}
              onClick={() => onPageChange(page - 1)}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page * pageSize >= totalCount}
              onClick={() => onPageChange(page + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function ExecutionBadge({ status }: { status: RmaExecutionStatus }) {
  const variant = status === 'completed' ? 'default' : 'outline';

  return <Badge variant={variant}>{getRmaExecutionStatusLabel(status)}</Badge>;
}
