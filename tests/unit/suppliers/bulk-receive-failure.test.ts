import { describe, expect, it } from 'vitest';
import { ValidationError } from '@/lib/server/errors';
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
});
