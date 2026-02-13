/**
 * Issues Board Route
 *
 * LAYOUT: full-width
 *
 * Kanban board view for issue management.
 *
 * LAYOUT: full-width
 *
 * @see src/components/domain/support/issue-kanban-board.tsx
 * @see _Initiation/_prd/2-domains/support/support.prd.json - DOM-SUP-008
 */

import { useState, useMemo, useCallback } from 'react';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { PageLayout, RouteErrorFallback } from '@/components/layout';
import { SupportKanbanSkeleton } from '@/components/skeletons/support';
import { Plus, LayoutGrid, List, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { Button, buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LoadingState } from '@/components/shared/loading-state';
import { TooltipProvider } from '@/components/ui/tooltip';
import { useAuth } from '@/lib/auth/hooks';
import { IssueKanbanBoard, type IssueStatus } from '@/components/domain/support';
import {
  IssueQuickFilters,
  quickFilterFromSearch,
  quickFilterToSearch,
  type QuickFilter,
} from '@/components/domain/support';
import {
  IssueBulkActions,
  type BulkActionEvent,
} from '@/components/domain/support';
import {
  IssueStatusChangeDialog,
  type StatusChangeResult,
  type IssueStatus as DialogIssueStatus,
} from '@/components/domain/support';
import { useIssuesWithSlaMetrics, useUpdateIssue, useSupportMetrics } from '@/hooks/support';
import type { IssueKanbanItem } from '@/components/domain/support';
import type { IssuePriority } from '@/lib/schemas/support/issues';
import { fromUrlParams } from '@/lib/utils/issues-filter-url';
import { issuesSearchSchema } from './issues';

// ============================================================================
// ROUTE
// ============================================================================

export const Route = createFileRoute('/_authenticated/support/issues-board')({
  validateSearch: issuesSearchSchema,
  component: IssuesBoardPage,
  errorComponent: ({ error }) => (
    <RouteErrorFallback error={error} parentRoute="/support" />
  ),
  pendingComponent: () => (
    <PageLayout variant="full-width">
      <PageLayout.Header
        title="Issues Board"
        description="Manage issues with drag-and-drop"
      />
      <PageLayout.Content>
        <SupportKanbanSkeleton />
      </PageLayout.Content>
    </PageLayout>
  ),
});

// ============================================================================
// PAGE COMPONENT
// ============================================================================

function IssuesBoardPage() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const { user } = useAuth();

  // State
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [skipStatusPrompt, setSkipStatusPrompt] = useState(false);

  // Status change dialog state
  const [statusChangeDialog, setStatusChangeDialog] = useState<{
    open: boolean;
    issueId: string;
    issueTitle: string;
    fromStatus: DialogIssueStatus;
    toStatus: DialogIssueStatus;
  } | null>(null);

  // activeFilter: always derived from URL for context preservation
  const activeFilter = quickFilterFromSearch(
    {
      slaStatus: search.slaStatus,
      escalated: search.escalated,
      assignedToUserId: search.assignedToUserId,
      quickFilter: search.quickFilter as QuickFilter | undefined,
    },
    user?.id
  );

  // Triage counts from support metrics
  const { data: metrics } = useSupportMetrics();
  const triage = useMemo(
    () => metrics?.triage ?? { overdueSla: 0, escalated: 0, myIssues: 0 },
    [metrics]
  );

  // Parse URL params to typed filters (status/priority are comma-separated strings)
  const filters = fromUrlParams(search);

  // Fetch issues (URL params drive server-side triage filters)
  const { data, isLoading, error, refetch } = useIssuesWithSlaMetrics({
    status: filters.status.length > 0 ? filters.status : undefined,
    priority: filters.priority.length > 0 ? filters.priority : undefined,
    type: search.type,
    search: search.search,
    slaStatus: search.slaStatus,
    escalated: search.escalated,
    assignedToUserId: search.assignedToUserId,
    limit: search.pageSize,
    offset: (search.page - 1) * search.pageSize,
  });

  // Update mutation
  const updateMutation = useUpdateIssue();

  // Transform issues to kanban format
  const issues = useMemo<IssueKanbanItem[]>(() => {
    if (!data) return [];

    return data.map((issue: IssueKanbanItem) => {
      const slaStatus = issue.slaMetrics
        ? issue.slaMetrics.responseBreached || issue.slaMetrics.resolutionBreached
          ? 'breached'
          : issue.slaMetrics.isResponseAtRisk || issue.slaMetrics.isResolutionAtRisk
            ? 'at_risk'
            : 'on_track'
        : null;

      return {
        id: issue.id,
        issueNumber: issue.issueNumber,
        title: issue.title,
        priority: issue.priority,
        status: issue.status,
        type: issue.type,
        customerId: issue.customerId ?? null,
        customer: issue.customer,
        assignedTo: issue.assignedTo,
        createdAt: issue.createdAt,
        slaStatus,
        slaResponseDue: issue.slaMetrics?.responseDueAt ?? null,
        slaResolutionDue: issue.slaMetrics?.resolutionDueAt ?? null,
      };
    });
  }, [data]);

  // Filter issues: URL params already filter server-side for triage; client-side applies for others
  const filteredIssues = useMemo(() => {
    if (activeFilter === 'all') return issues;
    // my_issues, overdue_sla, escalated are handled by server (assignedToUserId, slaStatus, escalated)
    if (['my_issues', 'overdue_sla', 'escalated'].includes(activeFilter)) return issues;

    return issues.filter((issue) => {
      switch (activeFilter) {
        case 'unassigned':
          return issue.assignedTo === null;
        case 'sla_at_risk':
          return issue.slaStatus === 'at_risk' || issue.slaStatus === 'breached';
        case 'high_priority':
          return issue.priority === 'high' || issue.priority === 'critical';
        case 'recent': {
          const oneDayAgo = new Date();
          oneDayAgo.setDate(oneDayAgo.getDate() - 1);
          return new Date(issue.createdAt) > oneDayAgo;
        }
        default:
          return true;
      }
    });
  }, [issues, activeFilter]);

  // Filter counts: triage from metrics, others from loaded issues
  const filterCounts = useMemo(() => {
    return {
      all: issues.length,
      overdue_sla: triage.overdueSla,
      escalated: triage.escalated,
      my_issues: triage.myIssues,
      unassigned: issues.filter((i) => i.assignedTo === null).length,
      sla_at_risk: issues.filter((i) => i.slaStatus === 'at_risk' || i.slaStatus === 'breached')
        .length,
      high_priority: issues.filter((i) => i.priority === 'high' || i.priority === 'critical')
        .length,
      recent: issues.filter((i) => {
        const oneDayAgo = new Date();
        oneDayAgo.setDate(oneDayAgo.getDate() - 1);
        return new Date(i.createdAt) > oneDayAgo;
      }).length,
    };
  }, [issues, triage]);

  // Handle filter change: always navigate for URL sync (context preservation)
  const handleFilterChange = useCallback(
    (filter: QuickFilter) => {
      const newSearch = quickFilterToSearch(filter, user?.id);
      navigate({
        to: '/support/issues-board',
        search: { ...search, ...newSearch, page: 1 },
        replace: true,
      });
    },
    [navigate, search, user?.id]
  );

  // Handle status change via drag-drop
  const handleStatusChange = useCallback(
    (event: { issueId: string; fromStatus: IssueStatus; toStatus: IssueStatus }) => {
      const issue = issues.find((i) => i.id === event.issueId);
      if (!issue) return;

      if (skipStatusPrompt) {
        // Directly update without dialog
        updateMutation.mutate(
          { issueId: event.issueId, status: event.toStatus },
          {
            onSuccess: () => {
              toast.success(`Issue moved to ${event.toStatus.replace('_', ' ')}`, {
                action: {
                  label: 'View',
                  onClick: () =>
                    navigate({ to: '/support/issues/$issueId', params: { issueId: event.issueId } }),
                },
              });
            },
          }
        );
      } else {
        // Show dialog
        setStatusChangeDialog({
          open: true,
          issueId: event.issueId,
          issueTitle: issue.title,
          fromStatus: event.fromStatus as DialogIssueStatus,
          toStatus: event.toStatus as DialogIssueStatus,
        });
      }
    },
    [issues, skipStatusPrompt, updateMutation, navigate]
  );

  // Handle status change dialog confirmation
  const handleStatusChangeConfirm = (result: StatusChangeResult) => {
    if (!statusChangeDialog) return;

    if (result.confirmed) {
      const issueId = statusChangeDialog.issueId;
      const toStatus = statusChangeDialog.toStatus;
      updateMutation.mutate(
        {
          issueId,
          status: toStatus,
          ...(result.note && { resolutionNotes: result.note }),
        },
        {
          onSuccess: () => {
            toast.success(`Issue moved to ${toStatus.replace('_', ' ')}`, {
              action: {
                label: 'View',
                onClick: () =>
                  navigate({ to: '/support/issues/$issueId', params: { issueId } }),
              },
            });
          },
        }
      );
      if (result.skipPromptForSession) {
        setSkipStatusPrompt(true);
      }
    }

    setStatusChangeDialog(null);
  };

  // Handle issue click
  const handleIssueClick = (issue: IssueKanbanItem) => {
    // Navigate to issue detail page
    navigate({ to: '/support/issues/$issueId', params: { issueId: issue.id } });
  };

  // Handle bulk actions
  const handleBulkAction = async (event: BulkActionEvent) => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;

    try {
      // For now, update each issue individually
      // In production, you'd want a bulk update endpoint
      for (const issueId of ids) {
        if (event.action === 'assign') {
          await updateMutation.mutateAsync({
            issueId,
            assignedToUserId: event.value === 'unassigned' ? null : event.value,
          });
        } else if (event.action === 'change_priority') {
          await updateMutation.mutateAsync({ issueId, priority: event.value as IssuePriority });
        } else if (event.action === 'change_status' || event.action === 'close') {
          await updateMutation.mutateAsync({ issueId, status: event.value as IssueStatus });
        }
      }

      toast.success(`Updated ${ids.length} issue${ids.length > 1 ? 's' : ''}`, {
        action: {
          label: 'View Issues',
          onClick: () => navigate({ to: '/support/issues' }),
        },
      });
      setSelectedIds(new Set());
    } catch {
      toast.error('Failed to update issues');
    }
  };

  if (isLoading) {
    return <LoadingState text="Loading issues..." />;
  }

  if (error) {
    return (
      <PageLayout variant="full-width">
        <PageLayout.Header
          title="Issues Board"
          description="Manage issues with drag-and-drop"
        />
        <PageLayout.Content>
          <div className="py-12 text-center">
            <p className="text-destructive mb-4">Failed to load issues</p>
            <Button onClick={() => refetch()}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Retry
            </Button>
          </div>
        </PageLayout.Content>
      </PageLayout>
    );
  }

  return (
    <TooltipProvider>
      <PageLayout variant="full-width">
        <PageLayout.Header
          title="Issues Board"
          description="Manage issues with drag-and-drop"
          actions={
            <div className="flex items-center gap-2">
              {/* View Toggle */}
              <Tabs defaultValue="board" className="w-auto">
                <TabsList className="h-9">
                  <TabsTrigger value="board" className="px-3">
                    <LayoutGrid className="h-4 w-4" />
                  </TabsTrigger>
                  <Link to="/support/issues" search={search}>
                    <TabsTrigger value="list" className="px-3">
                      <List className="h-4 w-4" />
                    </TabsTrigger>
                  </Link>
                </TabsList>
              </Tabs>

              <Button onClick={() => refetch()} variant="outline" size="sm">
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

        {/* Quick Filters */}
        <IssueQuickFilters
          activeFilter={activeFilter}
          onFilterChange={handleFilterChange}
          counts={filterCounts}
        />

        {/* Kanban Board - min-w-0 constrains width so overflow-x-auto scrolls instead of page */}
        <div className="min-w-0">
          <IssueKanbanBoard
          issues={filteredIssues}
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
          onStatusChange={handleStatusChange}
          onIssueClick={handleIssueClick}
        />
        </div>

        {/* Bulk Actions Toolbar */}
        <IssueBulkActions
          selectedCount={selectedIds.size}
          onClearSelection={() => setSelectedIds(new Set())}
          onAction={handleBulkAction}
          isPending={updateMutation.isPending}
        />

        {/* Status Change Dialog */}
        {statusChangeDialog && (
          <IssueStatusChangeDialog
            open={statusChangeDialog.open}
            onOpenChange={(open) => {
              if (!open) setStatusChangeDialog(null);
            }}
            issueTitle={statusChangeDialog.issueTitle}
            fromStatus={statusChangeDialog.fromStatus}
            toStatus={statusChangeDialog.toStatus}
            onConfirm={handleStatusChangeConfirm}
          />
        )}
        </PageLayout.Content>
      </PageLayout>
    </TooltipProvider>
  );
}
