import { isReadQueryError } from '@/lib/read-path-policy';

export const JOB_TEMPLATE_LIST_READ_FALLBACK_MESSAGE =
  'Job templates are temporarily unavailable. Please refresh and try again.';

export function getJobTemplateListReadErrorMessage(error: unknown): string {
  if (isReadQueryError(error) && error.message.trim().length > 0) {
    return error.message;
  }

  return JOB_TEMPLATE_LIST_READ_FALLBACK_MESSAGE;
}
