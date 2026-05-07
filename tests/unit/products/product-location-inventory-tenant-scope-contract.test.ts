import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

function compact(source: string): string {
  return source.replace(/\s+/g, '');
}

function sliceBetween(source: string, start: string, end: string): string {
  const startIndex = source.indexOf(start);
  const endIndex = source.indexOf(end, startIndex + start.length);

  expect(startIndex).toBeGreaterThanOrEqual(0);
  expect(endIndex).toBeGreaterThan(startIndex);

  return source.slice(startIndex, endIndex);
}

describe('product location inventory tenant-scope contract', () => {
  it('keeps location inventory product joins inside the organization boundary', () => {
    const source = read('src/server/functions/products/product-inventory.ts');
    const compactSource = compact(source);
    const locationInventoryBlock = compact(
      sliceBetween(source, 'export const getLocationInventory =', '// STOCK MOVEMENTS')
    );

    expect(compactSource).toContain('functioninventoryProductJoinCondition(organizationId:string)');
    expect(compactSource).toContain(
      'eq(inventory.productId,products.id),eq(products.organizationId,organizationId),isNull(products.deletedAt)'
    );
    expect(locationInventoryBlock).toContain(
      'innerJoin(products,inventoryProductJoinCondition(ctx.organizationId))'
    );
    expect(locationInventoryBlock).not.toContain(
      'innerJoin(products,eq(inventory.productId,products.id))'
    );
    expect(locationInventoryBlock).toContain('eq(inventory.organizationId,ctx.organizationId)');
    expect(locationInventoryBlock).toContain('ilike(products.sku,searchPattern)');
    expect(locationInventoryBlock).toContain('ilike(products.name,searchPattern)');
  });
});
