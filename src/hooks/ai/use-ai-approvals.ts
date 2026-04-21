/**
 * AI Approvals Hooks
 *
 * TanStack Query hooks for AI approval management:
 * - Pending approvals list with polling
 * - Approve/reject mutations
 * - Approval count for badges
 *
 * @see src/routes/api/ai/approvals.ts
 * @see src/routes/api/ai/approve.ts
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { AIEmailDraft } from '@/lib/ai/approvals/email-draft';
import { normalizeReadQueryError } from '@/lib/read-path-policy';
import { queryKeys, type AIApprovalFilters } from '@/lib/query-keys';

// ============================================================================
// TYPES
// ============================================================================

export interface AIApproval {
  id: string;
  action: string;
  agent: string;
  actionData: Record<string, unknown>;
  version: number;
  status: 'pending' | 'approved' | 'rejected' | 'expired';
  createdAt: string;
  expiresAt: string;
  conversationId?: string;
}

export interface AIApprovalsResponse {
  approvals: AIApproval[];
  total: number;
}

export interface ApproveActionInput {
  approvalId: string;
  action: 'approve' | 'reject';
  rejectionReason?: string;
  expectedVersion?: number;
}

export interface ApproveActionResponse {
  success: boolean;
  result?: unknown;
  message?: string;
  error?: string;
  code?: string;
  retryAvailable?: boolean;
}

export interface UpdateAIEmailDraftInput {
  approvalId: string;
  draft: AIEmailDraft;
  expectedVersion?: number;
}

export interface UpdateAIEmailDraftResponse {
  success: boolean;
  approval: AIApproval;
}

// ============================================================================
// API HELPERS
// ============================================================================

async function fetchPendingApprovals(
  filters?: AIApprovalFilters
): Promise<AIApprovalsResponse> {
  const params = new URLSearchParams();
  if (filters?.status) params.set('status', filters.status);
  if (filters?.limit) params.set('limit', String(filters.limit));

  const response = await fetch(`/api/ai/approvals?${params.toString()}`, {
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error('Failed to fetch approvals');
  }

  return response.json();
}

async function submitApprovalAction(
  input: ApproveActionInput
): Promise<ApproveActionResponse> {
  const response = await fetch('/api/ai/approve', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(input),
  });

  const data = await response.json();

  if (!response.ok) {
    const error = Object.assign(
      new Error(data.error || 'Failed to process approval'),
      {
        code: typeof data.code === 'string' ? data.code : undefined,
        retryAvailable: data.retryAvailable === true,
      }
    );
    throw error;
  }

  return data;
}

async function updateApprovalDraft(
  input: UpdateAIEmailDraftInput
): Promise<UpdateAIEmailDraftResponse> {
  const response = await fetch(`/api/ai/approvals/${input.approvalId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({
      draft: input.draft,
      expectedVersion: input.expectedVersion,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Failed to update approval draft');
  }

  return data;
}

// ============================================================================
// QUERY HOOKS
// ============================================================================

export interface UseAIApprovalsOptions {
  status?: 'pending' | 'approved' | 'rejected' | 'expired';
  limit?: number;
  enabled?: boolean;
  /** Polling interval in ms. Set to false to disable. Default: 30000 */
  refetchInterval?: number | false;
}

/**
 * Fetch AI approvals with optional polling.
 * Default polls every 30 seconds for pending approvals.
 */
export function useAIApprovals(options: UseAIApprovalsOptions = {}) {
  const {
    status = 'pending',
    limit = 50,
    enabled = true,
    refetchInterval = 30000,
  } = options;

  const filters: AIApprovalFilters = { status, limit };

  return useQuery({
    queryKey: queryKeys.ai.approvals.list(filters),
    queryFn: async () => {
      try {
        return await fetchPendingApprovals(filters);
      } catch (error) {
        throw normalizeReadQueryError(error, {
          contractType: 'always-shaped',
          fallbackMessage: 'AI approvals are temporarily unavailable. Please refresh and try again.',
        });
      }
    },
    enabled,
    staleTime: 15 * 1000, // 15 seconds
    refetchInterval,
  });
}

/**
 * Fetch only pending approvals count for badge display.
 * Lighter weight query optimized for polling.
 */
export function useAIPendingApprovalsCount(options: { enabled?: boolean } = {}) {
  const { enabled = true } = options;

  return useQuery({
    queryKey: queryKeys.ai.approvals.count(),
    queryFn: async () => {
      try {
        const result = await fetchPendingApprovals({ status: 'pending', limit: 1 });
        return result.total;
      } catch (error) {
        throw normalizeReadQueryError(error, {
          contractType: 'always-shaped',
          fallbackMessage: 'AI approvals are temporarily unavailable. Please refresh and try again.',
        });
      }
    },
    enabled,
    staleTime: 15 * 1000,
    refetchInterval: 30000, // Poll every 30 seconds
  });
}

// ============================================================================
// MUTATION HOOKS
// ============================================================================

/**
 * Approve an AI-drafted action.
 * Invalidates approval queries on success.
 */
export function useApproveAction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: string | { approvalId: string; expectedVersion?: number }) =>
      submitApprovalAction(
        typeof input === 'string'
          ? { approvalId: input, action: 'approve' }
          : {
              approvalId: input.approvalId,
              action: 'approve',
              expectedVersion: input.expectedVersion,
            }
      ),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.ai.approvals.all() });
    },
  });
}

/**
 * Reject an AI-drafted action.
 * Requires optional rejection reason.
 */
export function useRejectAction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { approvalId: string; rejectionReason?: string; expectedVersion?: number }) =>
      submitApprovalAction({
        approvalId: input.approvalId,
        action: 'reject',
        rejectionReason: input.rejectionReason,
        expectedVersion: input.expectedVersion,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.ai.approvals.all() });
    },
  });
}

/**
 * Update the draft payload for a pending AI email approval.
 */
export function useUpdateAIEmailDraft() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateAIEmailDraftInput) => updateApprovalDraft(input),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.ai.approvals.all() });
      queryClient.setQueryData(queryKeys.ai.approvals.detail(result.approval.id), result.approval);
    },
  });
}
