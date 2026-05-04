import { describe, expect, it } from 'vitest';
import { formatInventoryMutationError } from '@/hooks/inventory/_mutation-errors';

describe('inventory mutation error formatter', () => {
  it('prefers validation field guidance for known inventory integrity codes', () => {
    const error = {
      data: {
        errors: {
          code: ['serialized_unit_violation'],
          quantity: ['Serialized batteries must be counted as one unit at a time.'],
        },
      },
    };

    expect(formatInventoryMutationError(error, 'Failed to update inventory')).toBe(
      'Serialized batteries must be counted as one unit at a time.'
    );
  });

  it('falls back to operator-safe copy instead of raw unknown error messages', () => {
    const error = new Error('duplicate key value violates unique constraint inventory_pkey');

    expect(formatInventoryMutationError(error, 'Failed to update inventory')).toBe(
      'Failed to update inventory'
    );
  });

  it('supports custom domain codes from serialized lineage validation details', () => {
    const error = {
      details: {
        validationErrors: {
          code: ['shipped_status_conflict'],
        },
      },
    };

    expect(
      formatInventoryMutationError(error, 'Failed to update serial', {
        codeMessages: {
          shipped_status_conflict:
            'This serial has shipment history and cannot be mutated in this way.',
        },
      })
    ).toBe('This serial has shipment history and cannot be mutated in this way.');
  });
});
