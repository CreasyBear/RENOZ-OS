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

describe('inventory valuation tenant-scope contract', () => {
  it('keeps valuation report descriptor joins organization-bounded', () => {
    const source = compact(read('src/server/functions/inventory/valuation.ts'));

    expect(source).toContain(
      'innerJoin(products,and(eq(inventory.productId,products.id),eq(products.organizationId,ctx.organizationId)))'
    );
    expect(source).toContain(
      'leftJoin(categories,and(eq(products.categoryId,categories.id),eq(categories.organizationId,ctx.organizationId)))'
    );
    expect(source).toContain(
      'innerJoin(locations,and(eq(inventory.locationId,locations.id),eq(locations.organizationId,ctx.organizationId)))'
    );
    expect(source).not.toContain('innerJoin(products,eq(inventory.productId,products.id))');
    expect(source).not.toContain('leftJoin(categories,eq(products.categoryId,categories.id))');
    expect(source).not.toContain('innerJoin(locations,eq(inventory.locationId,locations.id))');
  });

  it('keeps finance integrity and aging joins organization-bounded', () => {
    const source = compact(read('src/server/functions/inventory/valuation.ts'));

    expect(source).toContain(
      'LEFTJOINproductspONp.id=i.product_idANDp.organization_id=${organizationId}'
    );
    expect(source).toContain(
      'LEFTJOINwarehouse_locationslONl.id=i.location_idANDl.organization_id=${organizationId}'
    );
    expect(source).toContain(
      'innerJoin(inventory,and(eq(inventoryCostLayers.inventoryId,inventory.id),eq(inventory.organizationId,ctx.organizationId)))'
    );
    expect(source).toContain(
      'leftJoin(locations,and(eq(inventory.locationId,locations.id),eq(locations.organizationId,ctx.organizationId)))'
    );
  });

  it('keeps product cost-layer reads and weighted-average writes tenant-owned', () => {
    const source = compact(read('src/server/functions/inventory/valuation.ts'));

    expect(source).toContain(
      'eq(inventoryCostLayers.organizationId,ctx.organizationId),eq(inventory.productId,data.productId),eq(inventory.organizationId,ctx.organizationId)'
    );
    expect(source).toContain(
      'select({id:products.id}).from(products).where(and(eq(products.id,data.productId),eq(products.organizationId,ctx.organizationId)))'
    );
    expect(source).toContain("thrownewNotFoundError('Productnotfound','product')");
    expect(source).toContain(
      'update(products).set({costPrice:weightedAvgCost}).where(and(eq(products.id,data.productId),eq(products.organizationId,ctx.organizationId)))'
    );
    expect(source).not.toContain('update(products).set({costPrice:weightedAvgCost}).where(eq(products.id,data.productId))');
  });
});
