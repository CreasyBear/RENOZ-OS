import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  PROCUREMENT_PRODUCT_NOT_PURCHASABLE_MESSAGE,
  PROCUREMENT_PRODUCT_UNAVAILABLE_MESSAGE,
  getProcurementProductBlockMessage,
} from '@/components/domain/inventory/procurement-product-guard';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

function compact(source: string): string {
  return source.replace(/\s+/g, '');
}

describe('procurement product guard', () => {
  it('allows only active purchasable product state', () => {
    expect(
      getProcurementProductBlockMessage({
        status: 'active',
        isActive: true,
        isPurchasable: true,
      })
    ).toBeNull();

    expect(getProcurementProductBlockMessage(null)).toBe(
      PROCUREMENT_PRODUCT_UNAVAILABLE_MESSAGE
    );
    expect(
      getProcurementProductBlockMessage({
        status: 'discontinued',
        isActive: true,
        isPurchasable: true,
      })
    ).toBe(PROCUREMENT_PRODUCT_NOT_PURCHASABLE_MESSAGE);
    expect(
      getProcurementProductBlockMessage({
        status: 'active',
        isActive: false,
        isPurchasable: true,
      })
    ).toBe(PROCUREMENT_PRODUCT_NOT_PURCHASABLE_MESSAGE);
    expect(
      getProcurementProductBlockMessage({
        status: 'active',
        isActive: true,
        isPurchasable: false,
      })
    ).toBe(PROCUREMENT_PRODUCT_NOT_PURCHASABLE_MESSAGE);
  });

  it('keeps direct inventory PO creation surfaces behind product detail validation', () => {
    const alertDialog = compact(
      read('src/components/domain/inventory/alerts/create-po-from-alert-dialog.tsx')
    );
    const recommendationDialog = compact(
      read('src/components/domain/inventory/forecasting/create-po-from-recommendation-dialog.tsx')
    );

    for (const source of [alertDialog, recommendationDialog]) {
      expect(source).toContain('import{useProduct}from"@/hooks/products";');
      expect(source).toContain('getProcurementProductBlockMessage(productQuery.data?.product)');
      expect(source).toContain('if(productBlockMessage){setError(productBlockMessage);return;}');
      expect(source).toContain('!!productBlockMessage');
    }
  });
});
