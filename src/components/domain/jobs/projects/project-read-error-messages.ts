import { isReadQueryError } from '@/lib/read-path-policy';

export const PROJECT_LIST_READ_FALLBACK_MESSAGE =
  'Projects are temporarily unavailable. Please refresh and try again.';

export function getProjectListReadErrorMessage(error: unknown): string {
  if (isReadQueryError(error) && error.message.trim().length > 0) {
    return error.message;
  }

  return PROJECT_LIST_READ_FALLBACK_MESSAGE;
}
