import { describe, expect, it } from 'vitest';
import {
  formatServiceActionMutationError,
  formatServiceMutationError,
} from '@/hooks/service/_mutation-errors';

describe('service mutation error formatting', () => {
  it('uses operator-safe field validation messages', () => {
    const message = formatServiceMutationError(
      {
        statusCode: 400,
        errors: {
          reason: ['Transfer reason is required.'],
        },
      },
      'Service system ownership transfer is temporarily unavailable. Please refresh and try again.'
    );

    expect(message).toBe('Transfer reason is required.');
  });

  it('maps known service authorization and not-found codes', () => {
    expect(
      formatServiceMutationError(
        { statusCode: 404, code: 'NOT_FOUND' },
        'Service system ownership transfer is temporarily unavailable. Please refresh and try again.'
      )
    ).toBe('Service system or linkage review could not be found. Refresh and try again.');

    expect(
      formatServiceMutationError(
        { statusCode: 403, code: 'PERMISSION_DENIED' },
        'Service system ownership transfer is temporarily unavailable. Please refresh and try again.'
      )
    ).toBe('You do not have permission to update this service workflow.');
  });

  it('suppresses unsafe infrastructure messages', () => {
    const fallback =
      'Service system ownership transfer is temporarily unavailable. Please refresh and try again.';
    const message = formatServiceMutationError(
      {
        statusCode: 500,
        message: 'duplicate key value violates unique constraint service_owner_email_key',
      },
      fallback
    );

    expect(message).toBe(fallback);
  });

  it('formats service mutations with action-specific unavailable copy', () => {
    expect(
      formatServiceActionMutationError(
        {
          statusCode: 400,
          errors: {
            reason: ['Transfer reason is required.'],
          },
        },
        'transferOwnership'
      )
    ).toBe('Transfer reason is required.');

    expect(
      formatServiceActionMutationError(
        new Error(
          'duplicate key value violates unique constraint service_linkage_review_resolution_idx'
        ),
        'resolveLinkageReview'
      )
    ).toBe(
      'Service linkage review resolution is temporarily unavailable. Please refresh and try again.'
    );
  });
});
