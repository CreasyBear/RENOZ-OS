import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

describe('inventory location permission contract', () => {
  it('requires explicit inventory permissions on location server functions', () => {
    const source = read('src/server/functions/inventory/locations.ts');

    expect(source).not.toContain('withAuth();');
    expect(source).toContain('const ctx = await withAuth({ permission: PERMISSIONS.inventory.read });');
    expect(source).toContain('const ctx = await withAuth({ permission: PERMISSIONS.inventory.manage });');
  });

  it('keeps location reads and location mutations distinct', () => {
    const source = read('src/server/functions/inventory/locations.ts');
    const readPermissionCount = (
      source.match(/withAuth\(\{ permission: PERMISSIONS\.inventory\.read \}\)/g) ?? []
    ).length;
    const managePermissionCount = (
      source.match(/withAuth\(\{ permission: PERMISSIONS\.inventory\.manage \}\)/g) ?? []
    ).length;

    expect(readPermissionCount).toBe(6);
    expect(managePermissionCount).toBe(7);
    expect(source).toContain('export const getLocationUtilization');
    expect(source).toContain('export const bulkCreateLocations');
  });

  it('keeps location detail and utilization inventory joins organization-scoped', () => {
    const source = read('src/server/functions/inventory/locations.ts');

    expect(source).toContain('eq(products.organizationId, ctx.organizationId)');
    expect(source).toContain('eq(inventory.organizationId, ctx.organizationId)');
    expect(source).toContain('leftJoin(');
  });
});
