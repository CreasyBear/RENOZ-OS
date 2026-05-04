/**
 * Issue Detail Hook
 *
 * Custom hook that encapsulates all data fetching, state management, and actions
 * for the issue detail view. Follows the hook pattern from DETAIL-VIEW-STANDARDS.md.
 *
 * @source issue from useIssue hook
 * @source relatedContext from getIssueById server shape
 *
 * @see docs/design-system/DETAIL-VIEW-STANDARDS.md
 * @see STANDARDS.md - Hook patterns
 */

import { useState, useMemo, useCallback } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useIssue, useUpdateIssue, useDeleteIssue, useEscalateIssue } from './use-issues';
import { useConfirmation, confirmations } from '@/hooks/_shared/use-confirmation';
import { toast } from 'sonner';
import type { IssueRelatedContext, IssueStatus } from '@/lib/schemas/support/issues';
import type { StatusChangeResult } from '@/components/domain/support/issues/issue-status-change-dialog';
import { trackSupportIssueTransition } from '@/lib/analytics';

// ============================================================================
// TYPES
// ============================================================================

export interface IssueDetailActions {
  /** Navigate back to issues list */
  onBack: () => void;
  /** Update issue status */
  onStatusChange: (status: IssueStatus) => void;
  /** Confirm status change from dialog */
  onStatusConfirm: (result: StatusChangeResult) => void;
  /** Delete issue (requires confirmation) */
  onDelete: () => Promise<void>;
  /** Refresh all issue data */
  onRefresh: () => void;
}

export interface CustomerContextData {
  orderSummary: {
    recentOrders: Array<{
      id: string;
      orderNumber: string;
      orderDate: string | null;
      status: string;
    }>;
    totalOrders: number;
  } | null;
  warranties: Array<{
    id: string;
    productName: string | null;
    productSerial: string | null;
    status: string;
  }>;
  otherIssues: Array<{
    id: string;
    title: string;
    createdAt: Date | string;
    status: string;
  }>;
  isLoading: boolean;
  error: Error | null;
}

export interface UseIssueDetailReturn {
  /** Issue data from API (includes customerId, not full customer object) */
  issue: ReturnType<typeof useIssue>['data'];
  /** Loading state for main issue fetch */
  isLoading: boolean;
  /** Error state for main issue fetch */
  error: Error | null;
  /** Active tab state */
  activeTab: string;
  /** Tab change handler */
  onTabChange: (tab: string) => void;
  /** Customer context data for sidebar */
  customerContext: CustomerContextData;
  /** Anchor-first related context for the related tab */
  relatedContext: IssueRelatedContext | null;
  /** Customer ID from issue (null if not linked) */
  customerId: string | null;
  /** Available actions */
  actions: IssueDetailActions;
  /** Status dialog state */
  statusDialog: { open: boolean; toStatus: IssueStatus } | null;
  /** Set status dialog state */
  setStatusDialog: (dialog: { open: boolean; toStatus: IssueStatus } | null) => void;
  /** Escalation dialog open state */
  escalationDialogOpen: boolean;
  /** Set escalation dialog open state */
  setEscalationDialogOpen: (open: boolean) => void;
  /** Update mutation status */
  isUpdatePending: boolean;
  /** Delete mutation status */
  isDeletePending: boolean;
  /** Escalate handler - call when user confirms escalation in dialog */
  onEscalate: (reason: string, escalateToUserId?: string) => Promise<void>;
  /** Escalate mutation status */
  isEscalatePending: boolean;
}

// ============================================================================
// HOOK
// ============================================================================

