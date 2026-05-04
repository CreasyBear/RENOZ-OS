import { describe, expect, it } from 'vitest';
import { mapProductInventoryMutationError } from '@/hooks/products/product-inventory-error-messages';

describe('product inventory mutation errors', () => {
  it('suppresses raw product inventory adjustment errors', () => {
    expect(
      mapProductInventoryMutationError(
        new Error('update inventory set quantity_on_hand = -1 violates check constraint')
      )
    ).toBe('Product inventory adjustment could not be completed. Please refresh and try again.');
  });

  it('preserves structured field guidance', () => {
    expect(
      mapProductInventoryMutationError({
        errors: {
          adjustmentQty: ['Adjustment quantity exceeds available stock.'],
        },
      })
    ).toBe('Adjustment quantity exceeds available stock.');
  });

  it('preserves product inventory serialized state guidance', () => {
    expect(
      mapProductInventoryMutationError({
        errors: {
          code: ['invalid_serial_state'],
        },
      })
    ).toBe('Serialized state conflict detected. Review serial lifecycle and retry.');
  });
});
