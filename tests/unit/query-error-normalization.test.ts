import { describe, expect, it } from 'vitest';
import { normalizeQueryError } from '@/lib/error-handling';

describe('normalizeQueryError', () => {
  it('sanitizes raw validation issue arrays', () => {
    const rawIssues = [
      {
        expected: 'object',
        code: 'invalid_type',
        path: [],
        message: 'Invalid input',
      },
    ];

    const error = normalizeQueryError(
      rawIssues,
      'Orders are temporarily unavailable. Please refresh and try again.'
    );

    expect(error.message).toBe('Orders are temporarily unavailable. Please refresh and try again.');
    expect(error.code).toBe('VALIDATION_ERROR');
    expect(error.statusCode).toBe(400);
    expect(error.raw).toEqual(rawIssues);
  });

  it('sanitizes validation issue arrays serialized into Error.message', () => {
    const error = normalizeQueryError(
      new Error(
        JSON.stringify([
          {
            expected: 'object',
            code: 'invalid_type',
            path: [],
            message: 'Invalid input',
          },
        ])
      ),
      'Customer metrics are temporarily unavailable. Please refresh and try again.'
    );

    expect(error.message).toBe(
      'Customer metrics are temporarily unavailable. Please refresh and try again.'
    );
    expect(error.code).toBe('VALIDATION_ERROR');
    expect(error.statusCode).toBe(400);
  });

  it('preserves user-friendly messages for non-validation errors', () => {
    const error = normalizeQueryError({
      message: 'Not found',
      statusCode: 404,
    });

    expect(error.message).toBe('The requested item could not be found.');
    expect(error.statusCode).toBe(404);
  });
});
