import { isUnsafeMutationErrorMessage } from '@/lib/mutation-error-feedback';

export const SERIAL_BATCH_PARSE_FALLBACK_MESSAGE =
  'Serial number CSV could not be parsed. Check the file format and try again.';

const SAFE_SERIAL_BATCH_PARSE_MESSAGES = new Set([
  'File is empty',
  'CSV file is empty',
  'No serial numbers found in CSV file',
  'Failed to read file',
  'Failed to parse CSV file',
]);

function extractErrorMessage(error: unknown): string | null {
  if (error instanceof Error) {
    const message = error.message.trim();
    return message.length > 0 ? message : null;
  }

  if (typeof error === 'string') {
    const message = error.trim();
    return message.length > 0 ? message : null;
  }

  return null;
}

export function formatSerialBatchParseError(error: unknown): string {
  const message = extractErrorMessage(error);
  if (!message) return SERIAL_BATCH_PARSE_FALLBACK_MESSAGE;

  if (
    SAFE_SERIAL_BATCH_PARSE_MESSAGES.has(message) &&
    !isUnsafeMutationErrorMessage(message)
  ) {
    return message;
  }

  return SERIAL_BATCH_PARSE_FALLBACK_MESSAGE;
}
