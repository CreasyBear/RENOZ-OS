import {
  extractAuthErrorMessage,
  isUnsafeAuthProviderMessage,
} from './auth-error-message-utils';

const SIGN_UP_FALLBACK =
  'Account creation is temporarily unavailable. Please try again.';
const ACCOUNT_EXISTS_MESSAGE =
  'This email may already have an account. Try signing in or resetting your password.';
const SIGN_UP_RATE_LIMIT_MESSAGE =
  'Too many account creation attempts. Please wait before trying again.';
const WEAK_PASSWORD_MESSAGE = 'Please choose a stronger password.';

export function isUnsafeSignUpMessage(message: string): boolean {
  return isUnsafeAuthProviderMessage(message);
}

export function formatSignUpError(error: unknown): string {
  const message = extractAuthErrorMessage(error);
  if (!message || isUnsafeSignUpMessage(message)) {
    return SIGN_UP_FALLBACK;
  }

  const normalized = message.toLowerCase();
  if (
    normalized.includes('already registered') ||
    normalized.includes('already exists') ||
    normalized.includes('user already')
  ) {
    return ACCOUNT_EXISTS_MESSAGE;
  }

  if (
    normalized.includes('rate limit') ||
    normalized.includes('too many') ||
    normalized.includes('over_email_send_rate_limit')
  ) {
    return SIGN_UP_RATE_LIMIT_MESSAGE;
  }

  if (
    normalized.startsWith('password should') ||
    normalized.startsWith('password must') ||
    normalized.startsWith('password is too weak')
  ) {
    return WEAK_PASSWORD_MESSAGE;
  }

  return SIGN_UP_FALLBACK;
}
