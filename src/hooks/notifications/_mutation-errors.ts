import { formatMutationError } from '@/lib/mutation-error-feedback';

const NOTIFICATION_MUTATION_FALLBACKS = {
  markRead:
    'Marking notification as read is temporarily unavailable. Please refresh and try again.',
} as const;

const NOTIFICATION_MUTATION_CODE_MESSAGES: Record<string, string> = {
  AUTH_ERROR: 'Your session has expired. Sign in again before managing notifications.',
  CONFLICT: 'Notification state changed. Refresh and try again.',
  NOT_FOUND: 'The notification could not be found. Refresh and try again.',
  PERMISSION_DENIED: 'You do not have permission to manage notifications.',
  RATE_LIMIT: 'Too many notification updates were attempted. Wait a moment and retry.',
  RATE_LIMITED: 'Too many notification updates were attempted. Wait a moment and retry.',
  UNAUTHORIZED: 'Your session has expired. Sign in again before managing notifications.',
  VALIDATION_ERROR: 'Check the notification and try again.',
};

export type NotificationMutationAction = keyof typeof NOTIFICATION_MUTATION_FALLBACKS;

export function formatNotificationMutationError(
  error: unknown,
  action: NotificationMutationAction
): string {
  return formatMutationError(error, NOTIFICATION_MUTATION_FALLBACKS[action], {
    codeMessages: NOTIFICATION_MUTATION_CODE_MESSAGES,
    safeStatusCodes: [],
  });
}
