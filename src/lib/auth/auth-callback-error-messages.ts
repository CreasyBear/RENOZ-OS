import { authErrorMessage, toAuthErrorCode } from './error-codes';
import {
  extractAuthErrorMessage,
  isUnsafeAuthProviderMessage,
} from './auth-error-message-utils';

const RESET_LINK_MESSAGE =
  'This reset link is invalid or expired. Please request a new one from the forgot password page.';
const EXPIRED_LINK_MESSAGE =
  'This authentication link has expired. Please request a new link and try again.';
const INVALID_LINK_MESSAGE =
  'This authentication link is invalid or no longer available.';
const ACCESS_DENIED_MESSAGE =
  'Authentication was cancelled or denied. Please try again.';
const TOKEN_EXCHANGE_MESSAGE =
  'We could not finish verifying your session. Please try again.';

export function isUnsafeAuthCallbackMessage(message: string): boolean {
  const normalized = message.toLowerCase();
  return (
    isUnsafeAuthProviderMessage(message) ||
    normalized.includes('code verifier') ||
    normalized.includes('token_hash') ||
    normalized.includes('provider_token') ||
    normalized.includes('bearer ') ||
    normalized.includes('setsession') ||
    normalized.includes('pkce') ||
    normalized.includes('auth session') ||
    normalized.includes('session token')
  );
}

export function formatAuthCallbackError(error: unknown, errorDescription?: unknown): string {
  const code = toAuthErrorCode(error);
  const description = extractAuthErrorMessage(errorDescription);

  if (code === 'token_exchange_failed' && (!description || isUnsafeAuthCallbackMessage(description))) {
    return TOKEN_EXCHANGE_MESSAGE;
  }

  if (!description || isUnsafeAuthCallbackMessage(description)) {
    return authErrorMessage(code);
  }

  const normalized = description.toLowerCase();
  if (
    normalized.includes('reset') &&
    (normalized.includes('invalid') || normalized.includes('expired'))
  ) {
    return RESET_LINK_MESSAGE;
  }

  if (normalized.includes('expired')) {
    return EXPIRED_LINK_MESSAGE;
  }

  if (normalized.includes('invalid')) {
    return INVALID_LINK_MESSAGE;
  }

  if (normalized.includes('denied') || normalized.includes('cancel')) {
    return ACCESS_DENIED_MESSAGE;
  }

  if (normalized.includes('rate') && normalized.includes('limit')) {
    return authErrorMessage('rate_limited');
  }

  if (code === 'token_exchange_failed') {
    return TOKEN_EXCHANGE_MESSAGE;
  }

  return authErrorMessage(code);
}
