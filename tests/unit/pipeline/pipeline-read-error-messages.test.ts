import { describe, expect, it } from 'vitest';
import { normalizeReadQueryError } from '@/lib/read-path-policy';
import {
  PIPELINE_READ_MESSAGES,
  formatPipelineReadError,
} from '@/lib/pipeline/read-error-messages';

describe('pipeline read error messages', () => {
  it('uses normalized read-query copy and rejects raw pipeline read errors', () => {
    const normalized = normalizeReadQueryError(
      { statusCode: 503, code: 'INTERNAL_ERROR', message: 'quote version SQL timeout' },
      {
        contractType: 'always-shaped',
        fallbackMessage: PIPELINE_READ_MESSAGES.quoteVersionHistory,
      }
    );

    expect(formatPipelineReadError(normalized, 'Fallback copy')).toBe(
      PIPELINE_READ_MESSAGES.quoteVersionHistory
    );
    expect(formatPipelineReadError(new Error('quote version SQL timeout'), 'Fallback copy')).toBe(
      'Fallback copy'
    );
  });
});
