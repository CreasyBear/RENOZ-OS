import { formatMutationError } from '@/lib/mutation-error-feedback';

export const SETTINGS_MUTATION_MESSAGES = {
  apiTokenCreate:
    'API token creation is temporarily unavailable. Please refresh and try again.',
  apiTokenRevoke:
    'API token revocation is temporarily unavailable. Please refresh and try again.',
} as const;

const SETTINGS_MUTATION_CODE_MESSAGES: Record<string, string> = {
  AUTH_ERROR: 'Your session has expired. Sign in again before managing API tokens.',
  CONFLICT: 'API token details conflict with the current account state.',
  NOT_FOUND: 'The API token could not be found. Refresh and try again.',
  PERMISSION_DENIED: 'You do not have permission to manage API tokens.',
  RATE_LIMIT: 'Too many API token changes were attempted. Wait a moment and retry.',
  VALIDATION_ERROR: 'Check the API token details and try again.',
};

export function formatSettingsMutationError(error: unknown, fallback: string): string {
  return formatMutationError(error, fallback, {
    codeMessages: SETTINGS_MUTATION_CODE_MESSAGES,
  });
}

export function formatApiTokenMutationError(
  error: unknown,
  action: 'create' | 'revoke'
): string {
  const fallback =
    action === 'create'
      ? SETTINGS_MUTATION_MESSAGES.apiTokenCreate
      : SETTINGS_MUTATION_MESSAGES.apiTokenRevoke;

  return formatSettingsMutationError(error, fallback);
}
