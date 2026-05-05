import {
  AuthError,
  NotFoundError,
  PermissionDeniedError,
  RateLimitError,
  ValidationError,
  isServerError,
} from '@/lib/server/errors';

const BULK_APPROVAL_ROW_FALLBACK =
  'This approval request could not be approved. Refresh and try again.';

export interface BulkApprovalFailure {
  id: string;
  reason: string;
}

export function toBulkApprovalFailure(id: string, error: unknown): BulkApprovalFailure {
  return {
    id,
    reason: getSafeBulkApprovalFailureReason(error),
  };
}

function getSafeBulkApprovalFailureReason(error: unknown): string {
  if (error instanceof ValidationError && !isUnsafeMessage(error.message)) {
    return error.message;
  }

  if (error instanceof NotFoundError) {
    return 'This approval request could not be found or has already been processed. Refresh and try again.';
  }

  if (error instanceof PermissionDeniedError || error instanceof AuthError) {
    return 'You do not have permission to approve this purchase order.';
  }

  if (error instanceof RateLimitError) {
    return 'Too many approvals were attempted at once. Wait a moment and retry.';
  }

  if (isServerError(error)) {
    return BULK_APPROVAL_ROW_FALLBACK;
  }

  return BULK_APPROVAL_ROW_FALLBACK;
}

function isUnsafeMessage(message: string): boolean {
  const normalized = message.toLowerCase();
  return (
    normalized.includes('duplicate key') ||
    normalized.includes('violates') ||
    normalized.includes('constraint') ||
    normalized.includes('postgres') ||
    normalized.includes('supabase') ||
    normalized.includes('database') ||
    normalized.includes('stack') ||
    normalized.includes('internal server error')
  );
}
