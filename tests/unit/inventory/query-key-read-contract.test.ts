import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { inventoryQueryKeys } from '@/lib/query-key-catalog/inventory';
import { queryKeys } from '@/lib/query-keys';
import {
  inventoryListQuerySchema,
  quickSearchInventorySchema,
  type InventoryListQuery,
  type QuickSearchInventoryInput,
} from '@/lib/schemas/inventory';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

function inventoryCatalogTypeBlock(source: string): string {
  const start = source.indexOf('export type InventoryFilters');
  const end = source.indexOf('const all =');

  expect(start).toBeGreaterThan(-1);
  expect(end).toBeGreaterThan(start);

  return source.slice(start, end);
}

describe('inventory query-key read contract', () => {
  it('exposes the inventory catalog through the public query key adapter', () => {
    expect(queryKeys.inventory).toBe(inventoryQueryKeys);
  });

  it('types inventory query keys from read-owned schema contracts', () => {
    const queryKeysSource = read('src/lib/query-keys.ts');
    const inventoryCatalogSource = read('src/lib/query-key-catalog/inventory.ts');
    const inventoryTypeBlock = inventoryCatalogTypeBlock(inventoryCatalogSource);

    expect(queryKeysSource).toContain("import { inventoryQueryKeys } from './query-key-catalog/inventory'");
    expect(queryKeysSource).toContain("export type { InventoryFilters } from './query-key-catalog/inventory'");
    expect(queryKeysSource).toContain('inventory: inventoryQueryKeys');
    expect(queryKeysSource).not.toContain("from '@/lib/schemas/inventory'");
    expect(inventoryCatalogSource).toContain('InventoryListQuery');
    expect(inventoryCatalogSource).toContain('QuickSearchInventoryInput');
    expect(inventoryCatalogSource).toContain('export type InventoryFilters = Partial<InventoryListQuery>');
    expect(inventoryCatalogSource).toContain(
      'type InventorySearchOptions = Pick<Partial<QuickSearchInventoryInput>'
    );
    expect(inventoryCatalogSource).not.toContain('queryKeys.inventory');
    expect(inventoryCatalogSource).not.toContain('export interface InventoryFilters');
    expect(inventoryTypeBlock).not.toContain('category?: string');
    expect(inventoryTypeBlock).not.toContain('cursor?: string');
  });

  it('preserves inventory list and search key shapes for schema-shaped inputs', () => {
    const filters: Partial<InventoryListQuery> = inventoryListQuerySchema.parse({
      search: 'battery',
      locationId: '00000000-0000-4000-8000-000000000001',
      qualityStatus: ['damaged', 'expired'],
      ageRange: '31-60',
      minQuantity: 5,
      maxValue: 5000,
      sortBy: 'quantityOnHand',
      sortOrder: 'asc',
      page: 2,
      pageSize: 50,
    });

    expect(queryKeys.inventory.list(filters)).toEqual([
      'inventory',
      'list',
      filters,
    ]);

    const searchInput: QuickSearchInventoryInput = quickSearchInventorySchema.parse({
      q: '48v',
      limit: 25,
    });
    const searchOptions: Pick<Partial<QuickSearchInventoryInput>, 'limit'> = {
      limit: searchInput.limit,
    };

    expect(queryKeys.inventory.search(searchInput.q, searchOptions)).toEqual([
      'inventory',
      'search',
      '48v',
      { limit: 25 },
    ]);
  });
});
