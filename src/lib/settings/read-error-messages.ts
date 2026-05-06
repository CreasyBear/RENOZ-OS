import { isReadQueryError } from '@/lib/read-path-policy';

export const SETTINGS_READ_MESSAGES = {
  apiTokens:
    'API tokens are temporarily unavailable. Please refresh and try again.',
  apiTokensCached:
    'API tokens are temporarily unavailable. Showing the most recent tokens.',
  organizationSettings:
    'Organization settings are temporarily unavailable. Please refresh and try again.',
  scheduledReports:
    'Scheduled reports are temporarily unavailable. Please refresh and try again.',
  scheduledReportsCached:
    'Scheduled reports are temporarily unavailable. Showing the most recent report schedule.',
  winLossReasons:
    'Win/loss reasons are temporarily unavailable. Please refresh and try again.',
} as const;

export function formatSettingsReadError(error: unknown, fallbackMessage: string): string {
  if (isReadQueryError(error) && error.message.trim().length > 0) {
    return error.message;
  }

  return fallbackMessage;
}
