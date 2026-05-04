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
});
