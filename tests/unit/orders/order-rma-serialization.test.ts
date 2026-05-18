import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ValidationError } from '@/lib/server/errors';
import {
  getRequiredRmaCreateLineSerializationRequirement,
  getRmaCreateLineSerializationRequirement,
  getRmaReceiveLineSerializationRequirement,
} from '@/server/functions/orders/order-rma-serialization';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

function compact(source: string): string {
  return source.replace(/\s+/g, '');
}

describe('RMA line serialization requirements', () => {
  it('requires RMA lines to be product-backed', () => {
    expect(() =>
      getRmaCreateLineSerializationRequirement(
        { id: 'line-1', productId: null, description: 'Installation labour' },
        null
      )
    ).toThrow(ValidationError);
  });

  it('uses loaded product serialization metadata for product-backed RMA lines', () => {
    expect(
      getRmaCreateLineSerializationRequirement(
        { id: 'line-1', productId: 'product-1', description: 'RENOZ LFP Module' },
        { isSerialized: true }
      )
    ).toBe(true);

    expect(
      getRmaCreateLineSerializationRequirement(
        { id: 'line-2', productId: 'product-2', description: 'Cable kit' },
        { isSerialized: false }
      )
    ).toBe(false);
  });

  it('fails closed when product-backed RMA serialization metadata is unavailable', () => {
    try {
      getRmaCreateLineSerializationRequirement(
        { id: 'line-1', productId: 'product-1', description: 'RENOZ LFP Module' },
        null
      );
      throw new Error('Expected getRmaCreateLineSerializationRequirement to throw');
    } catch (error) {
      expect(error).toBeInstanceOf(ValidationError);
      expect((error as Error).message).toBe(
        'Product serialization requirements are unavailable'
      );
      expect((error as ValidationError).errors['line-1']?.[0]).toBe(
        "Line 'RENOZ LFP Module' is linked to a product that could not be loaded. Refresh product data before creating an RMA for this order."
      );
    }
  });

  it('fails closed when receiving an RMA line without product metadata', () => {
    try {
      getRmaReceiveLineSerializationRequirement(
        { id: 'rma-line-1', productId: 'product-1', description: 'RENOZ LFP Module' },
        null
      );
      throw new Error('Expected getRmaReceiveLineSerializationRequirement to throw');
    } catch (error) {
      expect(error).toBeInstanceOf(ValidationError);
      expect((error as Error).message).toBe(
        'Product serialization requirements are unavailable'
      );
      expect((error as ValidationError).errors['rma-line-1']?.[0]).toBe(
        "Line 'RENOZ LFP Module' is linked to a product that could not be loaded. Refresh product data before receiving an RMA for this order."
      );
    }
  });

  it('fails closed when the RMA line serialization map is missing a requested line', () => {
    expect(() =>
      getRequiredRmaCreateLineSerializationRequirement(new Map(), 'line-1')
    ).toThrow(ValidationError);
  });

  it('keeps RMA create from defaulting missing product serialization to false', () => {
    const source = compact(read('src/server/functions/orders/rma.ts'));

    expect(source).toContain(
      'getRmaCreateLineSerializationRequirement({id:r.orderLineItemId,productId:r.productId,description:r.description,},productSerialization)'
    );
    expect(source).toContain(
      'getRequiredRmaCreateLineSerializationRequirement(lineItemSerializationMap,item.orderLineItemId)'
    );
    expect(source).not.toContain('r.isSerialized??false');
    expect(source).not.toContain('lineItemProductMap.get(item.orderLineItemId)??false');
  });

  it('keeps RMA receive from dropping lines when product metadata is unavailable', () => {
    const source = compact(read('src/server/functions/orders/_shared/rma-execution.ts'));

    expect(source).toContain(
      'getRmaReceiveLineSerializationRequirement({id:r.rmaLineItem.id,productId:r.productId,description:r.description??r.rmaLineItem.id,},productSerialization)'
    );
    expect(source).toContain('leftJoin(products,and(eq(orderLineItems.productId,products.id)');
    expect(source).not.toContain('if(!productId)continue');
  });

  it('keeps RMA create from skipping serialized lineage event writes', () => {
    const source = compact(read('src/server/functions/orders/rma.ts'));

    expect(source).toContain('thrownewValidationError(\'Serializeditemrecordnotfound\'');
    expect(source).toContain('allowAutoUpsert:false,source:\'rma_create\'');
    expect(source).not.toContain('if(serializedItem){awaitaddSerializedItemEvent');
  });
});
