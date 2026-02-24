/**
 * Issues Board Route
 *
 * LAYOUT: full-width
 *
 * Kanban board view for issue management.
 *
 * @see src/components/domain/support/issue-kanban-board.tsx
 * @see _Initiation/_prd/2-domains/support/support.prd.json - DOM-SUP-008
 * @see docs/reliability/MUTATION-CONTRACT-STANDARD.md - Mutation checklist for status/drag/drop
 */

import { useState, useMemo, useCallback, useEffect } from 'react';
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
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useAuth } from '@/lib/auth/hooks';
import { IssueKanbanBoard } from '@/components/domain/support/issues/issue-kanban-board';
import type { IssueStatus } from '@/lib/schemas/support/issues';
import {
  IssueQuickFilters,
  quickFilterFromSearch,
  quickFilterToSearch,
  type QuickFilter,
} from '@/components/domain/support/issues/issue-quick-filters';
import { IssueBulkActions, type BulkActionEvent } from '@/components/domain/support/issues/issue-bulk-actions';
import {
  IssueStatusChangeDialog,
  type StatusChangeResult,
} from '@/components/domain/support/issues/issue-status-change-dialog';
import { useIssuesWithSlaMetrics, useUpdateIssue, useDeleteIssue, useSupportMetrics } from '@/hooks/support';
import type { IssueKanbanItem } from '@/components/domain/support/issues/issue-kanban-card';
import type { IssuePriority } from '@/lib/schemas/support/issues';
import { fromUrlParams } from '@/lib/utils/issues-filter-url';
import { trackSupportIssueTransition } from '@/lib/analytics';
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
  const [optimisticStatusByIssueId, setOptimisticStatusByIssueId] = useState<
    Record<string, IssueStatus>
  >({});
  const [transitionPendingIds, setTransitionPendingIds] = useState<Set<string>>(new Set());
  const [transitionFailures, setTransitionFailures] = useState<
    Array<{
      issueId: string;
      issueLabel: string;
      fromStatus: IssueStatus;
      toStatus: IssueStatus;
      note?: string;
      message: string;
    }>
  >([]);
  const [bulkFailures, setBulkFailures] = useState<
    Array<{ issueId: string; issueLabel: string; message: string }>
  >([]);

  // Status change dialog state
  const [statusChangeDialog, setStatusChangeDialog] = useState<{
    open: boolean;
    issueId: string;
    issueTitle: string;
    fromStatus: IssueStatus;
    toStatus: IssueStatus;
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
  const deleteMutation = useDeleteIssue();

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

  useEffect(() => {
    if (issues.length === 0) return;
    setOptimisticStatusByIssueId((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const [issueId, optimisticStatus] of Object.entries(prev)) {
        const actualStatus = issues.find((i) => i.id === issueId)?.status;
        if (actualStatus === undefined || actualStatus === optimisticStatus) {
          delete next[issueId];
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [issues]);

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

  const boardIssues = useMemo(
    () =>
      filteredIssues.map((issue) => ({
        ...issue,
        status: optimisticStatusByIssueId[issue.id] ?? issue.status,
      })),
    [filteredIssues, optimisticStatusByIssueId]
  );

  const getTransitionAction = (toStatus: IssueStatus) => {
    if (toStatus === 'in_progress') return 'start';
    if (toStatus === 'on_hold') return 'hold';
    if (toStatus === 'escalated') return 'escalate';
    if (toStatus === 'resolved') return 'resolve';
    if (toStatus === 'closed') return 'close';
    return 'status_change';
  };

  const setTransitionPending = useCallback((issueId: string, pending: boolean) => {
    setTransitionPendingIds((prev) => {
      const next = new Set(prev);
      if (pending) {
        next.add(issueId);
      } else {
        next.delete(issueId);
      }
      return next;
    });
  }, []);

  const runStatusTransition = useCallback(async (params: {
    issueId: string;
    fromStatus: IssueStatus;
    toStatus: IssueStatus;
    note?: string;
    source: 'issue_board';
    issueLabel: string;
    closeDialogOnSuccess?: boolean;
  }) => {
    const {
      issueId,
      fromStatus,
      toStatus,
      note,
      source,
      issueLabel,
      closeDialogOnSuccess = false,
    } = params;
    setTransitionFailures((prev) => prev.filter((entry) => entry.issueId !== issueId));
    setOptimisticStatusByIssueId((prev) => ({
      ...prev,
      [issueId]: toStatus,
    }));
    setTransitionPending(issueId, true);
    try {
      await updateMutation.mutateAsync({
        issueId,
        status: toStatus,
        ...(note && { resolutionNotes: note }),
      });
      trackSupportIssueTransition({
        name: 'support_issue_transition',
        issueId,
        fromStatus,
        toStatus,
        action: getTransitionAction(toStatus),
        source,
      });
      toast.success(`Issue moved to ${toStatus.replace('_', ' ')}`, {
        action: {
          label: 'View',
          onClick: () =>
            navigate({ to: '/support/issues/$issueId', params: { issueId } }),
        },
      });
      if (closeDialogOnSuccess) {
        setStatusChangeDialog(null);
      }
    } catch (err) {
      setOptimisticStatusByIssueId((prev) => {
        const next = { ...prev };
        delete next[issueId];
        return next;
      });
      const message = err instanceof Error ? err.message : 'Failed to update issue status';
      setTransitionFailures((prev) => {
        const next = prev.filter((entry) => entry.issueId !== issueId);
        next.push({
          issueId,
          issueLabel,
          fromStatus,
          toStatus,
          note,
          message,
        });
        return next;
      });
      toast.error(`Failed to move ${issueLabel}: ${message}`, {
        action: {
          label: 'Retry',
          onClick: () => {
            void runStatusTransition(params);
          },
        },
      });
    } finally {
      setTransitionPending(issueId, false);
    }
  }, [updateMutation, navigate, setTransitionPending]);

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
      if (transitionPendingIds.has(event.issueId)) return;

      if (skipStatusPrompt) {
        void (async () => {
          await runStatusTransition({
            issueId: event.issueId,
            fromStatus: event.fromStatus,
            toStatus: event.toStatus,
            source: 'issue_board',
            issueLabel: issue.issueNumber,
          });
        })();
      } else {
        // Show dialog
        setStatusChangeDialog({
          open: true,
          issueId: event.issueId,
          issueTitle: issue.title,
          fromStatus: event.fromStatus,
          toStatus: event.toStatus,
        });
      }
    },
    [issues, skipStatusPrompt, transitionPendingIds, runStatusTransition]
  );

  // Handle status change dialog confirmation
  const handleStatusChangeConfirm = (result: StatusChangeResult) => {
    if (!statusChangeDialog) return;

    if (!result.confirmed) {
      setStatusChangeDialog(null);
      return;
    }

    const issueId = statusChangeDialog.issueId;
    const toStatus = statusChangeDialog.toStatus;
    const fromStatus = statusChangeDialog.fromStatus;
    const issueNumber = issues.find((i) => i.id === issueId)?.issueNumber ?? issueId.slice(0, 8);

    void (async () => {
      await runStatusTransition({
        issueId,
        fromStatus,
        toStatus,
        note: result.note,
        source: 'issue_board',
        issueLabel: issueNumber,
        closeDialogOnSuccess: true,
      });
      if (result.skipPromptForSession) {
        setSkipStatusPrompt(true);
      }
    })();
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

    const actionVerb = (() => {
      if (event.action === 'assign') return 'Assigned';
      if (event.action === 'change_priority') return 'Updated priority for';
      if (event.action === 'change_status') return 'Updated status for';
      if (event.action === 'close') return 'Closed';
      if (event.action === 'delete') return 'Deleted';
      return 'Updated';
    })();

    const runActionForIssue = async (issueId: string) => {
      if (event.action === 'assign') {
        await updateMutation.mutateAsync({
          issueId,
          assignedToUserId: event.value === 'unassigned' ? null : event.value,
        });
        return;
      }
      if (event.action === 'change_priority') {
        await updateMutation.mutateAsync({ issueId, priority: event.value as IssuePriority });
        return;
      }
      if (event.action === 'change_status' || event.action === 'close') {
        const toStatus = event.value as IssueStatus;
        const fromStatus = issues.find((i) => i.id === issueId)?.status;
        await updateMutation.mutateAsync({ issueId, status: toStatus });
        trackSupportIssueTransition({
          name: 'support_issue_transition',
          issueId,
          fromStatus,
          toStatus,
          action: getTransitionAction(toStatus),
          source: 'issue_bulk',
        });
        return;
      }
      if (event.action === 'delete') {
        await deleteMutation.mutateAsync(issueId);
        trackSupportIssueTransition({
          name: 'support_issue_transition',
          issueId,
          action: 'delete',
          source: 'issue_bulk',
        });
        return;
      }
      throw new Error('Unsupported bulk action');
    };

    try {
      const results = await Promise.allSettled(ids.map((issueId) => runActionForIssue(issueId)));
      const failed = results
        .map((result, index) => ({ result, issueId: ids[index] }))
        .filter((entry): entry is { result: PromiseRejectedResult; issueId: string } => entry.result.status === 'rejected');
      const succeeded = ids.length - failed.length;

      if (succeeded > 0) {
        toast.success(`${actionVerb} ${succeeded} issue${succeeded > 1 ? 's' : ''}`, {
          action: {
            label: 'View Issues',
            onClick: () => navigate({ to: '/support/issues' }),
          },
        });
      }

      if (failed.length > 0) {
        const failureItems = failed.map(({ issueId, result }) => {
          const issue = issues.find((i) => i.id === issueId);
          return {
            issueId,
            issueLabel: issue?.issueNumber ?? issueId.slice(0, 8),
            message: result.reason instanceof Error ? result.reason.message : 'Unknown error',
          };
        });
        setBulkFailures(failureItems);

        const failedSummary = failureItems
          .slice(0, 3)
          .map((item) => `${item.issueLabel}: ${item.message}`)
          .join(' | ');
        toast.error(
          `${failed.length} update${failed.length > 1 ? 's' : ''} failed${
            failedSummary ? ` (${failedSummary})` : ''
          }`
        );
        setSelectedIds(new Set(failed.map((f) => f.issueId)));
        return;
      }

      setBulkFailures([]);
      setSelectedIds(new Set());
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update issues');
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

        {transitionFailures.length > 0 && (
          <Alert variant="destructive">
            <AlertTitle>
              {transitionFailures.length} workflow transition failure{transitionFailures.length > 1 ? 's' : ''}
            </AlertTitle>
            <AlertDescription className="space-y-3">
              <div className="space-y-2 text-sm">
                {transitionFailures.slice(0, 5).map((failure) => (
                  <div key={failure.issueId} className="rounded border border-destructive/30 p-2">
                    <div className="font-medium">{failure.issueLabel}</div>
                    <div className="text-muted-foreground">
                      {failure.fromStatus.replace('_', ' ')} → {failure.toStatus.replace('_', ' ')}
                    </div>
                    <div>{failure.message}</div>
                    <div className="mt-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          void runStatusTransition({
                            issueId: failure.issueId,
                            fromStatus: failure.fromStatus,
                            toStatus: failure.toStatus,
                            note: failure.note,
                            source: 'issue_board',
                            issueLabel: failure.issueLabel,
                          });
                        }}
                      >
                        Retry
                      </Button>
                    </div>
                  </div>
                ))}
                {transitionFailures.length > 5 && (
                  <div>…and {transitionFailures.length - 5} more.</div>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedIds(new Set(transitionFailures.map((item) => item.issueId)))}
                >
                  Select Failed
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setTransitionFailures([])}
                >
                  Dismiss
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {bulkFailures.length > 0 && (
          <Alert variant="destructive">
            <AlertTitle>
              {bulkFailures.length} bulk operation failure{bulkFailures.length > 1 ? 's' : ''}
            </AlertTitle>
            <AlertDescription className="space-y-3">
              <div className="text-sm">
                {bulkFailures.slice(0, 5).map((failure) => (
                  <div key={failure.issueId}>
                    <strong>{failure.issueLabel}</strong>: {failure.message}
                  </div>
                ))}
                {bulkFailures.length > 5 && (
                  <div>…and {bulkFailures.length - 5} more.</div>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedIds(new Set(bulkFailures.map((item) => item.issueId)))}
                >
                  Re-select Failed
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setBulkFailures([])}
                >
                  Dismiss
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Kanban Board - min-w-0 constrains width so overflow-x-auto scrolls instead of page */}
        <div className="min-w-0">
          <IssueKanbanBoard
          issues={boardIssues}
          selectedIds={selectedIds}
          pendingIssueIds={transitionPendingIds}
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
          isPending={updateMutation.isPending || deleteMutation.isPending}
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
            isPending={updateMutation.isPending}
            onConfirm={handleStatusChangeConfirm}
          />
        )}
        </PageLayout.Content>
      </PageLayout>
    </TooltipProvider>
  );
}
