import { isReadQueryError } from '@/lib/read-path-policy';

export const SCHEDULE_DATA_READ_FALLBACK_MESSAGE =
  'Schedule data is temporarily unavailable. Please refresh and try again.';

export function getScheduleDataReadErrorMessage(error: unknown): string {
  if (isReadQueryError(error) && error.message.trim().length > 0) {
    return error.message;
  }

  return SCHEDULE_DATA_READ_FALLBACK_MESSAGE;
}
