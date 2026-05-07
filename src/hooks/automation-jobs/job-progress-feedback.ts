import { isUnsafeMutationErrorMessage } from '@/lib/mutation-error-feedback';

export const AUTOMATION_JOB_FAILURE_FALLBACK_MESSAGE =
  'Review the job details and try again.';

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null;
}

function extractFailureMessage(metadata: unknown): string | null {
  if (!isRecord(metadata)) return null;

  const metadataError = metadata.error;
  if (isRecord(metadataError) && typeof metadataError.message === 'string') {
    const message = metadataError.message.trim();
    if (message.length > 0) return message;
  }

  if (typeof metadataError === 'string') {
    const message = metadataError.trim();
    if (message.length > 0) return message;
  }

  if (typeof metadata.errorMessage === 'string') {
    const message = metadata.errorMessage.trim();
    if (message.length > 0) return message;
  }

  return null;
}

export function formatAutomationJobFailureMessage(metadata: unknown): string {
  const message = extractFailureMessage(metadata);
  if (!message || isUnsafeMutationErrorMessage(message)) {
    return AUTOMATION_JOB_FAILURE_FALLBACK_MESSAGE;
  }

  return message;
}
