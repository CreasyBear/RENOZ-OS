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

describe('inventory alert tenant-scope contract', () => {
  it('keeps alert mutation writes organization-scoped', () => {
    const source = compact(read('src/server/functions/inventory/alerts.ts'));

    expect(source).toContain('withAuth({permission:PERMISSIONS.inventory.manage})');
    expect(source).toContain(
      'where(and(eq(inventoryAlerts.id,id),eq(inventoryAlerts.organizationId,ctx.organizationId)))'
    );
    expect(source).toContain(
      'where(and(eq(inventoryAlerts.id,data.id),eq(inventoryAlerts.organizationId,ctx.organizationId)))'
    );
    expect(source).toContain(
      'where(and(eq(inventoryAlerts.id,data.alertId),eq(inventoryAlerts.organizationId,ctx.organizationId)))'
    );
    expect(source).toContain(
      'where(and(eq(inventoryAlerts.id,alert.id),eq(inventoryAlerts.organizationId,ctx.organizationId)))'
    );
    expect(source).not.toContain('.where(eq(inventoryAlerts.id,id))');
    expect(source).not.toContain('.where(eq(inventoryAlerts.id,data.id))');
    expect(source).not.toContain('.where(eq(inventoryAlerts.id,data.alertId))');
    expect(source).not.toContain('.where(eq(inventoryAlerts.id,alert.id))');
  });

  it('validates alert product changes as active and tenant-owned', () => {
    const source = compact(read('src/server/functions/inventory/alerts.ts'));

    expect(source).toContain('functionalertProductWhereCondition(productId:string,organizationId:string)');
    expect(source).toContain(
      'eq(products.id,productId),eq(products.organizationId,organizationId),isNull(products.deletedAt)'
    );
    expect(source).toContain('if(data.productId!==undefined)');
    expect(source).toContain('where(alertProductWhereCondition(data.productId,ctx.organizationId))');
    expect(source).toContain('where(alertProductWhereCondition(alert.productId,ctx.organizationId))');
    expect(source).toContain('where(alertProductWhereCondition(alert.productId,organizationId))');
    expect(source).toContain('if(data.locationId!==undefined)');
    expect(source).toContain('eq(warehouseLocations.id,data.locationId)');
    expect(source).toContain('eq(warehouseLocations.organizationId,ctx.organizationId)');
  });

  it('keeps computed alert product descriptors active and organization-bounded', () => {
    const source = compact(read('src/server/functions/inventory/alerts.ts'));

    expect(source).toContain('functionalertInventoryProductJoinCondition(organizationId:string)');
    expect(source).toContain(
      'eq(inventory.productId,products.id),eq(products.organizationId,organizationId),isNull(products.deletedAt)'
    );
    expect(source).toContain(
      'innerJoin(products,alertInventoryProductJoinCondition(ctx.organizationId))'
    );
    expect(source).toContain(
      'leftJoin(warehouseLocations,and(eq(inventory.locationId,warehouseLocations.id),eq(warehouseLocations.organizationId,ctx.organizationId)))'
    );
    expect(source).toContain(
      'innerJoin(products,alertInventoryProductJoinCondition(organizationId))'
    );
    expect(source).toContain(
      'leftJoin(warehouseLocations,and(eq(inventory.locationId,warehouseLocations.id),eq(warehouseLocations.organizationId,organizationId)))'
    );
    expect(source).toContain('ANDp.organization_id=${organizationId}ANDp.deleted_atISNULL');
    expect(source).toContain('ANDm.organization_id=${organizationId}');
  });
});
