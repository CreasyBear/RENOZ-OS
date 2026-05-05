import { describe, expect, it } from 'vitest';
import { formatServiceMutationError } from '@/hooks/service/_mutation-errors';

describe('service mutation error formatting', () => {
  it('uses operator-safe field validation messages', () => {
    const message = formatServiceMutationError(
      {
        statusCode: 400,
        errors: {
          reason: ['Transfer reason is required.'],
        },
      },
      'Failed to transfer system ownership'
    );

    expect(message).toBe('Transfer reason is required.');
  });

  it('maps known service authorization and not-found codes', () => {
    expect(
      formatServiceMutationError(
        { statusCode: 404, code: 'NOT_FOUND' },
        'Failed to transfer system ownership'
      )
    ).toBe('Service system or linkage review could not be found. Refresh and try again.');

    expect(
      formatServiceMutationError(
        { statusCode: 403, code: 'PERMISSION_DENIED' },
        'Failed to transfer system ownership'
      )
    ).toBe('You do not have permission to update this service workflow.');
  });

  it('suppresses unsafe infrastructure messages', () => {
    const message = formatServiceMutationError(
      {
        statusCode: 500,
        message: 'duplicate key value violates unique constraint service_owner_email_key',
      },
      'Failed to transfer system ownership'
    );

    expect(message).toBe('Failed to transfer system ownership');
  });
});
