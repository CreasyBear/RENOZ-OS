const PASSWORD_RESET_FALLBACK =
  'Password reset is temporarily unavailable. Please try again.';
const PASSWORD_RESET_COMPLETION_FALLBACK =
  'Password update is temporarily unavailable. Please refresh and try again.';
const PASSWORD_RESET_SESSION_EXPIRED =
  'This reset session has expired. Request a new password reset link and try again.';

function extractMessage(error: unknown): string | null {
  if (typeof error === 'string' && error.trim().length > 0) {
    return error.trim();
  }

  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message.trim();
  }

  return null;
}

export function isUnsafePasswordResetMessage(message: string): boolean {
  const normalized = message.toLowerCase();
  return (
    normalized.includes('api key') ||
    normalized.includes('client_secret') ||
    normalized.includes('service_role') ||
    normalized.includes('access token') ||
    normalized.includes('refresh token') ||
    normalized.includes('jwt') ||
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
    normalized.includes('syntaxerror') ||
    normalized.includes('not a function') ||
    /cannot (read|set) properties of (undefined|null)/.test(normalized) ||
    /\bat\s+[\w.$<>]+\s*\(/.test(message)
  );
}

function formatRetryAfter(retryAfter?: number): string | null {
  if (typeof retryAfter !== 'number' || !Number.isFinite(retryAfter) || retryAfter <= 0) {
    return null;
  }

  const hours = Math.max(1, Math.ceil(retryAfter / 3600));
  return `Too many password reset requests. Please try again in ${hours} ${hours === 1 ? 'hour' : 'hours'}.`;
}

export function formatPasswordResetRequestError(
  error: unknown,
  retryAfter?: number
): string {
  const retryMessage = formatRetryAfter(retryAfter);
  const message = extractMessage(error);

  if (retryMessage && (!message || isUnsafePasswordResetMessage(message))) {
    return retryMessage;
  }

  if (!message || isUnsafePasswordResetMessage(message)) {
    return PASSWORD_RESET_FALLBACK;
  }

  const normalized = message.toLowerCase();
  if (
    normalized.startsWith('too many password reset requests.') ||
    normalized === 'an unexpected error occurred. please try again.' ||
    normalized === PASSWORD_RESET_FALLBACK.toLowerCase()
  ) {
    return message;
  }

  return retryMessage ?? PASSWORD_RESET_FALLBACK;
}

export function formatPasswordResetCompletionError(error: unknown): string {
  const message = extractMessage(error);

  if (!message || isUnsafePasswordResetMessage(message)) {
    return PASSWORD_RESET_COMPLETION_FALLBACK;
  }

  const normalized = message.toLowerCase();
  if (
    normalized.includes('auth session missing') ||
    normalized.includes('session not found') ||
    normalized.includes('session expired') ||
    normalized.includes('invalid session')
  ) {
    return PASSWORD_RESET_SESSION_EXPIRED;
  }

  if (
    normalized.startsWith('password should') ||
    normalized.startsWith('password must') ||
    normalized.startsWith('password is too weak') ||
    normalized.startsWith('new password should') ||
    normalized.startsWith('new password must')
  ) {
    return message;
  }

  return PASSWORD_RESET_COMPLETION_FALLBACK;
}
