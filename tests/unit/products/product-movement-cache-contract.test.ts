import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { queryKeys } from '@/lib/query-keys';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

function compact(source: string): string {
  return source.replace(/\s+/g, '');
}

describe('product movement cache contract', () => {
  it('keys product movement reads by every server-side movement filter', () => {
    const hook = read('src/hooks/products/use-product-inventory.ts');
    const compactHook = compact(hook);

    expect(compactHook).toContain('constmovementFilters={movementType,locationId,limit,page};');
    expect(compactHook).toContain(
      'queryKey:queryKeys.products.movements(productId,movementFilters)'
    );
    expect(compactHook).toContain('data:{productId,...movementFilters}');
    expect(compactHook).not.toContain(
      'queryKey:queryKeys.products.movements(productId,{movementType,limit,page})'
    );

    expect(queryKeys.products.movements('product-1', {
      movementType: 'transfer',
      locationId: 'location-1',
      limit: 20,
      page: 2,
    })).toEqual([
      'products',
      'movements',
      'product-1',
      {
        movementType: 'transfer',
        locationId: 'location-1',
        limit: 20,
        page: 2,
      },
    ]);
  });

  it('invalidates all product movement pages after product stock adjustment', () => {
    const hook = read('src/hooks/products/use-product-inventory.ts');
    const compactHook = compact(hook);

    expect(compactHook).toContain(
      'queryKey:queryKeys.products.movementsForProduct(variables.productId)'
    );
    expect(compactHook).toContain(
      'queryKey:queryKeys.products.movementsAggregatedForProduct(variables.productId)'
    );
    expect(compactHook).not.toContain(
      'queryKeys.products.movements(variables.productId,{})'
    );
    expect(compactHook).not.toContain(
      'queryKeys.products.movementsAggregated(variables.productId,{})'
    );
  });
});
