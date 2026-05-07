import {
  extractAuthErrorMessage,
  isUnsafeAuthProviderMessage,
} from '@/lib/auth/auth-error-message-utils';

export const MFA_STATUS_FALLBACK_MESSAGE =
  'Two-factor authentication status is temporarily unavailable. Please refresh and try again.';

const MFA_SESSION_EXPIRED_MESSAGE =
  'Your session has expired. Sign in again before managing two-factor authentication.';

const MFA_RATE_LIMIT_MESSAGE =
  'Too many two-factor authentication requests were attempted. Wait a moment and try again.';

export function formatMfaStatusError(error: unknown): string {
  const message = extractAuthErrorMessage(error);
  if (!message || isUnsafeAuthProviderMessage(message)) {
    return MFA_STATUS_FALLBACK_MESSAGE;
  }

  const normalized = message.toLowerCase();
  if (
    normalized.includes('auth session missing') ||
    normalized.includes('session expired') ||
    normalized.includes('invalid session')
  ) {
    return MFA_SESSION_EXPIRED_MESSAGE;
  }

  if (
    normalized.includes('rate limit') ||
    normalized.includes('too many') ||
    normalized.includes('429')
  ) {
    return MFA_RATE_LIMIT_MESSAGE;
  }

  return MFA_STATUS_FALLBACK_MESSAGE;
}
