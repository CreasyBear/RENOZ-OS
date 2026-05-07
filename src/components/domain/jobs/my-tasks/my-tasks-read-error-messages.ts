import { isReadQueryError } from '@/lib/read-path-policy';

export const MY_TASKS_READ_FALLBACK_MESSAGE =
  'Your tasks are temporarily unavailable. Please refresh and try again.';

export function getMyTasksReadErrorMessage(error: unknown): string {
  if (isReadQueryError(error) && error.message.trim().length > 0) {
    return error.message;
  }

  return MY_TASKS_READ_FALLBACK_MESSAGE;
}
