import { formatMutationError } from '@/lib/mutation-error-feedback';
import { isReadQueryError, type ReadQueryError } from '@/lib/read-path-policy';

export const DOCUMENT_HISTORY_READ_FALLBACK_MESSAGE =
  'Document history is temporarily unavailable. Please refresh and try again.';

export const DOCUMENT_HISTORY_CACHED_READ_FALLBACK_MESSAGE =
  'Document history is temporarily unavailable. Showing the most recent documents.';

const DOCUMENT_GENERATION_CODE_MESSAGES: Record<string, string> = {
  AUTH_ERROR: 'Your session has expired. Sign in again before generating documents.',
  CONFLICT: 'Document state changed. Refresh and try again.',
  NOT_FOUND: 'The source record for this document could not be found. Refresh and try again.',
  PERMISSION_DENIED: 'You do not have permission to generate this document.',
  RATE_LIMIT: 'Too many document generation requests were attempted. Wait a moment and retry.',
  RATE_LIMITED: 'Too many document generation requests were attempted. Wait a moment and retry.',
  UNAUTHORIZED: 'Your session has expired. Sign in again before generating documents.',
  VALIDATION_ERROR: 'Check the document details and try again.',
};

function shouldUseCachedHistoryMessage(error: ReadQueryError): boolean {
  return (
    error.failureKind === 'system' ||
    error.failureKind === 'unknown' ||
    error.failureKind === 'validation'
  );
}

export function getDocumentHistoryReadErrorMessage(
  error: unknown,
  options: { hasCachedDocuments?: boolean } = {}
): string {
  const hasCachedDocuments = options.hasCachedDocuments ?? false;

  if (!isReadQueryError(error)) {
    return hasCachedDocuments
      ? DOCUMENT_HISTORY_CACHED_READ_FALLBACK_MESSAGE
      : DOCUMENT_HISTORY_READ_FALLBACK_MESSAGE;
  }

  if (hasCachedDocuments && shouldUseCachedHistoryMessage(error)) {
    return DOCUMENT_HISTORY_CACHED_READ_FALLBACK_MESSAGE;
  }

  const message = error.message.trim();
  return message || DOCUMENT_HISTORY_READ_FALLBACK_MESSAGE;
}

export function formatDocumentGenerationError(
  error: unknown,
  documentLabel: string
): string {
  return formatMutationError(
    error,
    `${documentLabel} generation is temporarily unavailable. Please refresh and try again.`,
    {
      codeMessages: DOCUMENT_GENERATION_CODE_MESSAGES,
      safeStatusCodes: [],
    }
  );
}
