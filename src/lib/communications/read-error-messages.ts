import { isReadQueryError } from '@/lib/read-path-policy';

export const COMMUNICATION_READ_MESSAGES = {
  preferences:
    'Contact preferences are temporarily unavailable. Please refresh and try again.',
  preferenceHistory:
    'Preference history is temporarily unavailable. Please refresh and try again.',
  suppressionList:
    'Suppression list data is temporarily unavailable. Please refresh and try again.',
  inboxEmailAccounts:
    'Email accounts are temporarily unavailable. Please refresh and try again.',
  inboxEmailAccountsCached:
    'Email accounts are temporarily unavailable. Showing the most recent connections.',
  emailTemplates:
    'Email templates are temporarily unavailable. Please refresh and try again.',
  emailSignatures:
    'Email signatures are temporarily unavailable. Please refresh and try again.',
} as const;

export function formatCommunicationReadError(
  error: unknown,
  fallbackMessage: string
): string {
  if (isReadQueryError(error) && error.message.trim().length > 0) {
    return error.message;
  }

  return fallbackMessage;
}
