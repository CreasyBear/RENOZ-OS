import { formatPurchaseOrderMutationError } from '@/hooks/purchase-orders/_mutation-errors';
import { formatMutationError } from '@/lib/mutation-error-feedback';

const APPROVAL_CODE_MESSAGES: Record<string, string> = {
  NOT_FOUND:
    'This approval request could not be found or has already been processed. Refresh and try again.',
  PERMISSION_DENIED: 'You do not have permission to update approval requests.',
  AUTH_ERROR: 'Your session has expired. Sign in again before updating approval requests.',
  RATE_LIMIT: 'Too many approval updates were attempted. Wait a moment and retry.',
};

export function formatApprovalBulkFailureReason(
  error: unknown,
  fallback = 'Could not update this approval request'
): string {
  return formatPurchaseOrderMutationError(error, fallback, {
    codeMessages: APPROVAL_CODE_MESSAGES,
    allowSafeMessageWithoutStatus: true,
  });
}

export type ApprovalDecisionMutationAction = 'singleDecision' | 'bulkDecision';

const APPROVAL_DECISION_FALLBACKS: Record<ApprovalDecisionMutationAction, string> = {
  singleDecision: 'Unable to submit approval decision. Refresh and try again.',
  bulkDecision: 'Unable to submit bulk approval decision. Refresh and try again.',
};

export function formatApprovalDecisionMutationError(
  error: unknown,
  action: ApprovalDecisionMutationAction
): string {
  return formatMutationError(error, APPROVAL_DECISION_FALLBACKS[action], {
    codeMessages: APPROVAL_CODE_MESSAGES,
  });
}
