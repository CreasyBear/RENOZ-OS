import { formatMutationError } from '@/lib/mutation-error-feedback';

const JOB_ASSIGNMENT_SERVER_MUTATION_FALLBACKS = {
  create: 'Job creation is temporarily unavailable. Please refresh and try again.',
  update: 'Job update is temporarily unavailable. Please refresh and try again.',
  delete: 'Job cancellation is temporarily unavailable. Please refresh and try again.',
  start: 'Job start is temporarily unavailable. Please refresh and try again.',
  complete: 'Job completion is temporarily unavailable. Please refresh and try again.',
  photoCreate: 'Job photo creation is temporarily unavailable. Please refresh and try again.',
} as const;

const JOB_ASSIGNMENT_SERVER_MUTATION_CODE_MESSAGES: Record<string, string> = {
  AUTH_ERROR: 'Your session has expired. Sign in again before managing jobs.',
  CONFLICT: 'Job details conflict with the current schedule state.',
  NOT_FOUND: 'The requested job could not be found. Refresh and try again.',
  PERMISSION_DENIED: 'You do not have permission to manage jobs.',
  RATE_LIMIT: 'Too many job changes were attempted. Wait a moment and retry.',
  VALIDATION_ERROR: 'Check the job details and try again.',
};

export type JobAssignmentServerMutationAction =
  keyof typeof JOB_ASSIGNMENT_SERVER_MUTATION_FALLBACKS;

export function formatJobAssignmentServerMutationError(
  error: unknown,
  action: JobAssignmentServerMutationAction
): string {
  return formatMutationError(error, JOB_ASSIGNMENT_SERVER_MUTATION_FALLBACKS[action], {
    codeMessages: JOB_ASSIGNMENT_SERVER_MUTATION_CODE_MESSAGES,
  });
}
