import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

describe('product pricing component errors', () => {
  it('keeps pricing form summaries behind product-owned safe formatters', () => {
    const priceTiers = read('src/components/domain/products/pricing/price-tiers.tsx');
    const customerPricing = read('src/components/domain/products/pricing/customer-pricing.tsx');
    const index = read('src/hooks/products/index.ts');

    expect(index).toContain('formatProductPricingMutationError');
    expect(priceTiers).toContain('formatProductPricingMutationError(updateMutation.error, "updateTier")');
    expect(priceTiers).toContain('formatProductPricingMutationError(createMutation.error, "createTier")');
    expect(priceTiers).toContain('createMutation.reset();');
    expect(priceTiers).toContain('updateMutation.reset();');
    expect(priceTiers).not.toContain('(createMutation.error ?? updateMutation.error)?.message');

    expect(customerPricing).toContain('formatProductPricingMutationError(setCustomerPriceMutation.error, "setCustomerPrice")');
    expect(customerPricing).toContain('setCustomerPriceMutation.reset();');
    expect(customerPricing).not.toContain('setCustomerPriceMutation.error?.message');
  });
});
