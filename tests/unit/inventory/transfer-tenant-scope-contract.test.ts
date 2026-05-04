import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

describe('inventory transfer tenant-scope contract', () => {
  it('keeps transfer authorization and transaction tenant-scoped', () => {
    const source = read('src/server/functions/inventory/transfers.ts');

    expect(source).toContain(
      'const ctx = await withAuth({ permission: PERMISSIONS.inventory.transfer });'
    );
    expect(source).toContain(
      "sql`SELECT set_config('app.organization_id', ${ctx.organizationId}, false)`"
    );
    expect(source).toContain('eq(products.organizationId, ctx.organizationId)');
  });

  it('keeps transfer inventory reads and final updates organization-scoped', () => {
    const source = read('src/server/functions/inventory/transfers.ts');

    expect(source).toContain('eq(inventory.organizationId, ctx.organizationId)');
    expect(source).toContain(
      'where(and(eq(inventory.id, row.id), eq(inventory.organizationId, ctx.organizationId)))'
    );
    expect(source).toContain(
      'and(eq(inventory.id, destRow.id), eq(inventory.organizationId, ctx.organizationId))'
    );
    expect(source).toContain('eq(inventory.id, sourceInventory.id)');
    expect(source).toContain('eq(inventory.id, destInventory.id)');
  });

  it('preserves transfer finance and serialized-lineage continuity contracts', () => {
    const source = read('src/server/functions/inventory/transfers.ts');

    expect(source).toContain('moveLayersBetweenInventory');
    expect(source).toContain('recomputeInventoryValueFromLayers');
    expect(source).toContain('assertSerializedInventoryCostIntegrity');
    expect(source).toContain('upsertSerializedItemForInventory');
    expect(source).toContain('addSerializedItemEvent');
    expect(source).toContain('inventoryFinanceMutationSuccess');
  });
});
