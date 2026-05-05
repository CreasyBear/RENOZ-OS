import { isReadQueryError } from '@/lib/read-path-policy';

export const SERVICE_READ_MESSAGES = {
  systemsList: 'Service systems are temporarily unavailable. Please refresh and try again.',
  systemDetail: 'Service system details are temporarily unavailable. Please refresh and try again.',
  systemNotFound: 'The requested service system could not be found.',
  linkageReviewsList:
    'Service linkage reviews are temporarily unavailable. Please refresh and try again.',
  linkageReviewDetail:
    'Service linkage review details are temporarily unavailable. Please refresh and try again.',
  linkageReviewNotFound: 'The requested service linkage review could not be found.',
  activityHistory:
    'Service system history is temporarily unavailable. Please refresh and try again.',
} as const;

export function formatServiceReadError(error: unknown, fallbackMessage: string): string {
  if (isReadQueryError(error) && error.message.trim().length > 0) {
    return error.message;
  }

  return fallbackMessage;
}
