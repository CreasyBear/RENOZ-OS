/**
 * Issue List Page
 *
 * Displays all issues with filtering, sorting, and pagination.
 *
 * LAYOUT: full-width
 *
 * @see UI_UX_STANDARDIZATION_PRD.md
 * @see _Initiation/_prd/2-domains/support/support.prd.json
 */
import { createFileRoute, useNavigate, Link } from '@tanstack/react-router';
import { RouteErrorFallback } from '@/components/layout';
import { SupportTableSkeleton } from '@/components/skeletons/support';
import { z } from 'zod';
import { useMemo } from 'react';
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
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/shared';
import { ISSUE_STATUS_CONFIG } from '@/components/domain/support/issues';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DataTable } from '@/components/shared/data-table/data-table';
import { LoadingState } from '@/components/shared/loading-state';
import { ErrorState } from '@/components/shared/error-state';
import { EmptyState } from '@/components/shared/empty-state';
import { SlaBadge } from '@/components/domain/support';
import { useIssues } from '@/hooks/support';
import type { IssueType } from '@/lib/schemas/support/issues';
import { formatDistanceToNow } from 'date-fns';
import { DomainFilterBar } from '@/components/shared/filters';
import {
  ISSUE_FILTER_CONFIG,
  DEFAULT_ISSUE_FILTERS,
  type IssueFiltersState as FilterState,
  type IssueStatus,
  type IssuePriority,
} from '@/components/domain/support/issues/issue-filter-config';

// ============================================================================
// ROUTE SEARCH PARAMS
// ============================================================================

const issuesSearchSchema = z.object({
  status: z
    .enum(['open', 'in_progress', 'pending', 'on_hold', 'escalated', 'resolved', 'closed'])
    .optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  type: z
    .enum([
      'hardware_fault',
      'software_firmware',
      'installation_defect',
      'performance_degradation',
      'connectivity',
      'other',
    ])
    .optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(10).max(100).default(20),
});

export const Route = createFileRoute('/_authenticated/support/issues/')({
  validateSearch: issuesSearchSchema,
  component: IssuesListPage,
  errorComponent: ({ error }) => (
    <RouteErrorFallback error={error} parentRoute="/support/issues" />
  ),
  pendingComponent: () => (
    <PageLayout variant="full-width">
      <PageLayout.Header
        title="Issues"
        description="Manage support issues and track resolution"
      />
      <PageLayout.Content>
        <SupportTableSkeleton />
      </PageLayout.Content>
    </PageLayout>
  ),
});

// ============================================================================
// STATUS/PRIORITY/TYPE OPTIONS
// ============================================================================

// Note: Status colors are now handled by ISSUE_STATUS_CONFIG with StatusBadge

// Priority badge color mapping
const PRIORITY_COLORS: Record<IssuePriority, string> = {
  low: 'bg-slate-400/10 text-slate-500 border-slate-400/20',
  medium: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  high: 'bg-orange-500/10 text-orange-600 border-orange-500/20',
  critical: 'bg-red-500/10 text-red-600 border-red-500/20',
};

// Issue type for the list
interface IssueListItem {
  id: string;
  issueNumber: string;
  title: string;
  status: IssueStatus;
  priority: IssuePriority;
  type: IssueType;
  createdAt: Date | string;
  customer?: { name: string } | null;
  assignedTo?: { name: string } | null;
  slaMetrics?: {
    responseBreached?: boolean;
    resolutionBreached?: boolean;
    isResponseAtRisk?: boolean;
    isResolutionAtRisk?: boolean;
  } | null;
}

// ============================================================================
// URL FILTER TRANSFORMERS
// ============================================================================

/** Transform URL search params to FilterState */
const fromUrlParams = (search: z.infer<typeof issuesSearchSchema>): FilterState => ({
  search: search.search ?? '',
  status: search.status ? [search.status] : [],
  priority: search.priority ? [search.priority as FilterState['priority'][0]] : [],
  assignedTo: null,
  customerId: null,
});

/** Transform FilterState to URL search params */
const toUrlParams = (filters: FilterState): Record<string, unknown> => ({
  search: filters.search || undefined,
  status: filters.status.length > 0 ? filters.status[0] as IssueStatus : undefined,
  priority: filters.priority.length > 0 ? filters.priority[0] as IssuePriority : undefined,
});

// ============================================================================
// COMPONENT
// ============================================================================

function IssuesListPage() {
  const navigate = useNavigate({ from: Route.fullPath });
  const search = Route.useSearch();

  // URL-synced filter state with transformations
  const { filters, setFilters } = useTransformedFilterUrlState({
    currentSearch: search,
    navigate,
    defaults: DEFAULT_ISSUE_FILTERS,
    fromUrlParams,
    toUrlParams,
    resetPageOnChange: ['search', 'status', 'priority'],
  });

  // Handle filter changes
  const handleFiltersChange = (newFilters: FilterState) => {
    setFilters(newFilters);
  };

  // Fetch issues
  const { data, isLoading, error, refetch } = useIssues({
    status: search.status,
    priority: search.priority,
    type: search.type,
    search: search.search,
    limit: search.pageSize,
    offset: (search.page - 1) * search.pageSize,
  });

  const issues = (data ?? []) as IssueListItem[];
  const hasFilters = !!(search.status || search.priority || search.type || search.search);

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
                <Link to="/support/issues-board">
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
            <Link to="/support/issues/new">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                New Issue
              </Button>
            </Link>
          </div>
        }
      />

      <PageLayout.Content>
        {/* Filters */}
        <div className="mb-4">
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
