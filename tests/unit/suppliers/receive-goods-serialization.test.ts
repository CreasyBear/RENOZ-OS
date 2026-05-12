import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  buildProductSerializationRequirementMap,
  getUniqueReceiptProductIds,
} from '@/server/functions/suppliers/receive-goods-serialization';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

function compact(source: string): string {
  return source.replace(/\s+/g, '');
}

describe('receive goods serialization requirements', () => {
  it('deduplicates linked purchase-order product ids before serialization reads', () => {
    expect(getUniqueReceiptProductIds(['product-1', null, 'product-1', 'product-2'])).toEqual([
      'product-1',
      'product-2',
    ]);
  });

  it('builds a product serialization map when all linked products are available', () => {
    expect(
      Array.from(
        buildProductSerializationRequirementMap(
          ['product-1', 'product-2'],
          [
            { id: 'product-1', isSerialized: true },
            { id: 'product-2', isSerialized: false },
          ]
        ).entries()
      )
    ).toEqual([
      ['product-1', true],
      ['product-2', false],
    ]);
  });

  it('fails closed as a receive transition block when any linked product is unavailable', () => {
    let caught: unknown;

    try {
      buildProductSerializationRequirementMap(
        ['product-1', 'product-2'],
        [{ id: 'product-1', isSerialized: true }]
      );
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(Error);
    expect((caught as Error).message).toBe(
      'One or more purchase-order lines reference a product that is unavailable, inactive, or not purchasable. Refresh the purchase order before receiving goods.'
    );
    expect((caught as { errors?: Record<string, string[]> }).errors?.code).toEqual([
      'transition_blocked',
    ]);
  });

  it('keeps single and bulk PO receiving purchasable-product scoped before stock-in', () => {
    const receiveGoods = compact(read('src/server/functions/suppliers/receive-goods.ts'));
    const bulkReceiveGoods = compact(read('src/server/functions/suppliers/bulk-receive-goods.ts'));

    expect(receiveGoods).toContain(
      "from(products).where(and(eq(products.organizationId,ctx.organizationId),inArray(products.id,productIds),eq(products.status,'active'),eq(products.isActive,true),eq(products.isPurchasable,true),isNull(products.deletedAt)))"
    );
    expect(bulkReceiveGoods).toContain(
      "from(products).where(and(inArray(products.id,productIds),eq(products.organizationId,ctx.organizationId),eq(products.status,'active'),eq(products.isActive,true),eq(products.isPurchasable,true),isNull(products.deletedAt)))"
    );
    expect(receiveGoods).toContain(
      'productSerializationMap=buildProductSerializationRequirementMap(productIds,productRows)'
    );
    expect(bulkReceiveGoods).toContain(
      'productSerializationMap=buildProductSerializationRequirementMap(productIds,productData)'
    );
    expect(receiveGoods).not.toContain('productSerializationMap.get(poItem.productId)??false');
    expect(bulkReceiveGoods).not.toContain('productSerializationMap.get(item.productId)??false');
  });
});
