type UnknownRecord = Record<string, unknown>;

const DEFAULT_CODE_MESSAGES: Record<string, string> = {
  NOT_FOUND: 'The purchase order could not be found. Refresh and try again.',
  PERMISSION_DENIED: 'You do not have permission to update purchase orders.',
  AUTH_ERROR: 'Your session has expired. Sign in again before updating purchase orders.',
  RATE_LIMIT: 'Too many purchase order updates were attempted. Wait a moment and retry.',
};

interface FormatPurchaseOrderMutationErrorOptions {
  codeMessages?: Record<string, string>;
  allowSafeMessageWithoutStatus?: boolean;
}

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null;
}

function getValueAtPath(source: unknown, path: string[]): unknown {
  let cursor: unknown = source;
  for (const segment of path) {
    if (!isRecord(cursor)) return undefined;
    cursor = cursor[segment];
  }
  return cursor;
}

function extractFirstString(value: unknown): string | null {
  if (typeof value === 'string' && value.trim().length > 0) return value;
  if (Array.isArray(value)) {
    for (const entry of value) {
      if (typeof entry === 'string' && entry.trim().length > 0) {
        return entry;
      }
    }
  }
  return null;
}

function extractStatusCode(error: unknown): number | null {
  const paths = [
    ['statusCode'],
    ['status'],
    ['data', 'statusCode'],
    ['cause', 'statusCode'],
    ['cause', 'data', 'statusCode'],
    ['response', 'status'],
    ['response', 'data', 'statusCode'],
  ];

  for (const path of paths) {
    const value = getValueAtPath(error, path);
    if (typeof value === 'number') return value;
  }

  return null;
}

function extractCode(error: unknown): string | null {
  const paths = [
    ['errors', 'code'],
    ['data', 'errors', 'code'],
    ['cause', 'errors', 'code'],
    ['cause', 'data', 'errors', 'code'],
    ['details', 'validationErrors', 'code'],
    ['data', 'details', 'validationErrors', 'code'],
    ['cause', 'details', 'validationErrors', 'code'],
    ['cause', 'data', 'details', 'validationErrors', 'code'],
    ['response', 'data', 'details', 'validationErrors', 'code'],
    ['code'],
    ['data', 'code'],
    ['cause', 'code'],
    ['cause', 'data', 'code'],
    ['response', 'data', 'code'],
  ];

  for (const path of paths) {
    const code = extractFirstString(getValueAtPath(error, path));
    if (code) return code;
  }

  return null;
}

function extractFieldErrorMessage(error: unknown): string | null {
  const paths = [
    ['errors'],
    ['data', 'errors'],
    ['cause', 'errors'],
    ['cause', 'data', 'errors'],
    ['response', 'data', 'errors'],
    ['details', 'validationErrors'],
    ['data', 'details', 'validationErrors'],
    ['cause', 'details', 'validationErrors'],
    ['cause', 'data', 'details', 'validationErrors'],
    ['response', 'data', 'details', 'validationErrors'],
  ];

  for (const path of paths) {
    const fieldErrors = getValueAtPath(error, path);
    if (!isRecord(fieldErrors)) continue;
    for (const [field, messages] of Object.entries(fieldErrors)) {
      if (field === 'code') continue;
      const first = extractFirstString(messages);
      if (first) return first;
    }
  }

  return null;
}

function extractMessage(error: unknown): string | null {
  if (typeof error === 'string' && error.trim().length > 0) {
    return error;
  }

  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  const paths = [
    ['message'],
    ['error'],
    ['data', 'message'],
    ['data', 'error'],
    ['details', 'summary'],
    ['data', 'details', 'summary'],
    ['cause', 'message'],
    ['cause', 'details', 'summary'],
    ['cause', 'data', 'message'],
    ['cause', 'data', 'details', 'summary'],
    ['response', 'data', 'details', 'summary'],
    ['response', 'data', 'message'],
    ['response', 'data', 'error'],
  ];

  for (const path of paths) {
    const message = extractFirstString(getValueAtPath(error, path));
    if (message) return message;
  }

  return null;
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

function lookupCodeMessage(
  code: string,
  options: FormatPurchaseOrderMutationErrorOptions
): string | undefined {
  return (
    options.codeMessages?.[code] ??
    DEFAULT_CODE_MESSAGES[code] ??
    DEFAULT_CODE_MESSAGES[code.toUpperCase()]
  );
}

export function formatPurchaseOrderMutationError(
  error: unknown,
  fallback: string,
  options: FormatPurchaseOrderMutationErrorOptions = {}
): string {
  const code = extractCode(error);
  const fieldMessage = extractFieldErrorMessage(error);
  const statusCode = extractStatusCode(error);
  const codeMessage = code ? lookupCodeMessage(code, options) : undefined;

  if (fieldMessage && !isUnsafeMessage(fieldMessage)) {
    return fieldMessage;
  }

  if (codeMessage) {
    return codeMessage;
  }

  const message = extractMessage(error);
  if (
    message &&
    !isUnsafeMessage(message) &&
    (options.allowSafeMessageWithoutStatus ||
      statusCode === 400 ||
      statusCode === 401 ||
      statusCode === 403 ||
      statusCode === 404)
  ) {
    return message;
  }

  return fallback;
}

export function formatPurchaseOrderBulkFailureReason(
  error: unknown,
  fallback = 'Could not delete this purchase order'
): string {
  return formatPurchaseOrderMutationError(error, fallback, {
    allowSafeMessageWithoutStatus: true,
  });
}
