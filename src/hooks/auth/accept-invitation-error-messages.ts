import {
  extractAuthErrorMessage,
  isUnsafeAuthProviderMessage,
} from '@/lib/auth/auth-error-message-utils';

const ACCEPT_INVITATION_FALLBACK =
  'Invitation acceptance is temporarily unavailable. Please try again.';
const INVITATION_UNAVAILABLE_MESSAGE =
  'This invitation link is invalid or no longer available.';
const INVITATION_DETAILS_UNAVAILABLE_MESSAGE =
  'Invitation details are temporarily unavailable. Please refresh and try again.';
const INVITATION_EXPIRED_MESSAGE =
  'This invitation has expired. Ask an administrator for a new invitation.';
const INVITATION_STATE_MESSAGE =
  'This invitation cannot be accepted in its current state. Ask an administrator for a new invitation.';
const INVITATION_RATE_LIMIT_MESSAGE =
  'Too many invitation attempts. Please wait before trying again.';
const WEAK_PASSWORD_MESSAGE = 'Please choose a stronger password.';

export function isUnsafeAcceptInvitationMessage(message: string): boolean {
  const normalized = message.toLowerCase();
  return (
    isUnsafeAuthProviderMessage(message) ||
    normalized.includes('invitation token') ||
    normalized.includes('token_hash') ||
    normalized.includes('setsession') ||
    normalized.includes('auth user') ||
    normalized.includes('rollback')
  );
}

export function formatAcceptInvitationError(error: unknown): string {
  const message = extractAuthErrorMessage(error);
  if (!message || isUnsafeAcceptInvitationMessage(message)) {
    return ACCEPT_INVITATION_FALLBACK;
  }

  const normalized = message.toLowerCase();
  if (normalized.includes('invitation details are temporarily unavailable')) {
    return INVITATION_DETAILS_UNAVAILABLE_MESSAGE;
  }

  if (
    normalized.includes('invalid invitation') ||
    normalized.includes('invalid or expired invitation') ||
    normalized.includes('invitation link is invalid') ||
    normalized.includes('could not be found')
  ) {
    return INVITATION_UNAVAILABLE_MESSAGE;
  }

  if (normalized.includes('invitation has expired')) {
    return INVITATION_EXPIRED_MESSAGE;
  }

  if (
    normalized.includes('already been accepted') ||
    normalized.includes('invitation is accepted') ||
    normalized.includes('invitation is cancelled') ||
    normalized.includes('invitation is expired') ||
    normalized.includes('user is active') ||
    normalized.includes('user is suspended') ||
    normalized.includes('user is deactivated')
  ) {
    return INVITATION_STATE_MESSAGE;
  }

  if (normalized.includes('rate limit') || normalized.includes('too many')) {
    return INVITATION_RATE_LIMIT_MESSAGE;
  }

  if (
    normalized.startsWith('password should') ||
    normalized.startsWith('password must') ||
    normalized.startsWith('password is too weak')
  ) {
    return WEAK_PASSWORD_MESSAGE;
  }

  return ACCEPT_INVITATION_FALLBACK;
}
