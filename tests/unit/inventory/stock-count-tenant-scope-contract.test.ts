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

describe('inventory stock count tenant-scope contract', () => {
  it('keeps stock count parent mutations organization-scoped', () => {
    const source = compact(read('src/server/functions/inventory/stock-counts.ts'));

    expect(source).toContain('withAuth({permission:PERMISSIONS.inventory.count})');
    expect(source).toContain("sql`SELECTset_config('app.organization_id',${ctx.organizationId},false)`");
    expect(source).toContain(
      'where(and(eq(stockCounts.id,id),eq(stockCounts.organizationId,ctx.organizationId)))'
    );
    expect(source).toContain(
      'where(and(eq(stockCounts.id,data.id),eq(stockCounts.organizationId,ctx.organizationId)))'
    );
    expect(source).not.toContain('.where(eq(stockCounts.id,id))');
    expect(source).not.toContain('.where(eq(stockCounts.id,data.id))');
  });

  it('validates stock count location updates inside the organization boundary', () => {
    const source = compact(read('src/server/functions/inventory/stock-counts.ts'));

    expect(source).toContain('if(data.locationId!==undefined)');
    expect(source).toContain('eq(warehouseLocations.id,data.locationId)');
    expect(source).toContain('eq(warehouseLocations.organizationId,ctx.organizationId)');
    expect(source).toContain("thrownewNotFoundError('Locationnotfound','warehouseLocation')");
  });

  it('keeps count item writes anchored to their parent count', () => {
    const source = compact(read('src/server/functions/inventory/stock-counts.ts'));

    expect(source).toContain(
      'where(and(eq(stockCountItems.id,itemId),eq(stockCountItems.stockCountId,countId)))'
    );
    expect(source).toContain('eq(stockCountItems.stockCountId,data.countId)');
    expect(source).not.toContain('.where(eq(stockCountItems.id,itemId))');
  });

  it('keeps reconciliation inventory and serialized lineage writes organization-scoped', () => {
    const source = compact(read('src/server/functions/inventory/stock-counts.ts'));

    expect(source).toContain(
      'where(and(eq(inventory.id,inv.id),eq(inventory.organizationId,ctx.organizationId)))'
    );
    expect(source).toContain(
      'where(and(eq(serializedItems.id,serializedItem.id),eq(serializedItems.organizationId,ctx.organizationId)))'
    );
    expect(source).not.toContain('.where(eq(inventory.id,inv.id))');
    expect(source).not.toContain('.where(eq(serializedItems.id,serializedItem.id))');
  });

  it('keeps stock count read product descriptors active and organization-bounded', () => {
    const source = compact(read('src/server/functions/inventory/stock-counts.ts'));

    expect(source).toContain('functionstockCountProductJoinCondition(organizationId:string)');
    expect(source).toContain(
      'eq(inventory.productId,products.id),eq(products.organizationId,organizationId),isNull(products.deletedAt)'
    );
    expect(source).toContain(
      'leftJoin(inventory,and(eq(stockCountItems.inventoryId,inventory.id),eq(inventory.organizationId,ctx.organizationId)))'
    );
    expect(source).toContain(
      'leftJoin(products,stockCountProductJoinCondition(ctx.organizationId))'
    );
    expect(source).toContain(
      'leftJoin(warehouseLocations,and(eq(inventory.locationId,warehouseLocations.id),eq(warehouseLocations.organizationId,ctx.organizationId)))'
    );
    expect(source).toContain(
      'innerJoin(inventory,and(eq(stockCountItems.inventoryId,inventory.id),eq(inventory.organizationId,ctx.organizationId)))'
    );
    expect(source).toContain(
      'innerJoin(products,stockCountProductJoinCondition(ctx.organizationId))'
    );
  });

  it('preserves stock count finance and serialized-lineage continuity references', () => {
    const source = read('src/server/functions/inventory/stock-counts.ts');

    expect(source).toContain('consumeLayersFIFO');
    expect(source).toContain('createReceiptLayersWithCostComponents');
    expect(source).toContain('recomputeInventoryValueFromLayers');
    expect(source).toContain('assertSerializedInventoryCostIntegrity');
    expect(source).toContain('upsertSerializedItemForInventory');
    expect(source).toContain('addSerializedItemEvent');
    expect(source).toContain('inventoryFinanceMutationSuccess');
  });
});
