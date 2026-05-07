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

describe('product low-stock alert tenant-scope contract', () => {
  it('keeps low-stock alert product and location joins inside the organization boundary', () => {
    const source = read('src/server/functions/products/product-inventory.ts');
    const alertBlock = compact(
      sliceBetween(source, 'export const getLowStockAlerts =', 'export const getInventoryStats =')
    );

    expect(alertBlock).toContain('eq(inventory.organizationId,ctx.organizationId)');
    expect(alertBlock).toContain(
      'innerJoin(products,and(eq(inventory.productId,products.id),eq(products.organizationId,ctx.organizationId),isNull(products.deletedAt)))'
    );
    expect(alertBlock).toContain(
      'innerJoin(locations,and(eq(inventory.locationId,locations.id),eq(locations.organizationId,ctx.organizationId)))'
    );
    expect(alertBlock).not.toContain('innerJoin(products,eq(inventory.productId,products.id))');
    expect(alertBlock).not.toContain('innerJoin(locations,eq(inventory.locationId,locations.id))');
  });
});
