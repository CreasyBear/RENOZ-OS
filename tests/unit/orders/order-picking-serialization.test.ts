import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ValidationError } from '@/lib/server/errors';
import { getOrderPickingSerializationRequirement } from '@/server/functions/orders/order-picking-serialization';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

function compact(source: string): string {
  return source.replace(/\s+/g, '');
}

describe('order picking serialization requirements', () => {
  it('treats service lines without product links as non-serialized', () => {
    expect(
      getOrderPickingSerializationRequirement(
        { productId: null, description: 'Installation labour' },
        null,
        'picking'
      )
    ).toBe(false);
  });

  it('uses loaded product serialization metadata for product-backed lines', () => {
    expect(
      getOrderPickingSerializationRequirement(
        { productId: 'product-1', description: 'RENOZ LFP Module' },
        { isSerialized: true },
        'picking'
      )
    ).toBe(true);

    expect(
      getOrderPickingSerializationRequirement(
        { productId: 'product-2', description: 'Cable kit' },
        { isSerialized: false },
        'unpicking'
      )
    ).toBe(false);
  });

  it('fails closed when product-backed line serialization metadata is unavailable', () => {
    expect(() =>
      getOrderPickingSerializationRequirement(
        { productId: 'product-1', description: 'RENOZ LFP Module' },
        null,
        'picking'
      )
    ).toThrow(ValidationError);

    try {
      getOrderPickingSerializationRequirement(
        { productId: 'product-1', description: 'RENOZ LFP Module' },
        null,
        'unpicking'
      );
      throw new Error('Expected getOrderPickingSerializationRequirement to throw');
    } catch (error) {
      expect(error).toBeInstanceOf(ValidationError);
      expect((error as Error).message).toBe(
        'Product serialization requirements are unavailable'
      );
      expect((error as ValidationError).errors.productId?.[0]).toBe(
        "Line 'RENOZ LFP Module' is linked to a product that could not be loaded. Refresh product data before unpicking this order."
      );
    }
  });

  it('keeps picking and unpicking from defaulting missing product serialization to false', () => {
    const source = compact(read('src/server/functions/orders/order-picking.ts'));

    expect(source).toContain(
      "getOrderPickingSerializationRequirement(lineItem,product,'picking')"
    );
    expect(source).toContain(
      "getOrderPickingSerializationRequirement(lineItem,product,'unpicking')"
    );
    expect(source).not.toContain('product?.isSerialized??false');
  });

  it('keeps picking from auto-creating or skipping serialized item records', () => {
    const source = compact(read('src/server/functions/orders/order-picking.ts'));

    expect(source).toContain('allowAutoUpsert:false');
    expect(source).toContain('thrownewValidationError(\'Serializeditemrecordnotfound\'');
    expect(source).not.toContain('upsertSerializedItemForInventory');
    expect(source).not.toContain('if(!inventoryRecord)continue;');
    expect(source).not.toContain('if(!serializedItemId)continue;');
  });

  it('keeps unpicking from reconstructing or skipping serialized allocations', () => {
    const source = compact(read('src/server/functions/orders/order-picking.ts'));

    expect(source).toContain('Serializedallocationrecordsareunavailable');
    expect(source).toContain('thrownewValidationError(\'Serializedallocationrecordnotfound\'');
    expect(source).not.toContain('serializedItemId:\'\'');
    expect(source).not.toContain('if(serializedItemId){');
    expect(source).not.toContain('eq(serializedItems.productId,lineItem.productId),eq(serializedItems.serialNumberNormalized,sn)');
  });
});
