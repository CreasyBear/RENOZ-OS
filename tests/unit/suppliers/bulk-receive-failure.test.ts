import { describe, expect, it } from 'vitest';
import {
  AuthError,
  NotFoundError,
  PermissionDeniedError,
  RateLimitError,
  ServerError,
  ValidationError,
} from '@/lib/server/errors';
import { createSerializedMutationError } from '@/lib/server/serialized-mutation-contract';
import { toBulkReceiveFailure } from '@/server/functions/suppliers/bulk-receive-failure';

describe('bulk receive failure normalization', () => {
  it('preserves serialized mutation error codes for row-level recovery', () => {
    expect(
      toBulkReceiveFailure(
        'po-1',
        createSerializedMutationError(
          'Serialized product requires serial numbers',
          'invalid_serial_state'
        )
      )
    ).toEqual({
      poId: 'po-1',
      error: 'Serialized product requires serial numbers',
      code: 'invalid_serial_state',
    });
  });

  it('omits unknown validation codes from bulk failure rows', () => {
    expect(
      toBulkReceiveFailure('po-1', new ValidationError('Other validation', { code: ['custom'] }))
    ).toEqual({
      poId: 'po-1',
      error: 'Other validation',
    });
  });

  it('maps known server failures to operator-safe row messages', () => {
    expect(toBulkReceiveFailure('po-1', new NotFoundError())).toEqual({
      poId: 'po-1',
      error: 'This purchase order could not be found. Refresh and try again.',
    });

    expect(toBulkReceiveFailure('po-1', new PermissionDeniedError())).toEqual({
      poId: 'po-1',
      error: 'You do not have permission to receive goods.',
    });

    expect(toBulkReceiveFailure('po-1', new AuthError())).toEqual({
      poId: 'po-1',
      error: 'Your session has expired. Sign in again before receiving goods.',
    });

    expect(toBulkReceiveFailure('po-1', new RateLimitError())).toEqual({
      poId: 'po-1',
      error: 'Too many purchase orders were received at once. Wait a moment and retry.',
    });
  });

  it('suppresses unsafe row failure messages', () => {
    expect(
      toBulkReceiveFailure(
        'po-1',
        new Error('duplicate key value violates unique constraint purchase_order_receipts_pkey')
      )
    ).toEqual({
      poId: 'po-1',
      error: 'This purchase order could not be received. Refresh and try again.',
    });

    expect(
      toBulkReceiveFailure(
        'po-1',
        new ValidationError(
          'duplicate key value violates unique constraint purchase_order_receipts_pkey'
        )
      )
    ).toEqual({
      poId: 'po-1',
      error: 'This purchase order could not be received. Refresh and try again.',
    });

    expect(toBulkReceiveFailure('po-1', new ServerError('Internal server error'))).toEqual({
      poId: 'po-1',
      error: 'This purchase order could not be received. Refresh and try again.',
    });
  });
});
