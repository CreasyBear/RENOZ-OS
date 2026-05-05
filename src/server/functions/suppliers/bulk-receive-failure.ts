import {
  serializedMutationErrorCodeSchema,
  type SerializedMutationErrorCode,
} from '@/lib/schemas/inventory';
import {
  AuthError,
  NotFoundError,
  PermissionDeniedError,
  RateLimitError,
  ValidationError,
  isServerError,
} from '@/lib/server/errors';

const BULK_RECEIVE_ROW_FALLBACK =
  'This purchase order could not be received. Refresh and try again.';

export interface BulkReceiveFailure {
  poId: string;
  error: string;
  code?: SerializedMutationErrorCode;
}

export function toBulkReceiveFailure(poId: string, error: unknown): BulkReceiveFailure {
  const failure: BulkReceiveFailure = {
    poId,
    error: getSafeBulkReceiveFailureMessage(error),
  };
  const code = getSerializedMutationErrorCode(error);

  if (code) {
    failure.code = code;
  }

  return failure;
}

function getSafeBulkReceiveFailureMessage(error: unknown): string {
  if (error instanceof ValidationError && !isUnsafeMessage(error.message)) {
    return error.message;
  }

  if (error instanceof NotFoundError) {
    return 'This purchase order could not be found. Refresh and try again.';
  }

  if (error instanceof PermissionDeniedError) {
    return 'You do not have permission to receive goods.';
  }

  if (error instanceof AuthError) {
    return 'Your session has expired. Sign in again before receiving goods.';
  }

  if (error instanceof RateLimitError) {
    return 'Too many purchase orders were received at once. Wait a moment and retry.';
  }

  if (isServerError(error)) {
    return BULK_RECEIVE_ROW_FALLBACK;
  }

  return BULK_RECEIVE_ROW_FALLBACK;
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

function getSerializedMutationErrorCode(error: unknown): SerializedMutationErrorCode | undefined {
  if (!(error instanceof ValidationError)) {
    return undefined;
  }

  const rawCode = error.errors.code?.[0];
  const parsed = serializedMutationErrorCodeSchema.safeParse(rawCode);
  return parsed.success ? parsed.data : undefined;
}
