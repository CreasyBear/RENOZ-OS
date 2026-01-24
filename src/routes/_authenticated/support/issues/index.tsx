/**
 * Issue List Page
 *
 * Displays all issues with filtering, sorting, and pagination.
 * Provides a table/list view alongside the kanban board.
 *
 * @see _Initiation/_prd/2-domains/support/support.prd.json - DOM-SUP-008
 * @see src/routes/_authenticated/support/issues-board.tsx for Kanban view
 */
import { createFileRoute, useNavigate, Link } from '@tanstack/react-router';
import { RouteErrorFallback } from '@/components/layout';
import { SupportTableSkeleton } from '@/components/skeletons/support';
import { z } from 'zod';
import { useMemo } from 'react';
import { type ColumnDef } from '@tanstack/react-table';
import {
  TicketIcon,
  Plus,
  LayoutGrid,
  List,
  RefreshCw,
  Search,
  Filter,
  X,
} from 'lucide-react';

import { PageLayout } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DataTable } from '@/components/shared/data-table/data-table';
import { LoadingState } from '@/components/shared/loading-state';
import { ErrorState } from '@/components/shared/error-state';
import { EmptyState } from '@/components/shared/empty-state';
import { SlaBadge } from '@/components/domain/support/sla-badge';
import { useIssues } from '@/hooks/support';
import type { IssueStatus, IssuePriority, IssueType } from '@/lib/schemas/support/issues';
import { formatDistanceToNow } from 'date-fns';

// ============================================================================
// ROUTE SEARCH PARAMS
// ============================================================================

const issuesSearchSchema = z.object({
  status: z
    .enum(['new', 'open', 'in_progress', 'on_hold', 'escalated', 'resolved', 'closed'])
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
    <PageLayout variant="container">
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

const STATUS_OPTIONS: { value: IssueStatus; label: string }[] = [
  { value: 'new', label: 'New' },
  { value: 'open', label: 'Open' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'on_hold', label: 'On Hold' },
  { value: 'escalated', label: 'Escalated' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'closed', label: 'Closed' },
];

const PRIORITY_OPTIONS: { value: IssuePriority; label: string }[] = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'critical', label: 'Critical' },
];

const TYPE_OPTIONS: { value: IssueType; label: string }[] = [
  { value: 'hardware_fault', label: 'Hardware Fault' },
  { value: 'software_firmware', label: 'Software/Firmware' },
  { value: 'installation_defect', label: 'Installation Defect' },
  { value: 'performance_degradation', label: 'Performance Degradation' },
  { value: 'connectivity', label: 'Connectivity' },
  { value: 'other', label: 'Other' },
];

// Status badge color mapping
const STATUS_COLORS: Record<IssueStatus, string> = {
  new: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  open: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  in_progress: 'bg-purple-500/10 text-purple-600 border-purple-500/20',
  on_hold: 'bg-slate-500/10 text-slate-600 border-slate-500/20',
  escalated: 'bg-red-500/10 text-red-600 border-red-500/20',
  resolved: 'bg-green-500/10 text-green-600 border-green-500/20',
  closed: 'bg-slate-400/10 text-slate-500 border-slate-400/20',
};

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
// COMPONENT
// ============================================================================

function IssuesListPage() {
  const navigate = useNavigate({ from: Route.fullPath });
  const search = Route.useSearch();

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

  // Update search params
  const updateSearch = (updates: Partial<z.infer<typeof issuesSearchSchema>>) => {
    navigate({
      search: (prev) => ({
        ...prev,
        ...updates,
        page: 'page' in updates ? updates.page : 1,
      }),
    });
  };

  // Clear all filters
  const clearFilters = () => {
    navigate({
      search: {
        page: 1,
        pageSize: search.pageSize,
      },
    });
  };

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
          <Badge variant="outline" className={STATUS_COLORS[row.original.status]}>
            {row.original.status.replace('_', ' ')}
          </Badge>
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
    <PageLayout variant="container">
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
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <div className="relative min-w-[200px] flex-1 max-w-xs">
            <Search className="text-muted-foreground absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
            <Input
              placeholder="Search issues..."
              value={search.search ?? ''}
              onChange={(e) => updateSearch({ search: e.target.value || undefined })}
              className="pl-9"
            />
          </div>

          <Select
            value={search.status ?? 'all'}
            onValueChange={(value) =>
              updateSearch({ status: value === 'all' ? undefined : (value as IssueStatus) })
            }
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {STATUS_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={search.priority ?? 'all'}
            onValueChange={(value) =>
              updateSearch({ priority: value === 'all' ? undefined : (value as IssuePriority) })
            }
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priorities</SelectItem>
              {PRIORITY_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={search.type ?? 'all'}
            onValueChange={(value) =>
              updateSearch({ type: value === 'all' ? undefined : (value as IssueType) })
            }
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {TYPE_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              <X className="mr-1 h-4 w-4" />
              Clear
            </Button>
          )}
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
