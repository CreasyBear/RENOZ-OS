import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  createStockCountSchema,
  stockCountListQuerySchema,
  updateStockCountItemSchema,
  updateStockCountSchema,
} from '@/lib/schemas/inventory';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

describe('inventory stock count schema ownership', () => {
  it('keeps stock count schemas owned by the stock count schema file', () => {
    const stockCountSchema = read('src/lib/schemas/inventory/stock-counts.ts');
    const inventorySchema = read('src/lib/schemas/inventory/inventory.ts');

    expect(stockCountSchema).toContain('export const createStockCountSchema');
    expect(stockCountSchema).toContain('export const updateStockCountSchema');
    expect(stockCountSchema).toContain('export const stockCountListQuerySchema');
    expect(stockCountSchema).toContain('export const updateStockCountItemSchema');
    expect(inventorySchema).not.toContain('export const createStockCountSchema');
    expect(inventorySchema).not.toContain('export const updateStockCountSchema');
    expect(inventorySchema).not.toContain('export const stockCountListQuerySchema');
    expect(inventorySchema).not.toContain('export const updateStockCountItemSchema');
  });

  it('preserves the public inventory schema barrel for stock count callers', () => {
    expect(createStockCountSchema.parse({ countCode: 'COUNT-001' })).toMatchObject({
      countCode: 'COUNT-001',
      countType: 'cycle',
      varianceThreshold: 5,
      metadata: {},
    });
    expect(updateStockCountSchema.parse({ status: 'in_progress' })).toMatchObject({
      status: 'in_progress',
      countType: 'cycle',
      varianceThreshold: 5,
      metadata: {},
    });
    expect(stockCountListQuerySchema.parse(undefined)).toMatchObject({
      page: 1,
      pageSize: 20,
    });
    expect(updateStockCountItemSchema.parse({ countedQuantity: 4 })).toMatchObject({
      countedQuantity: 4,
    });
  });
});