export function useIssueDetail(issueId: string): UseIssueDetailReturn {
  const navigate = useNavigate();
  const { confirm } = useConfirmation();
  const [activeTab, setActiveTab] = useState('overview');
  const [statusDialog, setStatusDialog] = useState<{
    open: boolean;
    toStatus: IssueStatus;
  } | null>(null);
  const [escalationDialogOpen, setEscalationDialogOpen] = useState(false);

  // Fetch issue detail
  const { data: issue, isLoading, error, refetch } = useIssue({ issueId });

  const customerId = issue?.customerId ?? null;

  // Mutations
  const updateMutation = useUpdateIssue();
  const deleteMutation = useDeleteIssue();
  const escalateMutation = useEscalateIssue();

  const relatedContext = useMemo(() => issue?.relatedContext ?? null, [issue?.relatedContext]);
  const customerContext = useMemo<CustomerContextData>(
    () => ({
      orderSummary: relatedContext?.customerContext
        ? {
            recentOrders: relatedContext.customerContext.recentOrders,
            totalOrders: relatedContext.customerContext.recentOrders.length,
          }
        : null,
      warranties: relatedContext?.customerContext?.warranties ?? [],
      otherIssues: relatedContext?.customerContext?.otherIssues ?? [],
      isLoading: false,
      error: null,
    }),
    [relatedContext]
  );

  // Actions
  const actions = useMemo<IssueDetailActions>(
    () => ({
      onBack: () => {
        navigate({ to: '/support/issues' });
      },
      onStatusChange: (newStatus: IssueStatus) => {
        if (newStatus === 'escalated') {
          setEscalationDialogOpen(true);
        } else {
          setStatusDialog({
            open: true,
            toStatus: newStatus,
          });
        }
      },
      onStatusConfirm: (result: StatusChangeResult) => {
        if (!result.confirmed) {
          setStatusDialog(null);
          return;
        }
        if (!statusDialog) return;

        const toStatus = statusDialog.toStatus;
        void (async () => {
          try {
            const payload: Parameters<typeof updateMutation.mutateAsync>[0] = {
              issueId,
              status: toStatus,
            };

            if (toStatus === 'on_hold' && result.note) {
              payload.holdReason = result.note;
            }

            if (toStatus === 'resolved') {
              payload.resolutionNotes = result.note;
              payload.resolutionCategory = result.resolutionCategory;
              payload.diagnosisNotes = result.diagnosisNotes ?? null;
              payload.nextActionType = result.nextActionType;
            }

            await updateMutation.mutateAsync({
              ...payload,
            });
            trackSupportIssueTransition({
              name: 'support_issue_transition',
              issueId,
              fromStatus: issue?.status,
              toStatus,
              action:
                toStatus === 'in_progress'
                  ? 'start'
                  : toStatus === 'on_hold'
                    ? 'hold'
                    : toStatus === 'escalated'
                      ? 'escalate'
                      : toStatus === 'resolved'
                        ? 'resolve'
                        : toStatus === 'closed'
                          ? 'close'
                          : 'status_change',
              source: 'issue_detail',
            });
            const statusLabel = toStatus.replace('_', ' ');
            toast.success(`Issue ${statusLabel}`, {
              action: {
                label: 'View',
                onClick: () => navigate({ to: '/support/issues/$issueId', params: { issueId } }),
              },
            });
            setStatusDialog(null);
          } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Failed to update issue status');
          }
        })();
      },
      onDelete: async () => {
        const { confirmed } = await confirm(confirmations.delete(issue?.title ?? 'issue', 'issue'));
        if (!confirmed) return;
        try {
          const result = await deleteMutation.mutateAsync(issueId);
          trackSupportIssueTransition({
            name: 'support_issue_transition',
            issueId,
            action: 'delete',
            source: 'issue_detail',
          });
          toast.success(result.message ?? 'Issue deleted successfully', {
            action: { label: 'View Issues', onClick: () => navigate({ to: '/support/issues' }) },
          });
          navigate({ to: '/support/issues' });
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to delete issue';
          toast.error(message);
          throw error;
        }
      },
      onRefresh: () => {
        refetch();
      },
    }),
    [navigate, issueId, issue, deleteMutation, confirm, refetch, statusDialog, updateMutation, setStatusDialog]
  );

  const onEscalate = useCallback(
    async (reason: string, escalateToUserId?: string) => {
      try {
        await escalateMutation.mutateAsync({
          issueId,
          reason,
          escalateToUserId,
        });
        trackSupportIssueTransition({
          name: 'support_issue_transition',
          issueId,
          toStatus: 'escalated',
          action: 'escalate',
          source: 'issue_detail',
        });
        setEscalationDialogOpen(false);
        toast.success('Issue escalated', {
          action: {
            label: 'View',
            onClick: () => navigate({ to: '/support/issues/$issueId', params: { issueId } }),
          },
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to escalate';
        toast.error(message);
        throw err;
      }
    },
    [issueId, escalateMutation, navigate]
  );

  return {
    issue,
    isLoading,
    error,
    activeTab,
    onTabChange: setActiveTab,
    customerContext,
    relatedContext,
    customerId: customerId ?? null,
    actions,
    statusDialog,
    setStatusDialog,
    escalationDialogOpen,
    setEscalationDialogOpen,
    isUpdatePending: updateMutation.isPending,
    isDeletePending: deleteMutation.isPending,
    onEscalate,
    isEscalatePending: escalateMutation.isPending,
  };
}
