import {
  extractAuthErrorMessage,
  isUnsafeAuthProviderMessage,
} from '@/lib/auth/auth-error-message-utils';

const RESEND_CONFIRMATION_FALLBACK =
  'Confirmation email is temporarily unavailable. Please try again.';

export function isUnsafeResendConfirmationMessage(message: string): boolean {
  return isUnsafeAuthProviderMessage(message);
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
  const message = extractAuthErrorMessage(error);

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
