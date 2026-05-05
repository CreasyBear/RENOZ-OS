import { isReadQueryError } from '@/lib/read-path-policy';

export const ACTIVITY_READ_MESSAGES = {
  feed: 'Activity feed is temporarily unavailable. Please refresh and try again.',
  history: 'Activity history is temporarily unavailable. Please refresh and try again.',
  statistics: 'Activity statistics are temporarily unavailable. Please refresh and try again.',
  leaderboard: 'Activity leaderboard is temporarily unavailable. Please refresh and try again.',
} as const;

export function formatActivityReadError(error: unknown, fallbackMessage: string): string {
  if (isReadQueryError(error) && error.message.trim().length > 0) {
    return error.message;
  }

  return fallbackMessage;
}
