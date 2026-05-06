import { LOGO_ERROR_MESSAGES } from '@/lib/organization-logo';
import { formatMutationError } from '@/lib/mutation-error-feedback';

const ORGANIZATION_MUTATION_FALLBACKS = {
  updateOrganization:
    'Organization update is temporarily unavailable. Please refresh and try again.',
  updateSettings:
    'Organization settings update is temporarily unavailable. Please refresh and try again.',
  updateBranding:
    'Organization branding update is temporarily unavailable. Please refresh and try again.',
  uploadLogo: 'Logo upload is temporarily unavailable. Please refresh and try again.',
  removeLogo: 'Logo removal is temporarily unavailable. Please refresh and try again.',
} as const;

const ORGANIZATION_MUTATION_CODE_MESSAGES: Record<string, string> = {
  AUTH_ERROR:
    'Your session has expired. Sign in again before managing organization settings.',
  CONFLICT: 'Organization settings conflict with the current account state.',
  FILE_TOO_LARGE: LOGO_ERROR_MESSAGES.fileTooLarge,
  INVALID_FILE_TYPE: LOGO_ERROR_MESSAGES.invalidType,
  NOT_FOUND: 'The organization record could not be found. Refresh and try again.',
  PERMISSION_DENIED: 'You do not have permission to manage organization settings.',
  RATE_LIMIT: 'Too many organization changes were attempted. Wait a moment and retry.',
  VALIDATION_ERROR: 'Check the organization settings and try again.',
};

export type OrganizationMutationAction = keyof typeof ORGANIZATION_MUTATION_FALLBACKS;

export function formatOrganizationMutationError(
  error: unknown,
  action: OrganizationMutationAction
): string {
  return formatMutationError(error, ORGANIZATION_MUTATION_FALLBACKS[action], {
    codeMessages: ORGANIZATION_MUTATION_CODE_MESSAGES,
  });
}

export function formatOrganizationLogoMutationError(
  error: unknown,
  action: 'upload' | 'remove'
): string {
  return formatOrganizationMutationError(
    error,
    action === 'upload' ? 'uploadLogo' : 'removeLogo'
  );
}
