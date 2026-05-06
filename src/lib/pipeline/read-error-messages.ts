import { isReadQueryError } from '@/lib/read-path-policy';

export const PIPELINE_READ_MESSAGES = {
  quoteVersionHistory: 'Quote version history is temporarily unavailable. Please refresh and try again.',
} as const;

export function formatPipelineReadError(error: unknown, fallbackMessage: string): string {
  if (isReadQueryError(error) && error.message.trim().length > 0) {
    return error.message;
  }

  return fallbackMessage;
}
