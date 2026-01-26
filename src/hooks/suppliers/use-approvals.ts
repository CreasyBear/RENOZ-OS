/**
 * Approval Workflow Hooks
 *
 * TanStack Query hooks for purchase order approval management:
 * - Pending approvals list with filtering
 * - Approval details and history
 * - Approval/rejection/escalation mutations
 * - Delegation support
 * - Stats for dashboard widgets
 *
 * @see src/server/functions/suppliers/approvals.ts
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { queryKeys } from '@/lib/query-keys';
import {
  listPendingApprovals,
  getApprovalDetails,
  getApprovalHistory,
  getApprovalStats,
  approvePurchaseOrderAtLevel,
  rejectPurchaseOrderAtLevel,
  bulkApproveApprovals,
  escalateApproval,
  delegateApproval,
  evaluateApprovalRules,
} from '@/server/functions/suppliers/approvals';
import type {
  ListPendingApprovalsInput,
  ApproveRejectInput,
  RejectInput,
  EscalateInput,
  DelegateInput,
  BulkApproveInput,
} from '@/server/functions/suppliers/approvals';

// ============================================================================
// QUERY HOOKS
// ============================================================================

export interface UsePendingApprovalsOptions extends Partial<ListPendingApprovalsInput> {
  enabled?: boolean;
}

/**
 * Fetch pending approvals for the current user.
 * Includes approvals assigned directly or escalated to the user.
 */
export function usePendingApprovals(options: UsePendingApprovalsOptions = {}) {
  const { enabled = true, ...filters } = options;
  const listFn = useServerFn(listPendingApprovals);

  return useQuery({
    queryKey: queryKeys.approvals.pending(filters),
    queryFn: () => listFn({ data: filters as ListPendingApprovalsInput }),
    enabled,
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000, // Refresh every minute for real-time feel
  });
}

export interface UseApprovalDetailsOptions {
  enabled?: boolean;
}

/**
 * Fetch detailed approval information including PO and approver details.
 */
export function useApprovalDetails(
  approvalId: string,
  options: UseApprovalDetailsOptions = {}
) {
  const { enabled = true } = options;
  const getFn = useServerFn(getApprovalDetails);

  return useQuery({
    queryKey: queryKeys.approvals.detail(approvalId),
    queryFn: () => getFn({ data: { approvalId } }),
    enabled: enabled && !!approvalId,
    staleTime: 60 * 1000,
  });
}

/**
 * Fetch approval history for a purchase order.
 * Shows all approval decisions, escalations, and delegations.
 */
export function useApprovalHistory(purchaseOrderId: string, options: { enabled?: boolean } = {}) {
  const { enabled = true } = options;
  const getFn = useServerFn(getApprovalHistory);

  return useQuery({
    queryKey: queryKeys.approvals.history(purchaseOrderId),
    queryFn: () => getFn({ data: { purchaseOrderId } }),
    enabled: enabled && !!purchaseOrderId,
    staleTime: 60 * 1000,
  });
}

/**
 * Fetch approval stats for the current user's dashboard.
 * Includes counts by status and overdue items.
 */
export function useMyApprovalStats(options: { enabled?: boolean } = {}) {
  const { enabled = true } = options;
  const statsFn = useServerFn(getApprovalStats);

  return useQuery({
    queryKey: queryKeys.approvals.stats(),
    queryFn: () => statsFn({}),
    enabled,
    staleTime: 30 * 1000,
  });
}

// ============================================================================
// DECISION MUTATIONS
// ============================================================================

/**
 * Approve a pending approval request.
 * Updates approval status and checks for next level requirements.
 */
export function useApproveItem() {
  const queryClient = useQueryClient();
  const approveFn = useServerFn(approvePurchaseOrderAtLevel);

  return useMutation({
    mutationFn: (data: ApproveRejectInput) => approveFn({ data }),
    onSuccess: (_result, variables) => {
      // Invalidate approval queries
      queryClient.invalidateQueries({ queryKey: queryKeys.approvals.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.approvals.stats() });
      queryClient.invalidateQueries({
        queryKey: queryKeys.approvals.detail(variables.approvalId),
      });
      // Also invalidate purchase orders as status may have changed
      queryClient.invalidateQueries({ queryKey: queryKeys.suppliers.purchaseOrders() });
    },
  });
}

