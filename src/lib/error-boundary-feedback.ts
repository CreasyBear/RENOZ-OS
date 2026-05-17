import { formatMutationError } from '@/lib/mutation-error-feedback';

const ERROR_BOUNDARY_CODE_MESSAGES = {
  RATE_LIMIT: 'This view is temporarily rate limited. Wait a moment and try again.',
  UNAUTHORIZED: 'Your session has expired. Please sign in again.',
  FORBIDDEN: "You don't have permission to view this screen.",
  NOT_FOUND: 'This screen could not find the required data. Refresh and try again.',
  CONFLICT: 'This screen could not load because the data changed. Refresh and try again.',
} as const;

export function formatErrorBoundaryFeedback(error: unknown, fallback: string): string {
  return formatMutationError(error, fallback, {
    defaultCodeMessages: ERROR_BOUNDARY_CODE_MESSAGES,
  });
}
