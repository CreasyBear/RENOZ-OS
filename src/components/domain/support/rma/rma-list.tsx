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
import { RmaStatusBadge, RmaReasonBadge } from './rma-status-badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { EmptyState } from '@/components/shared/empty-state';
import { LoadingState } from '@/components/shared/loading-state';
import { ErrorState } from '@/components/shared/error-state';
import type { RmaResponse, RmaStatus, RmaReason } from '@/lib/schemas/support/rma';
import { formatDistanceToNow } from 'date-fns';
import { Plus, Search, Package, Eye, MoreHorizontal } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

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
  /** From route container (filter state). */
  searchQuery: string;
  /** From route container (pagination state). */
  page: number;
  /** From route container (filter handler). */
  onStatusFilterChange: (value: RmaStatus | 'all') => void;
  /** From route container (filter handler). */
  onReasonFilterChange: (value: RmaReason | 'all') => void;
  /** From route container (filter handler). */
  onSearchChange: (value: string) => void;
  /** From route container (pagination handler). */
  onPageChange: (page: number) => void;
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
}

// Status filter options
const STATUS_OPTIONS: { value: RmaStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All Statuses' },
  { value: 'requested', label: 'Requested' },
  { value: 'approved', label: 'Approved' },
  { value: 'received', label: 'Received' },
  { value: 'processed', label: 'Processed' },
  { value: 'rejected', label: 'Rejected' },
];

// Reason filter options
const REASON_OPTIONS: { value: RmaReason | 'all'; label: string }[] = [
  { value: 'all', label: 'All Reasons' },
  { value: 'defective', label: 'Defective' },
  { value: 'damaged_in_shipping', label: 'Damaged in Shipping' },
  { value: 'wrong_item', label: 'Wrong Item' },
  { value: 'not_as_described', label: 'Not as Described' },
  { value: 'performance_issue', label: 'Performance Issue' },
  { value: 'installation_failure', label: 'Installation Failure' },
  { value: 'other', label: 'Other' },
];

export function RmaList({
  rmas,
  totalCount,
  isLoading,
  error,
  onRetry,
  statusFilter,
  reasonFilter,
  searchQuery,
  page,
  onStatusFilterChange,
  onReasonFilterChange,
  onSearchChange,
  onPageChange,
  onCreateRma,
  onRmaClick,
  showCreateButton = true,
  showFilters = true,
  pageSize = 10,
  className,
}: RmaListProps) {
  // Column definitions
  const columns: ColumnDef<RmaResponse>[] = useMemo(
    () => [
      {
        accessorKey: 'rmaNumber',
        header: 'RMA Number',
        cell: ({ row }) => (
          <span className="font-mono text-sm font-medium">{row.original.rmaNumber}</span>
        ),
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => <RmaStatusBadge status={row.original.status} />,
      },
      {
        accessorKey: 'reason',
        header: 'Reason',
        cell: ({ row }) => <RmaReasonBadge reason={row.original.reason} />,
      },
      {
        accessorKey: 'createdAt',
        header: 'Created',
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
    [onRmaClick]
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
            onValueChange={(value) => {
              const opt = STATUS_OPTIONS.find((o) => o.value === value);
              if (opt) onStatusFilterChange(opt.value);
            }}
          >
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Reason filter */}
          <Select
            value={reasonFilter}
            onValueChange={(value) => {
              const opt = REASON_OPTIONS.find((o) => o.value === value);
              if (opt) onReasonFilterChange(opt.value);
            }}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Reason" />
            </SelectTrigger>
            <SelectContent>
              {REASON_OPTIONS.map((option) => (
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
            searchQuery || statusFilter !== 'all' || reasonFilter !== 'all'
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
