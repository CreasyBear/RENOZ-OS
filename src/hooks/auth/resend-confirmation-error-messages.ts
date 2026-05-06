const RESEND_CONFIRMATION_FALLBACK =
  'Confirmation email is temporarily unavailable. Please try again.';

function extractMessage(error: unknown): string | null {
  if (typeof error === 'string' && error.trim().length > 0) {
    return error.trim();
  }

  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message.trim();
  }

  return null;
}

export function isUnsafeResendConfirmationMessage(message: string): boolean {
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

  const minutes = Math.max(1, Math.ceil(retryAfter / 60));
  return `Too many resend requests. Please try again in ${minutes} ${minutes === 1 ? 'minute' : 'minutes'}.`;
}

export function formatResendConfirmationError(
  error: unknown,
  retryAfter?: number
): string {
  const retryMessage = formatRetryAfter(retryAfter);
  const message = extractMessage(error);

  if (retryMessage && (!message || isUnsafeResendConfirmationMessage(message))) {
    return retryMessage;
  }

  if (!message || isUnsafeResendConfirmationMessage(message)) {
    return RESEND_CONFIRMATION_FALLBACK;
  }

  const normalized = message.toLowerCase();
  if (
    normalized.startsWith('too many resend requests.') ||
    normalized.startsWith('confirmation email') ||
    normalized === 'an unexpected error occurred. please try again.'
  ) {
    return message;
  }

  return retryMessage ?? RESEND_CONFIRMATION_FALLBACK;
}
