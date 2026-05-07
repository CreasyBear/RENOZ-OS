import { isReadQueryError, type ReadQueryError } from '@/lib/read-path-policy';

export const NOTIFICATIONS_READ_FALLBACK_MESSAGE =
  'Notifications are temporarily unavailable. Please refresh and try again.';

export const NOTIFICATIONS_CACHED_READ_FALLBACK_MESSAGE =
  'Notifications are temporarily unavailable. Showing the most recent notifications.';

function shouldUseCachedReadMessage(error: ReadQueryError): boolean {
  return (
    error.failureKind === 'system' ||
    error.failureKind === 'unknown' ||
    error.failureKind === 'validation'
  );
}

export function getNotificationReadErrorMessage(
  error: unknown,
  options: { hasCachedNotifications?: boolean } = {}
): string {
  const hasCachedNotifications = options.hasCachedNotifications ?? false;

  if (!isReadQueryError(error)) {
    return hasCachedNotifications
      ? NOTIFICATIONS_CACHED_READ_FALLBACK_MESSAGE
      : NOTIFICATIONS_READ_FALLBACK_MESSAGE;
  }

  if (hasCachedNotifications && shouldUseCachedReadMessage(error)) {
    return NOTIFICATIONS_CACHED_READ_FALLBACK_MESSAGE;
  }

  const message = error.message.trim();
  return message || NOTIFICATIONS_READ_FALLBACK_MESSAGE;
}
