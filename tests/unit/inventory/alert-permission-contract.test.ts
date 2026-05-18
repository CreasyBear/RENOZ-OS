import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

describe('inventory alert permission contract', () => {
  it('requires explicit inventory permissions on alert server functions', () => {
    const source = read('src/server/functions/inventory/alerts.ts');

    expect(source).not.toContain('withAuth();');
    expect(source).toContain('const ctx = await withAuth({ permission: PERMISSIONS.inventory.read });');
    expect(source).toContain('const ctx = await withAuth({ permission: PERMISSIONS.inventory.manage });');
  });

  it('keeps alert reads and alert mutations distinct', () => {
    const source = read('src/server/functions/inventory/alerts.ts');
    const readPermissionCount = (
      source.match(/withAuth\(\{ permission: PERMISSIONS\.inventory\.read \}\)/g) ?? []
    ).length;
    const managePermissionCount = (
      source.match(/withAuth\(\{ permission: PERMISSIONS\.inventory\.manage \}\)/g) ?? []
    ).length;

    expect(readPermissionCount).toBe(4);
    expect(managePermissionCount).toBe(5);
    expect(source).toContain('export const acknowledgeAlert');
    expect(source).toContain('export const checkAndTriggerAlerts');
  });

  it('keeps alert detail product and location reads organization-scoped', () => {
    const source = read('src/server/functions/inventory/alerts.ts');
    const queryConditions = read('src/server/functions/inventory/alert-query-conditions.ts');
    const triggeredRead = read('src/server/functions/inventory/triggered-alerts-read.ts');

    expect(queryConditions).toContain(
      'export function alertProductWhereCondition(productId: string, organizationId: string)'
    );
    expect(queryConditions).toContain(
      'export function alertLocationWhereCondition(locationId: string, organizationId: string)'
    );
    expect(queryConditions).toContain('eq(products.organizationId, organizationId)');
    expect(queryConditions).toContain('eq(warehouseLocations.organizationId, organizationId)');
    expect(source).toContain('alertLocationWhereCondition(alert.locationId, ctx.organizationId)');
    expect(source).toContain('alertProductWhereCondition(alert.productId, ctx.organizationId)');
    expect(triggeredRead).toContain('alertProductWhereCondition(alert.productId, organizationId)');
  });
});
