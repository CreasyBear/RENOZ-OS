import { isReadQueryError } from '@/lib/read-path-policy';

export const ONBOARDING_PROGRESS_READ_FALLBACK_MESSAGE =
  'Onboarding progress is temporarily unavailable. Please refresh and try again.';

export const ONBOARDING_PROGRESS_CACHED_READ_FALLBACK_MESSAGE =
  'Onboarding progress is temporarily unavailable. Showing the most recent checklist.';

export function getOnboardingProgressReadErrorMessage(
  error: unknown,
  fallbackMessage = ONBOARDING_PROGRESS_READ_FALLBACK_MESSAGE
): string {
  if (isReadQueryError(error) && error.message.trim().length > 0) {
    return error.message;
  }

  return fallbackMessage;
}
