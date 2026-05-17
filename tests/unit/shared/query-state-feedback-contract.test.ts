import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { normalizeReadQueryError } from '@/lib/read-path-policy';
import {
  QUERY_STATE_ERROR_FALLBACK,
  formatQueryStateError,
} from '@/components/shared/query-state-feedback';

function read(path: string): string {
  return readFileSync(path, 'utf8');
}

describe('shared QueryState feedback contract', () => {
  it('preserves normalized read-query messages', () => {
    const error = normalizeReadQueryError(
      { message: 'Missing customer', statusCode: 404, code: 'NOT_FOUND' },
      {
        contractType: 'detail-not-found',
        fallbackMessage: 'Customer details are temporarily unavailable. Please refresh and try again.',
        notFoundMessage: 'The requested customer could not be found.',
      }
    );

    expect(formatQueryStateError(error)).toBe('The requested customer could not be found.');
  });

  it('sanitizes raw technical read failures before shared UI rendering', () => {
    expect(formatQueryStateError(new Error('postgres duplicate key stack trace'))).toBe(
      QUERY_STATE_ERROR_FALLBACK
    );
    expect(
      formatQueryStateError({
        message: 'tenant invoices select failed with internal database constraint',
        statusCode: 503,
      })
    ).toBe(QUERY_STATE_ERROR_FALLBACK);
  });

  it('maps common raw status failures to stable operator copy', () => {
    expect(formatQueryStateError({ message: 'Forbidden', statusCode: 403 })).toBe(
      'You do not have permission to view this information.'
    );
    expect(formatQueryStateError({ message: 'Missing', statusCode: 404 })).toBe(
      'The requested item could not be found.'
    );
    expect(formatQueryStateError({ message: 'Slow down', statusCode: 429 })).toBe(
      'Too many requests. Wait a moment, then try again.'
    );
  });

  it('keeps QueryState behind formatter-owned error feedback', () => {
    const queryState = read('src/components/shared/query-state.tsx');
    const errorState = read('src/components/shared/error-state.tsx');

    expect(queryState).toContain('formatQueryStateError(error)');
    expect(queryState).not.toContain('message={error.message}');
    expect(errorState).not.toContain('message={error.message}');
  });
});
