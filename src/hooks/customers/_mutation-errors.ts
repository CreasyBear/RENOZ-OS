type UnknownRecord = Record<string, unknown>;

const DEFAULT_CODE_MESSAGES: Record<string, string> = {
  NOT_FOUND: 'The customer could not be found. Refresh and try again.',
  PERMISSION_DENIED: 'You do not have permission to update customers.',
  AUTH_ERROR: 'Your session has expired. Sign in again before updating customers.',
  RATE_LIMIT: 'Too many customer updates were attempted. Wait a moment and retry.',
  CONFLICT: 'Customer details conflict with an existing customer.',
};

const SAVED_FILTER_FALLBACKS = {
  save: 'Unable to save customer filter.',
  update: 'Unable to update customer filter.',
  delete: 'Unable to delete customer filter.',
} as const;

const SAVED_FILTER_CODE_MESSAGES: Record<string, string> = {
  NOT_FOUND: 'The saved customer filter could not be found. Refresh and try again.',
  PERMISSION_DENIED: 'You do not have permission to manage saved customer filters.',
  AUTH_ERROR: 'Your session has expired. Sign in again before managing saved customer filters.',
  RATE_LIMIT: 'Too many saved customer filter changes were attempted. Wait a moment and retry.',
  CONFLICT: 'A saved customer filter with that name already exists.',
};

const ACTION_PLAN_FALLBACKS = {
  create: 'Unable to create customer action plan.',
  update: 'Unable to update customer action plan.',
  delete: 'Unable to delete customer action plan.',
  complete: 'Unable to complete customer action plan.',
} as const;

const ACTION_PLAN_CODE_MESSAGES: Record<string, string> = {
  NOT_FOUND: 'The customer action plan could not be found. Refresh and try again.',
  PERMISSION_DENIED: 'You do not have permission to manage customer action plans.',
  AUTH_ERROR: 'Your session has expired. Sign in again before managing customer action plans.',
  RATE_LIMIT: 'Too many customer action plan changes were attempted. Wait a moment and retry.',
  CONFLICT: 'Customer action plan details conflict with the current customer state.',
};

const XERO_CONTACT_FALLBACKS = {
  create: 'Unable to create Xero contact.',
  link: 'Unable to link Xero contact.',
  unlink: 'Unable to unlink Xero contact.',
} as const;

const XERO_CONTACT_CODE_MESSAGES: Record<string, string> = {
  NOT_FOUND: 'The customer or Xero contact could not be found. Refresh and try again.',
  PERMISSION_DENIED: 'You do not have permission to manage customer Xero contact mappings.',
  AUTH_ERROR: 'Your session has expired. Sign in again before managing customer Xero contact mappings.',
  RATE_LIMIT: 'Too many Xero contact mapping changes were attempted. Wait a moment and retry.',
  CONFLICT: 'This customer Xero contact mapping conflicts with the current customer or Xero state.',
};

interface FormatCustomerMutationErrorOptions {
  codeMessages?: Record<string, string>;
}

export type CustomerSavedFilterMutationAction = keyof typeof SAVED_FILTER_FALLBACKS;
export type CustomerActionPlanMutationAction = keyof typeof ACTION_PLAN_FALLBACKS;
export type CustomerXeroContactMutationAction = keyof typeof XERO_CONTACT_FALLBACKS;

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
    normalized.includes('sql') ||
    normalized.includes('stack') ||
    normalized.includes('internal server error') ||
    normalized.includes('typeerror') ||
    normalized.includes('referenceerror') ||
    normalized.includes('not a function') ||
    /cannot (read|set) properties of (undefined|null)/.test(normalized) ||
    /\bat\s+[\w.$<>]+\s*\(/.test(message)
  );
}

function lookupCodeMessage(
  code: string,
  options: FormatCustomerMutationErrorOptions
): string | undefined {
  return (
    options.codeMessages?.[code] ??
    options.codeMessages?.[code.toUpperCase()] ??
    DEFAULT_CODE_MESSAGES[code] ??
    DEFAULT_CODE_MESSAGES[code.toUpperCase()]
  );
}

export function formatCustomerMutationError(
  error: unknown,
  fallback: string,
  options: FormatCustomerMutationErrorOptions = {}
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
    (statusCode == null ||
      statusCode === 400 ||
      statusCode === 401 ||
      statusCode === 403 ||
      statusCode === 404 ||
      statusCode === 409)
  ) {
    return message;
  }

  return fallback;
}

export function formatCustomerSavedFilterMutationError(
  error: unknown,
  action: CustomerSavedFilterMutationAction
): string {
  return formatCustomerMutationError(error, SAVED_FILTER_FALLBACKS[action], {
    codeMessages: SAVED_FILTER_CODE_MESSAGES,
  });
}

export function formatCustomerActionPlanMutationError(
  error: unknown,
  action: CustomerActionPlanMutationAction
): string {
  return formatCustomerMutationError(error, ACTION_PLAN_FALLBACKS[action], {
    codeMessages: ACTION_PLAN_CODE_MESSAGES,
  });
}

export function formatCustomerXeroContactMutationError(
  error: unknown,
  action: CustomerXeroContactMutationAction
): string {
  return formatCustomerMutationError(error, XERO_CONTACT_FALLBACKS[action], {
    codeMessages: XERO_CONTACT_CODE_MESSAGES,
  });
}
