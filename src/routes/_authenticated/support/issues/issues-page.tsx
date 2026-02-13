/**
 * Issue List Page
 *
 * Displays all issues with filtering, sorting, and pagination.
 *
 * @source issues from useIssues hook
 *
 * @see src/routes/_authenticated/support/issues/index.tsx - Route definition
 * @see _Initiation/_prd/2-domains/support/support.prd.json
 */

import { useMemo } from 'react';
import { useNavigate, Link } from '@tanstack/react-router';
import { useTransformedFilterUrlState } from '@/hooks/filters/use-filter-url-state';
import { type ColumnDef } from '@tanstack/react-table';
import {
  TicketIcon,
  Plus,
  LayoutGrid,
  List,
  RefreshCw,
} from 'lucide-react';

import { PageLayout } from '@/components/layout';
import { Button, buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/shared';
import { ISSUE_STATUS_CONFIG } from '@/components/domain/support/issues';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DataTable } from '@/components/shared/data-table/data-table';
import { LoadingState } from '@/components/shared/loading-state';
import { ErrorState } from '@/components/shared/error-state';
import { EmptyState } from '@/components/shared/empty-state';
import { SlaBadge } from '@/components/domain/support';
import { useIssuesWithSlaMetrics } from '@/hooks/support';
import type { IssueListItem, IssueFiltersState, IssuePriority } from '@/lib/schemas/support/issues';
import { fromUrlParams, toUrlParams } from '@/lib/utils/issues-filter-url';
import { formatDistanceToNow } from 'date-fns';
import { DomainFilterBar } from '@/components/shared/filters';
import {
  ISSUE_FILTER_CONFIG,
  DEFAULT_ISSUE_FILTERS,
} from '@/components/domain/support/issues/issue-filter-config';

import type { issuesSearchSchema } from './index';
import type { z } from 'zod';

type SearchParams = z.infer<typeof issuesSearchSchema>;
type FilterState = IssueFiltersState;

// ============================================================================
// CONSTANTS
// ============================================================================

// Priority badge color mapping
const PRIORITY_COLORS: Record<IssuePriority, string> = {
  low: 'bg-slate-400/10 text-slate-500 border-slate-400/20',
  medium: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  high: 'bg-orange-500/10 text-orange-600 border-orange-500/20',
  critical: 'bg-red-500/10 text-red-600 border-red-500/20',
};

// ============================================================================
// MAIN PAGE COMPONENT
// ============================================================================

interface IssuesPageProps {
  search: SearchParams;
}

