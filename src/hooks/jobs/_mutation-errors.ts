import { formatMutationError } from '@/lib/mutation-error-feedback';

const JOB_TEMPLATE_MUTATION_FALLBACKS = {
  create: 'Job template creation is temporarily unavailable. Please refresh and try again.',
  update: 'Job template update is temporarily unavailable. Please refresh and try again.',
  delete: 'Job template deletion is temporarily unavailable. Please refresh and try again.',
  duplicate:
    'Job template duplication is temporarily unavailable. Please refresh and try again.',
} as const;

const JOB_TEMPLATE_MUTATION_CODE_MESSAGES: Record<string, string> = {
  AUTH_ERROR: 'Your session has expired. Sign in again before managing job templates.',
  CONFLICT: 'Job template details conflict with the current workspace state.',
  NOT_FOUND: 'The job template could not be found. Refresh and try again.',
  PERMISSION_DENIED: 'You do not have permission to manage job templates.',
  RATE_LIMIT: 'Too many job template changes were attempted. Wait a moment and retry.',
  VALIDATION_ERROR: 'Check the job template details and try again.',
};

export type JobTemplateMutationAction = keyof typeof JOB_TEMPLATE_MUTATION_FALLBACKS;

export function formatJobTemplateMutationError(
  error: unknown,
  action: JobTemplateMutationAction
): string {
  return formatMutationError(error, JOB_TEMPLATE_MUTATION_FALLBACKS[action], {
    codeMessages: JOB_TEMPLATE_MUTATION_CODE_MESSAGES,
  });
}
