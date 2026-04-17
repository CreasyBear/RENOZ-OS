import { describe, expect, it } from 'vitest';
import {
  classifyReadFailureKind,
  normalizeReadQueryError,
} from '@/lib/read-path-policy';

describe('read-path-policy', () => {
  it('classifies auth, not-found, validation, and system failures semantically', () => {
    expect(classifyReadFailureKind({ message: 'Auth', statusCode: 401, code: 'AUTH_ERROR' })).toBe(
      'unauthorized'
    );
    expect(classifyReadFailureKind({ message: 'Missing', statusCode: 404, code: 'NOT_FOUND' })).toBe(
      'not-found'
    );
    expect(
      classifyReadFailureKind({ message: 'Bad input', statusCode: 400, code: 'VALIDATION_ERROR' })
    ).toBe('validation');
    expect(
      classifyReadFailureKind({ message: 'Boom', statusCode: 503, code: 'INTERNAL_ERROR' })
    ).toBe('system');
  });

  it('annotates normalized query errors with failure kind and contract type', () => {
    const error = normalizeReadQueryError(
      { message: 'Missing', statusCode: 404, code: 'NOT_FOUND' },
      {
        contractType: 'detail-not-found',
        fallbackMessage: 'Issue details are temporarily unavailable. Please refresh and try again.',
        notFoundMessage: 'The requested issue could not be found.',
      }
    );

    expect(error.failureKind).toBe('not-found');
    expect(error.contractType).toBe('detail-not-found');
    expect(error.message).toBe('The requested issue could not be found.');
  });

  it('preserves semantic failure kinds for serialized code-only errors', () => {
    const error = normalizeReadQueryError(
      { message: 'Slow down', code: 'RATE_LIMIT' },
      {
        contractType: 'always-shaped',
        fallbackMessage: 'Issue list is temporarily unavailable. Please refresh and try again.',
      }
    );

    expect(error.failureKind).toBe('rate-limited');
    expect(error.code).toBe('RATE_LIMIT');
  });
});
