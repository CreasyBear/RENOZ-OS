import { formatSupportMutationError } from './_mutation-errors';

const RMA_MUTATION_CODE_MESSAGES: Record<string, string> = {
  transition_blocked:
    'This RMA cannot move to that status. Refresh and review the current RMA state.',
  NOT_FOUND: 'The RMA could not be found. Refresh and try again.',
  PERMISSION_DENIED: 'You do not have permission to update this RMA.',
  AUTH_ERROR: 'Your session has expired. Sign in again before updating this RMA.',
  RATE_LIMIT: 'Too many RMA updates were attempted. Wait a moment and retry.',
};

export function formatRmaMutationError(error: unknown, fallback: string): string {
  return formatSupportMutationError(error, fallback, {
    codeMessages: RMA_MUTATION_CODE_MESSAGES,
  });
}

export function formatRmaExecutionBlockedFeedback(
  blockedReason: string | null | undefined
): string {
  return formatRmaMutationError(
    {
      statusCode: 400,
      errors: {
        executionBlockedReason: [blockedReason ?? 'RMA execution is blocked'],
      },
    },
    'RMA execution is blocked'
  );
}
