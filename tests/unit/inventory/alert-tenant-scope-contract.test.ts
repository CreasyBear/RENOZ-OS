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
    const queryConditions = compact(
      read('src/server/functions/inventory/alert-query-conditions.ts')
    );
    const triggeredRead = compact(read('src/server/functions/inventory/triggered-alerts-read.ts'));

    expect(queryConditions).toContain(
      'exportfunctionalertProductWhereCondition(productId:string,organizationId:string)'
    );
    expect(queryConditions).toContain(
      'eq(products.id,productId),eq(products.organizationId,organizationId),isNull(products.deletedAt)'
    );
    expect(queryConditions).toContain(
      'exportfunctionalertLocationWhereCondition(locationId:string,organizationId:string)'
    );
    expect(queryConditions).toContain(
      'eq(warehouseLocations.id,locationId),eq(warehouseLocations.organizationId,organizationId)'
    );
    expect(source).toContain('if(data.productId!==undefined)');
    expect(source).toContain('where(alertProductWhereCondition(data.productId,ctx.organizationId))');
    expect(source).toContain('where(alertProductWhereCondition(alert.productId,ctx.organizationId))');
    expect(triggeredRead).toContain(
      'where(alertProductWhereCondition(alert.productId,organizationId))'
    );
    expect(source).toContain('if(data.locationId!==undefined)');
    expect(source).toContain('where(alertLocationWhereCondition(data.locationId,ctx.organizationId))');
    expect(source).toContain(
      'where(alertLocationWhereCondition(alert.locationId,ctx.organizationId))'
    );
  });

  it('keeps computed alert product descriptors active and organization-bounded', () => {
    const queryConditions = compact(
      read('src/server/functions/inventory/alert-query-conditions.ts')
    );
    const triggeredRead = compact(read('src/server/functions/inventory/triggered-alerts-read.ts'));

    expect(queryConditions).toContain(
      'exportfunctionalertInventoryProductJoinCondition(organizationId:string)'
    );
    expect(queryConditions).toContain(
      'eq(inventory.productId,products.id),eq(products.organizationId,organizationId),isNull(products.deletedAt)'
    );
    expect(triggeredRead).toContain(
      'innerJoin(products,alertInventoryProductJoinCondition(organizationId))'
    );
    expect(triggeredRead).toContain(
      'leftJoin(warehouseLocations,and(eq(inventory.locationId,warehouseLocations.id),eq(warehouseLocations.organizationId,organizationId)))'
    );
    expect(triggeredRead).toContain(
      'where(eq(inventory.organizationId,organizationId))'
    );
    expect(triggeredRead).toContain('ANDp.organization_id=${organizationId}ANDp.deleted_atISNULL');
    expect(triggeredRead).toContain('ANDm.organization_id=${organizationId}');
  });
});