export default function IssuesPage({ search }: IssuesPageProps) {
  const navigate = useNavigate();

  // URL-synced filter state with transformations
  const { filters, setFilters } = useTransformedFilterUrlState({
    currentSearch: search,
    navigate,
    defaults: DEFAULT_ISSUE_FILTERS,
    fromUrlParams,
    toUrlParams,
    resetPageOnChange: ['search', 'status', 'priority', 'slaStatus', 'escalated', 'assignedToUserId'],
  });

  // Handle filter changes
  const handleFiltersChange = (newFilters: FilterState) => {
    setFilters(newFilters);
  };

  // Fetch issues (useIssuesWithSlaMetrics for slaStatus/escalated filters)
  // Pass filters.status/filters.priority (arrays) for multi-value presets
  const assignedToFilter =
    filters.assignedTo === "me"
      ? ("me" as const)
      : filters.assignedTo === "unassigned"
        ? ("unassigned" as const)
        : undefined;
  const assignedToUserId =
    filters.assignedTo && filters.assignedTo !== "me" && filters.assignedTo !== "unassigned"
      ? filters.assignedTo
      : undefined;

  const { data, isLoading, error, refetch } = useIssuesWithSlaMetrics({
    status: filters.status.length > 0 ? filters.status : undefined,
    priority: filters.priority.length > 0 ? filters.priority : undefined,
    type: search.type,
    search: filters.search,
    slaStatus: search.slaStatus,
    escalated: search.escalated,
    assignedToFilter,
    assignedToUserId,
    limit: search.pageSize,
    offset: (search.page - 1) * search.pageSize,
  });

  const issues = (data ?? []) as IssueListItem[];
  const hasFilters = !!(filters.status.length > 0 || filters.priority.length > 0 || search.type || filters.search);

  // Handle issue click
  const handleIssueClick = (issue: IssueListItem) => {
    navigate({
      to: '/support/issues/$issueId',
      params: { issueId: issue.id },
    });
  };

  // Column definitions
  const columns: ColumnDef<IssueListItem>[] = useMemo(
    () => [
      {
        accessorKey: 'issueNumber',
        header: 'Issue #',
        cell: ({ row }) => (
          <span className="font-mono text-sm font-medium">{row.original.issueNumber}</span>
        ),
      },
      {
        accessorKey: 'title',
        header: 'Title',
        cell: ({ row }) => (
          <div className="max-w-[300px] truncate font-medium">{row.original.title}</div>
        ),
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => (
          <StatusBadge
            status={row.original.status}
            statusConfig={ISSUE_STATUS_CONFIG}
          />
        ),
      },
      {
        accessorKey: 'priority',
        header: 'Priority',
        cell: ({ row }) => (
          <Badge variant="outline" className={PRIORITY_COLORS[row.original.priority]}>
            {row.original.priority}
          </Badge>
        ),
      },
      {
        id: 'sla',
        header: 'SLA',
        cell: ({ row }) => {
          const metrics = row.original.slaMetrics;
          if (!metrics) return <span className="text-muted-foreground text-sm">—</span>;

          const status =
            metrics.responseBreached || metrics.resolutionBreached
              ? 'breached'
              : metrics.isResponseAtRisk || metrics.isResolutionAtRisk
                ? 'at_risk'
                : 'on_track';

          return <SlaBadge status={status} />;
        },
      },
      {
        accessorKey: 'customer.name',
        header: 'Customer',
        cell: ({ row }) => (
          <span className="text-muted-foreground text-sm">
            {row.original.customer?.name ?? '—'}
          </span>
        ),
      },
      {
        accessorKey: 'assignedTo.name',
        header: 'Assignee',
        cell: ({ row }) => (
          <span className="text-muted-foreground text-sm">
            {row.original.assignedTo?.name ?? 'Unassigned'}
          </span>
        ),
      },
      {
        accessorKey: 'createdAt',
        header: 'Created',
        cell: ({ row }) => (
          <span className="text-muted-foreground text-sm">
            {formatDistanceToNow(new Date(row.original.createdAt), { addSuffix: true })}
          </span>
        ),
      },
    ],
    []
  );

  if (isLoading) {
    return <LoadingState text="Loading issues..." />;
  }

  if (error) {
    return (
      <ErrorState
        title="Failed to load issues"
        message={error instanceof Error ? error.message : 'An error occurred'}
        onRetry={refetch}
      />
    );
  }

  return (
    <PageLayout variant="full-width">
      <PageLayout.Header
        title={
          <div className="flex items-center gap-2">
            <TicketIcon className="h-6 w-6" />
            Issues
          </div>
        }
        description="Manage support issues and track resolution"
        actions={
          <div className="flex items-center gap-2">
            <Tabs value="list" className="w-auto">
              <TabsList className="h-9">
                <Link to="/support/issues-board" search={search}>
                  <TabsTrigger value="board" className="px-3">
                    <LayoutGrid className="h-4 w-4" />
                  </TabsTrigger>
                </Link>
                <TabsTrigger value="list" className="px-3">
                  <List className="h-4 w-4" />
                </TabsTrigger>
              </TabsList>
            </Tabs>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Link
              to="/support/issues/new"
              className={cn(buttonVariants())}
            >
              <Plus className="mr-2 h-4 w-4" />
              New Issue
            </Link>
          </div>
        }
      />

      <PageLayout.Content>
        {/* Filters */}
        <div className="space-y-3">
          <DomainFilterBar<FilterState>
            config={ISSUE_FILTER_CONFIG}
            filters={filters}
            onFiltersChange={handleFiltersChange}
            defaultFilters={DEFAULT_ISSUE_FILTERS}
            resultCount={issues.length}
          />
        </div>

        {/* Issues Table */}
        {issues.length === 0 ? (
          <EmptyState
            icon={TicketIcon}
            title="No issues found"
            message={hasFilters ? 'Try adjusting your filters' : 'Create your first issue to get started'}
            primaryAction={{
              label: 'Create Issue',
              onClick: () => navigate({ to: '/support/issues/new' }),
            }}
          />
        ) : (
          <DataTable
            data={issues}
            columns={columns}
            onRowClick={handleIssueClick}
            enableSorting
          />
        )}
      </PageLayout.Content>
    </PageLayout>
  );
}
