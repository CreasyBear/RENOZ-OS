import { describe, expect, it } from 'vitest';
import {
  formatRmaExecutionBlockedFeedback,
  formatRmaMutationError,
} from '@/hooks/support/_rma-mutation-errors';

describe('RMA mutation error formatting', () => {
  it('maps known RMA mutation codes', () => {
    expect(formatRmaMutationError({ statusCode: 404, code: 'NOT_FOUND' }, 'Failed to create RMA')).toBe(
      'The RMA could not be found. Refresh and try again.'
    );

    expect(
      formatRmaMutationError({ statusCode: 403, code: 'PERMISSION_DENIED' }, 'Failed to create RMA')
    ).toBe('You do not have permission to update this RMA.');
  });

  it('keeps safe validation messages and suppresses unsafe infrastructure messages', () => {
    expect(
      formatRmaMutationError(
        {
          statusCode: 400,
          errors: {
            lineItems: ['At least one item is required.'],
          },
        },
        'Failed to create RMA'
      )
    ).toBe('At least one item is required.');

    expect(
      formatRmaMutationError(
        {
          statusCode: 500,
          message: 'duplicate key value violates unique constraint return_authorizations_rma_number_key',
        },
        'Failed to create RMA'
      )
    ).toBe('Failed to create RMA');
  });

  it('formats blocked remedy feedback without leaking infrastructure copy', () => {
    expect(formatRmaExecutionBlockedFeedback('Create the replacement order first.')).toBe(
      'Create the replacement order first.'
    );

    expect(formatRmaExecutionBlockedFeedback('database constraint failed')).toBe(
      'RMA execution is blocked'
    );
  });
});
