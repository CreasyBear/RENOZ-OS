const PASSWORD_CHANGE_FALLBACK =
  'Password change is temporarily unavailable. Please refresh and try again.';

function extractMessage(error: unknown): string | null {
  if (typeof error === 'string' && error.trim().length > 0) {
    return error.trim();
  }

  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message.trim();
  }

  return null;
}

export function isUnsafePasswordChangeMessage(message: string): boolean {
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

function isSafePasswordChangeGuidance(message: string): boolean {
  const normalized = message.toLowerCase();
  return (
    normalized === 'current password is incorrect' ||
    normalized === 'not authenticated' ||
    normalized.startsWith('too many login attempts.') ||
    normalized.startsWith('password must be at least') ||
    normalized.startsWith('password should be at least') ||
    normalized.startsWith('password is too weak') ||
    normalized.startsWith('password should contain') ||
    normalized.startsWith('new password must') ||
    normalized.startsWith('new password should')
  );
}

export function formatPasswordChangeError(error: unknown): string {
  const message = extractMessage(error);
  if (!message || isUnsafePasswordChangeMessage(message)) {
    return PASSWORD_CHANGE_FALLBACK;
  }

  if (message.toLowerCase() === 'not authenticated') {
    return 'Your session has expired. Sign in again before changing your password.';
  }

  if (isSafePasswordChangeGuidance(message)) {
    return message;
  }

  return PASSWORD_CHANGE_FALLBACK;
}
