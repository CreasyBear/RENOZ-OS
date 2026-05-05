import { describe, expect, it } from 'vitest';
import { normalizeReadQueryError } from '@/lib/read-path-policy';
import {
  formatServiceReadError,
  SERVICE_READ_MESSAGES,
} from '@/lib/service/read-error-messages';

describe('service read error messages', () => {
  it('uses normalized read-query copy and rejects raw system messages', () => {
    const normalized = normalizeReadQueryError(
      { statusCode: 503, code: 'INTERNAL_ERROR', message: 'database timeout' },
      {
        contractType: 'always-shaped',
        fallbackMessage: SERVICE_READ_MESSAGES.systemsList,
      }
    );

    expect(formatServiceReadError(normalized, 'Fallback copy')).toBe(
      SERVICE_READ_MESSAGES.systemsList
    );
    expect(formatServiceReadError(new Error('database timeout'), 'Fallback copy')).toBe(
      'Fallback copy'
    );
  });

  it('keeps not-found copy from normalized detail reads', () => {
    const notFound = normalizeReadQueryError(
      { statusCode: 404, code: 'NOT_FOUND', message: 'missing service system row' },
      {
        contractType: 'detail-not-found',
        fallbackMessage: SERVICE_READ_MESSAGES.systemDetail,
        notFoundMessage: SERVICE_READ_MESSAGES.systemNotFound,
      }
    );

    expect(formatServiceReadError(notFound, 'Fallback copy')).toBe(
      SERVICE_READ_MESSAGES.systemNotFound
    );
    expect(formatServiceReadError(new Error('missing service system row'), 'Fallback copy')).toBe(
      'Fallback copy'
    );
  });
});
