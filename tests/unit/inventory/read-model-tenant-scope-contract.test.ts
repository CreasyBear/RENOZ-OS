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

describe('inventory read-model tenant-scope contract', () => {
  it('keeps inventory list and quick-search product descriptors active and organization-bounded', () => {
    const source = compact(read('src/server/functions/inventory/reads.ts'));

    expect(source).toContain(
      'functioninventoryProductJoinCondition(organizationId:string)'
    );
    expect(source).toContain(
      'eq(inventory.productId,products.id),eq(products.organizationId,organizationId),isNull(products.deletedAt)'
    );
    expect(source).toContain(
      'constproductJoin=inventoryProductJoinCondition(organizationId);'
    );
    expect(source).toContain(
      'constlocationJoin=and(eq(inventory.locationId,locations.id),eq(locations.organizationId,organizationId))!'
    );
    expect(source).toContain(
      'leftJoin(products,inventoryProductJoinCondition(ctx.organizationId))'
    );
    expect(source).toContain('eq(products.id,item.productId),eq(products.organizationId,organizationId),isNull(products.deletedAt)');
    expect(source).toContain(
      'leftJoin(locations,and(eq(inventory.locationId,locations.id),eq(locations.organizationId,ctx.organizationId)))'
    );
    expect(source).not.toContain('leftJoin(products,eq(inventory.productId,products.id))');
    expect(source).not.toContain('leftJoin(locations,eq(inventory.locationId,locations.id))');
  });

  it('keeps movement product descriptors active and reference joins organization-bounded', () => {
    const source = compact(read('src/server/functions/inventory/movements.ts'));

    expect(source).toContain(
      'functionmovementProductJoinCondition(organizationId:string)'
    );
    expect(source).toContain(
      'eq(inventoryMovements.productId,products.id),eq(products.organizationId,organizationId),isNull(products.deletedAt)'
    );
    expect(source).toContain(
      'leftJoin(products,movementProductJoinCondition(ctx.organizationId))'
    );
    expect(source).toContain(
      'leftJoin(locations,and(eq(inventoryMovements.locationId,locations.id),eq(locations.organizationId,ctx.organizationId)))'
    );
    expect(source).toContain(
      "eq(inventoryMovements.referenceType,'order'),eq(inventoryMovements.referenceId,orders.id),eq(orders.organizationId,ctx.organizationId)"
    );
    expect(source).toContain(
      "eq(inventoryMovements.referenceType,'purchase_order'),eq(inventoryMovements.referenceId,purchaseOrders.id),eq(purchaseOrders.organizationId,ctx.organizationId)"
    );
  });

  it('keeps standard dashboard movement product descriptors active and organization-bounded', () => {
    const source = compact(read('src/server/functions/inventory/dashboard.ts'));

    expect(source).toContain(
      'functiondashboardMovementProductJoinCondition(organizationId:string)'
    );
    expect(source).toContain(
      'eq(inventoryMovements.productId,products.id),eq(products.organizationId,organizationId),isNull(products.deletedAt)'
    );
    expect(source).toContain(
      'leftJoin(products,dashboardMovementProductJoinCondition(ctx.organizationId))'
    );
    expect(source).not.toContain('leftJoin(products,eq(inventoryMovements.productId,products.id))');
  });

  it('keeps WMS dashboard product category location and movement joins organization-bounded', () => {
    const source = compact(read('src/server/functions/inventory/wms-dashboard.ts'));

    expect(source).toContain(
      'leftJoin(products,and(eq(inventory.productId,products.id),eq(products.organizationId,ctx.organizationId)))'
    );
    expect(source).toContain(
      'leftJoin(categories,and(eq(products.categoryId,categories.id),eq(categories.organizationId,ctx.organizationId)))'
    );
    expect(source).toContain(
      'innerJoin(locations,and(eq(inventory.locationId,locations.id),eq(locations.organizationId,ctx.organizationId)))'
    );
    expect(source).toContain(
      'leftJoin(products,and(eq(inventoryMovements.productId,products.id),eq(products.organizationId,ctx.organizationId)))'
    );
    expect(source).toContain(
      'leftJoin(locations,and(eq(inventoryMovements.locationId,locations.id),eq(locations.organizationId,ctx.organizationId)))'
    );
    expect(source).not.toContain('leftJoin(products,eq(inventory.productId,products.id))');
    expect(source).not.toContain('leftJoin(products,eq(inventoryMovements.productId,products.id))');
    expect(source).not.toContain('leftJoin(categories,eq(products.categoryId,categories.id))');
  });
});
