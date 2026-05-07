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

describe('product inventory summary location contract', () => {
  it('returns tenant-scoped location labels instead of placeholder names', () => {
    const source = read('src/server/functions/products/product-inventory.ts');
    const compactSource = compact(source);
    const productInventoryBlock = compact(
      sliceBetween(source, 'export const getProductInventory =', 'export const getLocationInventory =')
    );

    expect(compactSource).toContain('functioninventoryLocationJoinCondition(organizationId:string)');
    expect(compactSource).toContain(
      'eq(inventory.locationId,locations.id),eq(locations.organizationId,organizationId)'
    );
    expect(productInventoryBlock).toContain(
      'innerJoin(locations,inventoryLocationJoinCondition(ctx.organizationId))'
    );
    expect(productInventoryBlock).toContain('locationCode:locations.locationCode');
    expect(productInventoryBlock).toContain('locationName:locations.name');
    expect(productInventoryBlock).toContain(
      'groupBy(inventory.locationId,locations.locationCode,locations.name)'
    );
    expect(productInventoryBlock).toContain('locationCode:inv.locationCode');
    expect(productInventoryBlock).toContain('locationName:inv.locationName');
    expect(productInventoryBlock).not.toContain("locationCode:''");
    expect(productInventoryBlock).not.toContain("locationName:'Location'");
    expect(productInventoryBlock).not.toContain(
      'innerJoin(locations,eq(inventory.locationId,locations.id))'
    );
  });
});
