type UnknownRecord = Record<string, unknown>;

const USER_MUTATION_FALLBACKS = {
  updateUser: 'User update is temporarily unavailable. Please refresh and try again.',
  deactivateUser: 'User deactivation is temporarily unavailable. Please refresh and try again.',
  reactivateUser: 'User reactivation is temporarily unavailable. Please refresh and try again.',
  bulkUpdateUsers: 'Bulk user update is temporarily unavailable. Please refresh and try again.',
  exportUsers: 'User export is temporarily unavailable. Please refresh and try again.',
  transferOwnership: 'Ownership transfer is temporarily unavailable. Please refresh and try again.',
  addGroupMember: 'Group membership update is temporarily unavailable. Please refresh and try again.',
  updateProfile: 'Profile update is temporarily unavailable. Please refresh and try again.',
  updateAvatar: 'Avatar update is temporarily unavailable. Please refresh and try again.',
  removeAvatar: 'Avatar removal is temporarily unavailable. Please refresh and try again.',
  updateNotificationPreference:
    'Notification preference update is temporarily unavailable. Please refresh and try again.',
  updateNotificationPreferences:
    'Notification preferences update is temporarily unavailable. Please refresh and try again.',
  acceptInvitation: 'Invitation acceptance is temporarily unavailable. Please refresh and try again.',
  sendInvitation: 'Invitation sending is temporarily unavailable. Please refresh and try again.',
  cancelInvitation: 'Invitation cancellation is temporarily unavailable. Please refresh and try again.',
  resendInvitation: 'Invitation resend is temporarily unavailable. Please refresh and try again.',
  batchSendInvitations: 'Bulk invitation sending is temporarily unavailable. Please refresh and try again.',
  terminateSession: 'Session termination is temporarily unavailable. Please refresh and try again.',
  terminateOtherSessions: 'Session cleanup is temporarily unavailable. Please refresh and try again.',
} as const;

const USER_MUTATION_CODE_MESSAGES: Record<string, string> = {
  NOT_FOUND: 'The requested user administration record could not be found. Refresh and try again.',
  PERMISSION_DENIED: 'You do not have permission to manage users.',
  AUTH_ERROR: 'Your session has expired. Sign in again before managing users.',
  RATE_LIMIT: 'Too many user administration changes were attempted. Wait a moment and retry.',
  CONFLICT: 'User administration details conflict with the current account state.',
};

export type UserMutationAction = keyof typeof USER_MUTATION_FALLBACKS;

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

export function isUnsafeUserMutationMessage(message: string): boolean {
  const normalized = message.toLowerCase();
  return (
    normalized.includes('api key') ||
    normalized.includes('client_secret') ||
    normalized.includes('duplicate key') ||
    normalized.includes('violates') ||
    normalized.includes('constraint') ||
    normalized.includes('postgres') ||
    normalized.includes('supabase') ||
    normalized.includes('database') ||
    normalized.includes('sql') ||
    normalized.includes('stack') ||
    normalized.includes('token') ||
    normalized.includes('internal server error') ||
    normalized.includes('typeerror') ||
    normalized.includes('referenceerror') ||
    normalized.includes('syntaxerror') ||
    normalized.includes('not a function') ||
    /cannot (read|set) properties of (undefined|null)/.test(normalized) ||
    /\bat\s+[\w.$<>]+\s*\(/.test(message)
  );
}

export function formatUserMutationError(
  error: unknown,
  action: UserMutationAction
): string {
  const fieldMessage = extractFieldErrorMessage(error);

  if (fieldMessage && !isUnsafeUserMutationMessage(fieldMessage)) {
    return fieldMessage;
  }

  const code = extractCode(error);
  const codeMessage = code
    ? USER_MUTATION_CODE_MESSAGES[code] ?? USER_MUTATION_CODE_MESSAGES[code.toUpperCase()]
    : undefined;

  if (codeMessage) {
    return codeMessage;
  }

  const statusCode = extractStatusCode(error);
  const message = extractMessage(error);
  if (
    message &&
    !isUnsafeUserMutationMessage(message) &&
    (statusCode == null ||
      statusCode === 400 ||
      statusCode === 401 ||
      statusCode === 403 ||
      statusCode === 404 ||
      statusCode === 409)
  ) {
    return message;
  }

  return USER_MUTATION_FALLBACKS[action];
}
