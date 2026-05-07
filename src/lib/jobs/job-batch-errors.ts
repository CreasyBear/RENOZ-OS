import { formatMutationError } from '@/lib/mutation-error-feedback';

const JOB_BATCH_IMPORT_ROW_FALLBACK =
  'Job import failed for this row. Please check the row data and try again.';

const JOB_BATCH_IMPORT_CODE_MESSAGES: Record<string, string> = {
  AUTH_ERROR: 'Your session has expired. Sign in again before importing jobs.',
  CONFLICT: 'Job already exists. Enable duplicate skipping or update existing jobs.',
  NOT_FOUND: 'The requested job import relation could not be found. Refresh and try again.',
  PERMISSION_DENIED: 'You do not have permission to import jobs.',
  RATE_LIMIT: 'Too many jobs were imported at once. Wait a moment and retry.',
  VALIDATION_ERROR: 'Check the job import row and try again.',
};

export function formatBulkJobImportRowError(error: unknown): string {
  return formatMutationError(error, JOB_BATCH_IMPORT_ROW_FALLBACK, {
    codeMessages: JOB_BATCH_IMPORT_CODE_MESSAGES,
  });
}
