import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  receiveStockSchema,
  type ReceiveStockInput,
} from '@/lib/schemas/inventory';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

function receiveStockBlock(source: string): string {
  const start = source.indexOf('export const receiveStock');
  const end = source.indexOf('/**\n * Allocate stock');

  expect(start).toBeGreaterThan(-1);
  expect(end).toBeGreaterThan(start);

  return source.slice(start, end);
}

describe('product receive stock wrapper schema ownership', () => {
  it('keeps receiveStock wrapper validation owned by the receiving schema file', () => {
    const receivingSchema = read('src/lib/schemas/inventory/receiving.ts');
    const productInventoryServer = read('src/server/functions/products/product-inventory.ts');
    const wrapperBlock = receiveStockBlock(productInventoryServer);
    const stockInTrace = read('docs/code-traces/02-inventory-stock-in.md');

    expect(receivingSchema).toContain('export const receiveStockSchema');
    expect(receivingSchema).toContain('export type ReceiveStockInput');
    expect(wrapperBlock).toContain('inputValidator(receiveStockSchema)');
    expect(wrapperBlock).toContain('return receiveInventory({');
    expect(wrapperBlock).not.toContain('z.object({');
    expect(stockInTrace).toContain('receiveStockSchema');
    expect(stockInTrace).toContain('src/lib/schemas/inventory/receiving.ts');
  });

  it('preserves receiveStock wrapper input behavior before canonical delegation', () => {
    const input: ReceiveStockInput = receiveStockSchema.parse({
      productId: '00000000-0000-4000-8000-000000000001',
      locationId: '00000000-0000-4000-8000-000000000002',
      quantity: 2,
      referenceType: 'manual',
      referenceId: '00000000-0000-4000-8000-000000000003',
    });

    expect(input).toMatchObject({
      quantity: 2,
      referenceType: 'manual',
    });
    expect(input.unitCost).toBeUndefined();
    expect(() =>
      receiveStockSchema.parse({
        productId: '00000000-0000-4000-8000-000000000001',
        locationId: '00000000-0000-4000-8000-000000000002',
        quantity: 0,
      })
    ).toThrow('Quantity must be positive');
  });
});
