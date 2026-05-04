import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

describe('inventory valuation permission contract', () => {
  it('requires explicit inventory permissions on valuation server functions', () => {
    const source = read('src/server/functions/inventory/valuation.ts');

    expect(source).not.toContain('withAuth();');
    expect(source).toContain('const ctx = await withAuth({ permission: PERMISSIONS.inventory.read });');
    expect(source).toContain('const ctx = await withAuth({ permission: PERMISSIONS.inventory.manage });');
  });

  it('keeps read and mutation valuation paths distinct', () => {
    const source = read('src/server/functions/inventory/valuation.ts');
    const readPermissionCount = (
      source.match(/withAuth\(\{ permission: PERMISSIONS\.inventory\.read \}\)/g) ?? []
    ).length;
    const managePermissionCount = (
      source.match(/withAuth\(\{ permission: PERMISSIONS\.inventory\.manage \}\)/g) ?? []
    ).length;

    expect(readPermissionCount).toBe(8);
    expect(managePermissionCount).toBe(3);
    expect(source).toContain('export const reconcileInventoryFinanceIntegrity');
    expect(source).toContain('export const updateProductWeightedAverageCost');
  });
});
