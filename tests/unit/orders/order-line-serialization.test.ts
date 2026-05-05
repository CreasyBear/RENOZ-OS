import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ValidationError } from '@/lib/server/errors';
import { getOrderLineSerializationRequirement } from '@/server/functions/orders/order-line-serialization';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

function compact(source: string): string {
  return source.replace(/\s+/g, '');
}

describe('order line serialization requirements', () => {
  it('treats service lines without product links as non-serialized', () => {
    expect(
      getOrderLineSerializationRequirement(
        { id: 'line-1', productId: null, description: 'Installation labour' },
        null,
        'shipping'
      )
    ).toBe(false);
  });

  it('uses loaded product serialization metadata for product-backed lines', () => {
    expect(
      getOrderLineSerializationRequirement(
        { id: 'line-1', productId: 'product-1', description: 'RENOZ LFP Module' },
        { isSerialized: true },
        'shipping'
      )
    ).toBe(true);

    expect(
      getOrderLineSerializationRequirement(
        { id: 'line-2', productId: 'product-2', description: 'Cable kit' },
        { isSerialized: false },
        'picking'
      )
    ).toBe(false);
  });

  it('fails closed when product-backed line serialization metadata is unavailable', () => {
    try {
      getOrderLineSerializationRequirement(
        { id: 'line-1', productId: 'product-1', description: 'RENOZ LFP Module' },
        null,
        'shipping'
      );
      throw new Error('Expected getOrderLineSerializationRequirement to throw');
    } catch (error) {
      expect(error).toBeInstanceOf(ValidationError);
      expect((error as Error).message).toBe(
        'Product serialization requirements are unavailable'
      );
      expect((error as ValidationError).errors['line-1']?.[0]).toBe(
        "Line 'RENOZ LFP Module' is linked to a product that could not be loaded. Refresh product data before shipping this order."
      );
    }
  });

  it('keeps shipment validation from defaulting missing product serialization to false', () => {
    const source = compact(read('src/server/functions/orders/order-shipments-validation.ts'));

    expect(source).toContain(
      "isSerialized:getOrderLineSerializationRequirement({id:r.lineItemId,productId:r.productId,description:r.description,},productSerialization,'shipping')"
    );
    expect(source).not.toContain('isSerialized:r.isSerialized??false');
  });
});
