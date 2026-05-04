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

  it('validates changed alert product and location ownership', () => {
    const source = compact(read('src/server/functions/inventory/alerts.ts'));

    expect(source).toContain('if(data.productId!==undefined)');
    expect(source).toContain('eq(products.id,data.productId)');
    expect(source).toContain('eq(products.organizationId,ctx.organizationId)');
    expect(source).toContain('if(data.locationId!==undefined)');
    expect(source).toContain('eq(warehouseLocations.id,data.locationId)');
    expect(source).toContain('eq(warehouseLocations.organizationId,ctx.organizationId)');
  });

  it('keeps computed alert joins inside the organization boundary', () => {
    const source = compact(read('src/server/functions/inventory/alerts.ts'));

    expect(source).toContain(
      'innerJoin(products,and(eq(inventory.productId,products.id),eq(products.organizationId,ctx.organizationId)))'
    );
    expect(source).toContain(
      'leftJoin(warehouseLocations,and(eq(inventory.locationId,warehouseLocations.id),eq(warehouseLocations.organizationId,ctx.organizationId)))'
    );
    expect(source).toContain(
      'innerJoin(products,and(eq(inventory.productId,products.id),eq(products.organizationId,organizationId)))'
    );
    expect(source).toContain(
      'leftJoin(warehouseLocations,and(eq(inventory.locationId,warehouseLocations.id),eq(warehouseLocations.organizationId,organizationId)))'
    );
    expect(source).toContain('ANDp.organization_id=${organizationId}');
    expect(source).toContain('ANDm.organization_id=${organizationId}');
  });
});
