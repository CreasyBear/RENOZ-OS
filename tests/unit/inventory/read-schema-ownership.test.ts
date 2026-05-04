import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  INVENTORY_SORT_FIELDS,
  inventoryListQuerySchema,
  inventoryParamsSchema,
  quickSearchInventorySchema,
} from '@/lib/schemas/inventory';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

describe('inventory read schema ownership', () => {
  it('keeps list/search/detail contracts owned by the read schema file', () => {
    const readSchema = read('src/lib/schemas/inventory/reads.ts');
    const inventorySchema = read('src/lib/schemas/inventory/inventory.ts');
    const readServer = read('src/server/functions/inventory/reads.ts');

    expect(readSchema).toContain('export const inventoryListQuerySchema');
    expect(readSchema).toContain('export const quickSearchInventorySchema');
    expect(readSchema).toContain('export const inventoryParamsSchema');
    expect(readSchema).toContain('export interface ListInventoryResult');
    expect(readSchema).toContain('export interface InventoryWithRelations');
    expect(readSchema).toContain('export interface InventoryItem');

    expect(inventorySchema).not.toContain('export const inventoryListQuerySchema');
    expect(inventorySchema).not.toContain('export const quickSearchInventorySchema');
    expect(inventorySchema).not.toContain('export const inventoryParamsSchema');
    expect(inventorySchema).not.toContain('export interface ListInventoryResult');
    expect(inventorySchema).not.toContain('export interface InventoryWithRelations');
    expect(inventorySchema).not.toContain('export interface InventoryItem');

    expect(readServer).toContain('inventoryListQuerySchema');
    expect(readServer).toContain('quickSearchInventorySchema');
    expect(readServer).toContain('inventoryParamsSchema');
    expect(readServer).not.toContain("from 'zod'");
    expect(readServer).not.toContain('normalizeObjectInput(');
    expect(readServer).not.toContain('z.object({');
  });

  it('preserves public inventory schema exports for read callers', () => {
    expect(INVENTORY_SORT_FIELDS).toEqual([
      'createdAt',
      'quantityOnHand',
      'totalValue',
      'status',
    ]);
    expect(
      inventoryListQuerySchema.parse({
        search: 'battery',
        productId: '00000000-0000-4000-8000-000000000001',
      })
    ).toMatchObject({
      search: 'battery',
      productId: '00000000-0000-4000-8000-000000000001',
      page: 1,
      pageSize: 20,
      sortBy: 'createdAt',
      sortOrder: 'desc',
    });
    expect(
      quickSearchInventorySchema.parse({
        q: '48v',
      })
    ).toMatchObject({
      q: '48v',
      limit: 10,
    });
    expect(() => quickSearchInventorySchema.parse({ q: 'x' })).toThrow();
    expect(
      inventoryParamsSchema.parse({
        id: '00000000-0000-4000-8000-000000000002',
      })
    ).toEqual({
      id: '00000000-0000-4000-8000-000000000002',
    });
  });
});
