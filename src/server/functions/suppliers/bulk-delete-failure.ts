import {
  AuthError,
  NotFoundError,
  PermissionDeniedError,
  RateLimitError,
  ValidationError,
  isServerError,
} from '@/lib/server/errors';

const BULK_DELETE_PO_ROW_FALLBACK =
  'This purchase order could not be deleted. Refresh and try again.';

export interface BulkDeletePOFailure {
  id: string;
  error: string;
}

export function toBulkDeletePOFailure(id: string, error: unknown): BulkDeletePOFailure {
  return {
    id,
    error: getSafeBulkDeleteFailureMessage(error),
  };
}

function getSafeBulkDeleteFailureMessage(error: unknown): string {
  if (error instanceof ValidationError && !isUnsafeMessage(error.message)) {
    return error.message;
  }

  if (error instanceof NotFoundError) {
    return 'This purchase order could not be found. Refresh and try again.';
  }

  if (error instanceof PermissionDeniedError) {
    return 'You do not have permission to delete this purchase order.';
  }

  if (error instanceof AuthError) {
    return 'Your session has expired. Sign in again before deleting purchase orders.';
  }

  if (error instanceof RateLimitError) {
    return 'Too many purchase orders were deleted at once. Wait a moment and retry.';
  }

  if (isServerError(error)) {
    return BULK_DELETE_PO_ROW_FALLBACK;
  }

  return BULK_DELETE_PO_ROW_FALLBACK;
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
