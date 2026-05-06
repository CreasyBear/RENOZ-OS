import {
  extractAuthErrorMessage,
  isUnsafeAuthProviderMessage,
} from './auth-error-message-utils';

const PASSWORD_CHANGE_FALLBACK =
  'Password change is temporarily unavailable. Please refresh and try again.';

export function isUnsafePasswordChangeMessage(message: string): boolean {
  return isUnsafeAuthProviderMessage(message);
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
  const message = extractAuthErrorMessage(error);
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
