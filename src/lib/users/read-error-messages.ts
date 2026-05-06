import { isReadQueryError } from '@/lib/read-path-policy';

export const USER_READ_MESSAGES = {
  preferences:
    'Preferences are temporarily unavailable. Please refresh and try again.',
  preferencesCached:
    'Preferences are temporarily unavailable. Showing the most recent preferences.',
} as const;

export function formatUserReadError(error: unknown, fallbackMessage: string): string {
  if (isReadQueryError(error) && error.message.trim().length > 0) {
    return error.message;
  }

  return fallbackMessage;
}
