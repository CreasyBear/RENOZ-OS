import { describe, expect, it } from 'vitest';
import { normalizeReadQueryError } from '@/lib/read-path-policy';
import {
  formatSupportReadError,
  isSupportReadNotFound,
} from '@/lib/support/read-error-messages';

describe('support read error messages', () => {
  it('uses normalized read-query copy and rejects raw error messages', () => {
    const normalized = normalizeReadQueryError(
      { statusCode: 503, code: 'INTERNAL_ERROR', message: 'database timeout' },
      {
        contractType: 'always-shaped',
        fallbackMessage:
          'Issue queue metrics are temporarily unavailable. Please refresh and try again.',
      }
    );

    expect(formatSupportReadError(normalized, 'Fallback copy')).toBe(
      'Issue queue metrics are temporarily unavailable. Please refresh and try again.'
    );
    expect(formatSupportReadError(new Error('database timeout'), 'Fallback copy')).toBe(
      'Fallback copy'
    );
  });

  it('keeps not-found classification available for detail views', () => {
    const notFound = normalizeReadQueryError(
      { statusCode: 404, code: 'NOT_FOUND', message: 'missing issue row' },
      {
        contractType: 'detail-not-found',
        fallbackMessage:
          'Issue details are temporarily unavailable. Please refresh and try again.',
        notFoundMessage: 'The requested issue could not be found.',
      }
    );

    expect(isSupportReadNotFound(notFound)).toBe(true);
    expect(formatSupportReadError(notFound, 'Fallback copy')).toBe(
      'The requested issue could not be found.'
    );
    expect(isSupportReadNotFound(new Error('missing issue row'))).toBe(false);
  });
});
