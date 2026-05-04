import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  receiveInventorySchema,
  type ReceiveInventoryInput,
} from '@/lib/schemas/inventory';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

describe('receive inventory schema ownership', () => {
  it('keeps the live receive mutation contract owned by the receiving schema file', () => {
    const receivingSchema = read('src/lib/schemas/inventory/receiving.ts');
    const receivingServer = read('src/server/functions/inventory/receiving.ts');
    const inventoryHook = read('src/hooks/inventory/use-inventory.ts');
    const stockInTrace = read('docs/code-traces/02-inventory-stock-in.md');

    expect(receivingSchema).toContain('export const receiveInventorySchema');
    expect(receivingSchema).toContain('export type ReceiveInventoryInput');
    expect(receivingServer).toContain('receiveInventorySchema');
    expect(receivingServer).not.toContain('const receiveInventorySchema');
    expect(receivingServer).not.toContain("from 'zod'");
    expect(inventoryHook).toContain('ReceiveInventoryInput');
    expect(inventoryHook).not.toContain('interface ReceiveInventoryInput');
    expect(stockInTrace).toContain('src/lib/schemas/inventory/receiving.ts');
  });

  it('preserves receive inventory validation behavior', () => {
    const input: ReceiveInventoryInput = receiveInventorySchema.parse({
      productId: '00000000-0000-4000-8000-000000000001',
      locationId: '00000000-0000-4000-8000-000000000002',
      quantity: 1,
      unitCost: 125,
      receiptReason: 'initial_stock',
      serialNumber: 'SN-48V-001',
      referenceType: 'manual',
      referenceId: '00000000-0000-4000-8000-000000000003',
    });

    expect(input).toMatchObject({
      quantity: 1,
      unitCost: 125,
      receiptReason: 'initial_stock',
      serialNumber: 'SN-48V-001',
    });
    expect(() =>
      receiveInventorySchema.parse({
        productId: '00000000-0000-4000-8000-000000000001',
        locationId: '00000000-0000-4000-8000-000000000002',
        quantity: 1,
        unitCost: 125,
        receiptReason: 'other_exception',
      })
    ).toThrow('Notes are required when using Other Exception.');
  });
});
