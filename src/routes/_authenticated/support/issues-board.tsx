/**
 * Issues Board Route
 *
 * Kanban board view for issue management.
 *
 * @see src/components/domain/support/issue-kanban-board.tsx
 * @see _Initiation/_prd/2-domains/support/support.prd.json - DOM-SUP-008
 */

import { useState, useMemo, useCallback } from 'react';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { Plus, LayoutGrid, List, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LoadingState } from '@/components/shared/loading-state';
import { TooltipProvider } from '@/components/ui/tooltip';
import { IssueKanbanBoard, type IssueStatus } from '@/components/domain/support/issue-kanban-board';
import {
  IssueQuickFilters,
  type QuickFilter,
} from '@/components/domain/support/issue-quick-filters';
import {
  IssueBulkActions,
  type BulkActionEvent,
} from '@/components/domain/support/issue-bulk-actions';
import {
  IssueStatusChangeDialog,
  type StatusChangeResult,
  type IssueStatus as DialogIssueStatus,
} from '@/components/domain/support/issue-status-change-dialog';
import { useIssuesWithSlaMetrics, useUpdateIssue } from '@/hooks/support';
import type { IssueKanbanItem } from '@/components/domain/support/issue-kanban-card';

// ============================================================================
// ROUTE
// ============================================================================

export const Route = createFileRoute('/_authenticated/support/issues-board')({
  component: IssuesBoardPage,
});

// ============================================================================
// PAGE COMPONENT
// ============================================================================

function IssuesBoardPage() {
  const navigate = useNavigate();

  // State
  const [activeFilter, setActiveFilter] = useState<QuickFilter>('all');
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

  // Fetch issues
  const { data, isLoading, error, refetch } = useIssuesWithSlaMetrics();

  // Update mutation
  const updateMutation = useUpdateIssue();

  // Transform issues to kanban format
  const issues = useMemo<IssueKanbanItem[]>(() => {
    if (!data) return [];

    return data.map((issue: any) => {
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
        customer: issue.customer,
        assignedTo: issue.assignedTo,
        createdAt: issue.createdAt,
        slaStatus,
        slaResponseDue: issue.slaMetrics?.responseDueAt ?? null,
        slaResolutionDue: issue.slaMetrics?.resolutionDueAt ?? null,
      };
    });
  }, [data]);

  // Filter issues based on quick filter
  const filteredIssues = useMemo(() => {
    if (activeFilter === 'all') return issues;

    return issues.filter((issue) => {
      switch (activeFilter) {
        case 'my_issues':
          // Would need current user ID from auth context
          return issue.assignedTo !== null;
        case 'unassigned':
          return issue.assignedTo === null;
        case 'sla_at_risk':
          return issue.slaStatus === 'at_risk' || issue.slaStatus === 'breached';
        case 'high_priority':
          return issue.priority === 'high' || issue.priority === 'critical';
        case 'recent':
          const oneDayAgo = new Date();
          oneDayAgo.setDate(oneDayAgo.getDate() - 1);
          return new Date(issue.createdAt) > oneDayAgo;
        default:
          return true;
      }
    });
  }, [issues, activeFilter]);

  // Filter counts
  const filterCounts = useMemo(() => {
    return {
      all: issues.length,
      my_issues: issues.filter((i) => i.assignedTo !== null).length,
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
  }, [issues]);

  // Handle status change via drag-drop
  const handleStatusChange = useCallback(
    (event: { issueId: string; fromStatus: IssueStatus; toStatus: IssueStatus }) => {
      const issue = issues.find((i) => i.id === event.issueId);
      if (!issue) return;

      if (skipStatusPrompt) {
        // Directly update without dialog
        updateMutation.mutate({
          issueId: event.issueId,
          status: event.toStatus,
        });
        toast.success(`Issue moved to ${event.toStatus.replace('_', ' ')}`);
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
    [issues, skipStatusPrompt, updateMutation]
  );

  // Handle status change dialog confirmation
  const handleStatusChangeConfirm = (result: StatusChangeResult) => {
    if (!statusChangeDialog) return;

    if (result.confirmed) {
      updateMutation.mutate({
        issueId: statusChangeDialog.issueId,
        status: statusChangeDialog.toStatus,
        ...(result.note && { resolutionNotes: result.note }),
      });
      toast.success(`Issue moved to ${statusChangeDialog.toStatus.replace('_', ' ')}`);

      if (result.skipPromptForSession) {
        setSkipStatusPrompt(true);
      }
    }

    setStatusChangeDialog(null);
  };

  // Handle issue click
  const handleIssueClick = (issue: IssueKanbanItem) => {
    // Navigate to issue detail page
    // @ts-expect-error - Route file doesn't exist yet
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
          await updateMutation.mutateAsync({ issueId, priority: event.value as any });
        } else if (event.action === 'change_status' || event.action === 'close') {
          await updateMutation.mutateAsync({ issueId, status: event.value as any });
        }
      }

      toast.success(`Updated ${ids.length} issue${ids.length > 1 ? 's' : ''}`);
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
      <div className="container py-6">
        <div className="py-12 text-center">
          <p className="text-destructive mb-4">Failed to load issues</p>
          <Button onClick={() => refetch()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="container space-y-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Issues Board</h1>
            <p className="text-muted-foreground">Manage issues with drag-and-drop</p>
          </div>
          <div className="flex items-center gap-2">
            {/* View Toggle */}
            <Tabs defaultValue="board" className="w-auto">
              <TabsList className="h-9">
                <TabsTrigger value="board" className="px-3">
                  <LayoutGrid className="h-4 w-4" />
                </TabsTrigger>
                {/* @ts-expect-error - Route file doesn't exist yet */}
                <Link to="/support/issues">
                  <TabsTrigger value="list" className="px-3">
                    <List className="h-4 w-4" />
                  </TabsTrigger>
                </Link>
              </TabsList>
            </Tabs>

            <Button onClick={() => refetch()} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4" />
            </Button>

            {/* @ts-expect-error - Route file doesn't exist yet */}
            <Link to="/support/issues/new">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                New Issue
              </Button>
            </Link>
          </div>
        </div>

        {/* Quick Filters */}
        <IssueQuickFilters
          activeFilter={activeFilter}
          onFilterChange={setActiveFilter}
          counts={filterCounts}
        />

        {/* Kanban Board */}
        <IssueKanbanBoard
          issues={filteredIssues}
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
          onStatusChange={handleStatusChange}
          onIssueClick={handleIssueClick}
        />

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
      </div>
    </TooltipProvider>
  );
}
