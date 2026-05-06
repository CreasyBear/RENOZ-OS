const LOGIN_FALLBACK = 'Sign in is temporarily unavailable. Please try again.';
const INVALID_CREDENTIALS_MESSAGE = 'Invalid email or password.';
const SESSION_UNAVAILABLE_MESSAGE = 'Session check failed. Please sign in again.';
const ACCOUNT_INCOMPLETE_MESSAGE =
  'Account setup is incomplete. Please contact support.';

function extractMessage(error: unknown): string | null {
  if (typeof error === 'string' && error.trim().length > 0) {
    return error.trim();
  }

  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message.trim();
  }

  return null;
}

export function isUnsafeLoginMessage(message: string): boolean {
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

export function formatLoginError(error: unknown): string {
  const message = extractMessage(error);
  if (!message || isUnsafeLoginMessage(message)) {
    return LOGIN_FALLBACK;
  }

  const normalized = message.toLowerCase();
  if (
    normalized.includes('invalid login credentials') ||
    normalized.includes('invalid email or password')
  ) {
    return INVALID_CREDENTIALS_MESSAGE;
  }

  if (normalized.includes('email not confirmed')) {
    return 'Please confirm your email before signing in.';
  }

  if (normalized.startsWith('too many login attempts.')) {
    return message;
  }

  if (
    normalized.includes('session was found') ||
    normalized.includes('session check failed') ||
    normalized.includes('auth session missing')
  ) {
    return SESSION_UNAVAILABLE_MESSAGE;
  }

  if (
    normalized.includes('account setup is incomplete') ||
    normalized.includes('account is not fully set up')
  ) {
    return ACCOUNT_INCOMPLETE_MESSAGE;
  }

  return LOGIN_FALLBACK;
}
