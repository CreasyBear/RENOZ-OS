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

describe('inventory finance helper tenant-scope contract', () => {
  it('keeps FIFO layer consumption updates organization-scoped', () => {
    const source = compact(read('src/server/functions/_shared/inventory-finance.ts'));

    expect(source).toContain(
      'where(and(eq(inventoryCostLayers.id,layer.id),eq(inventoryCostLayers.organizationId,params.organizationId))).returning({id:inventoryCostLayers.id})'
    );
    expect(source).not.toContain('.where(eq(inventoryCostLayers.id,layer.id))');
  });

  it('keeps derived inventory value recompute updates organization-scoped', () => {
    const source = compact(read('src/server/functions/_shared/inventory-finance.ts'));

    expect(source).toContain(
      'where(and(eq(inventory.id,params.inventoryId),eq(inventory.organizationId,params.organizationId))).returning({id:inventory.id})'
    );
    expect(source).not.toContain('.where(eq(inventory.id,params.inventoryId))');
  });

  it('guards shared inventory-finance write results before dependent values are used', () => {
    const source = compact(read('src/server/functions/_shared/inventory-finance.ts'));

    expect(source).toContain(
      "if(!updatedLayer[0]){throwcreateInventoryFinanceError('Inventorycostlayercouldnotbeconsumed.Refreshandtryagain.','layer_transfer_mismatch');}"
    );
    expect(source).toContain(
      "if(!newLayer){throwcreateInventoryFinanceError('Inventorycostlayercouldnotbemoved.Refreshandtryagain.','layer_transfer_mismatch');}"
    );
    expect(source).toContain(
      "if(!updatedInventory[0]){throwcreateInventoryFinanceError('Inventoryvaluecouldnotberecomputed.Refreshandtryagain.','inventory_value_drift_detected');}"
    );
    expect(source).toContain(
      "if(!layer){throwcreateInventoryFinanceError('Inventorycostlayercouldnotbecreated.Refreshandtryagain.','landed_cost_allocation_conflict');}"
    );
    expect(source.indexOf("if(!newLayer){throwcreateInventoryFinanceError('Inventorycostlayercouldnotbemoved.Refreshandtryagain.','layer_transfer_mismatch');}")).toBeLessThan(
      source.indexOf('createdLayerIds.push(newLayer.id)')
    );
    expect(source.indexOf("if(!layer){throwcreateInventoryFinanceError('Inventorycostlayercouldnotbecreated.Refreshandtryagain.','landed_cost_allocation_conflict');}")).toBeLessThan(
      source.indexOf('inventoryCostLayerId:layer.id')
    );
  });
});
