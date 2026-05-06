import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { formatProductPricingMutationError } from '@/hooks/products/product-mutation-error-messages';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

describe('product pricing mutation errors', () => {
  it('suppresses infrastructure messages and keeps safe recovery copy', () => {
    expect(
      formatProductPricingMutationError(
        new Error('duplicate key value violates unique constraint product_price_tiers_product_id_min_qty_key'),
        'createTier'
      )
    ).toBe('Product price tier creation is temporarily unavailable. Please refresh and try again.');

    expect(
      formatProductPricingMutationError(
        new Error('postgres database stack trace while applying bulk price adjustment'),
        'adjust'
      )
    ).toBe('Product price adjustment is temporarily unavailable. Please refresh and try again.');
  });

  it('keeps safe validation and permission guidance', () => {
    expect(
      formatProductPricingMutationError(
        {
          errors: {
            minQuantity: ['Minimum quantity must be greater than zero.'],
          },
        },
        'updateTier'
      )
    ).toBe('Minimum quantity must be greater than zero.');

    expect(
      formatProductPricingMutationError(
        { statusCode: 403, message: 'You do not have permission to manage product pricing.' },
        'setCustomerPrice'
      )
    ).toBe('You do not have permission to manage product pricing.');
  });

  it('keeps product pricing mutations behind product-owned formatters', () => {
    const hook = read('src/hooks/products/use-product-pricing.ts');
    const index = read('src/hooks/products/index.ts');

    expect(index).toContain('formatProductPricingMutationError');
    expect(hook).toContain("formatProductPricingMutationError(error, 'createTier')");
    expect(hook).toContain("formatProductPricingMutationError(error, 'updateTier')");
    expect(hook).toContain("formatProductPricingMutationError(error, 'deleteTier')");
    expect(hook).toContain("formatProductPricingMutationError(error, 'setTiers')");
    expect(hook).toContain("formatProductPricingMutationError(error, 'setCustomerPrice')");
    expect(hook).toContain("formatProductPricingMutationError(error, 'deleteCustomerPrice')");
    expect(hook).toContain("formatProductPricingMutationError(error, 'bulkUpdate')");
    expect(hook).toContain("formatProductPricingMutationError(error, 'adjust')");
    expect(hook).not.toContain('toast.error(error.message');
    expect(hook).not.toContain("Failed to create price tier");
    expect(hook).not.toContain("Failed to update price tier");
    expect(hook).not.toContain("Failed to delete price tier");
    expect(hook).not.toContain("Failed to set customer price");
    expect(hook).not.toContain("Failed to apply price adjustment");
  });
});