/**
 * Reject a pending approval request.
 * Requires rejection reason and comments.
 */
export function useRejectItem() {
  const queryClient = useQueryClient();
  const rejectFn = useServerFn(rejectPurchaseOrderAtLevel);

  return useMutation({
    mutationFn: (data: RejectInput) => rejectFn({ data }),
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.approvals.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.approvals.stats() });
      queryClient.invalidateQueries({
        queryKey: queryKeys.approvals.detail(variables.approvalId),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.suppliers.purchaseOrders() });
    },
  });
}

/**
 * Bulk approve multiple pending approvals.
 * Returns success/failure counts for each item.
 */
export function useBulkApprove() {
  const queryClient = useQueryClient();
  const bulkApproveFn = useServerFn(bulkApproveApprovals);

  return useMutation({
    mutationFn: (data: BulkApproveInput) => bulkApproveFn({ data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.approvals.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.suppliers.purchaseOrders() });
    },
  });
}

/**
 * Bulk reject multiple pending approvals.
 * Note: Uses the same RejectInput with an array approach.
 */
export function useBulkReject() {
  const queryClient = useQueryClient();
  const rejectFn = useServerFn(rejectPurchaseOrderAtLevel);

  return useMutation({
    mutationFn: async (items: RejectInput[]) => {
      const results = {
        rejected: [] as string[],
        failed: [] as { id: string; reason: string }[],
      };

      for (const item of items) {
        try {
          await rejectFn({ data: item });
          results.rejected.push(item.approvalId);
        } catch (error) {
          results.failed.push({
            id: item.approvalId,
            reason: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }

      return results;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.approvals.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.suppliers.purchaseOrders() });
    },
  });
}

// ============================================================================
// ESCALATION MUTATIONS
// ============================================================================

/**
 * Escalate an approval to a different user.
 * Requires escalation target and reason.
 */
export function useEscalateApproval() {
  const queryClient = useQueryClient();
  const escalateFn = useServerFn(escalateApproval);

  return useMutation({
    mutationFn: (data: EscalateInput) => escalateFn({ data }),
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.approvals.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.approvals.stats() });
      queryClient.invalidateQueries({
        queryKey: queryKeys.approvals.detail(variables.approvalId),
      });
    },
  });
}

// ============================================================================
// DELEGATION MUTATIONS
// ============================================================================

/**
 * Delegate an approval to another user.
 * Original approver is tracked in delegatedFrom field.
 */
export function useDelegateApproval() {
  const queryClient = useQueryClient();
  const delegateFn = useServerFn(delegateApproval);

  return useMutation({
    mutationFn: (data: DelegateInput) => delegateFn({ data }),
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.approvals.lists() });
      queryClient.invalidateQueries({
        queryKey: queryKeys.approvals.detail(variables.approvalId),
      });
    },
  });
}

/**
 * Revoke a delegation (placeholder - would need server function).
 * For now, this is a no-op that can be implemented when needed.
 */
export function useRevokeDelegation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (_approvalId: string) => {
      // TODO: Implement revokeDelegation server function
      throw new Error('Revoke delegation not yet implemented');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.approvals.all });
    },
  });
}

// ============================================================================
// RULE EVALUATION
// ============================================================================

/**
 * Evaluate approval rules for a purchase order.
 * Creates approval records based on matching rules.
 */
export function useEvaluateApprovalRules() {
  const queryClient = useQueryClient();
  const evaluateFn = useServerFn(evaluateApprovalRules);

  return useMutation({
    mutationFn: (purchaseOrderId: string) => evaluateFn({ data: { purchaseOrderId } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.approvals.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.suppliers.purchaseOrders() });
    },
  });
}
