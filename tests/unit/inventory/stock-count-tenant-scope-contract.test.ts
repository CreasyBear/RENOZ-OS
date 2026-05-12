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

function sliceBetween(source: string, startMarker: string, endMarker: string): string {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start);
  expect(start).toBeGreaterThanOrEqual(0);
  expect(end).toBeGreaterThan(start);
  return source.slice(start, end);
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

  it('locks the parent count and reads completion items inside the transaction', () => {
    const source = compact(read('src/server/functions/inventory/stock-counts.ts'));

    expect(source).toContain(
      "from(stockCounts).where(and(eq(stockCounts.id,data.id),eq(stockCounts.organizationId,ctx.organizationId))).for('update').limit(1)"
    );
    expect(source).toContain('constitems=awaittx.select().from(stockCountItems)');
    expect(source.indexOf("for('update').limit(1)")).toBeLessThan(
      source.indexOf('constitems=awaittx.select().from(stockCountItems)')
    );
    expect(source).not.toContain('constitems=awaitdb.select().from(stockCountItems)');
  });

  it('locks the parent count before generating the count sheet', () => {
    const source = compact(read('src/server/functions/inventory/stock-counts.ts'));
    const startBlock = sliceBetween(
      source,
      'exportconststartStockCount',
      'exportconstupdateStockCountItem'
    );

    expect(startBlock).toContain('returnawaitdb.transaction(async(tx)=>{');
    expect(startBlock).toContain(
      "from(stockCounts).where(and(eq(stockCounts.id,data.id),eq(stockCounts.organizationId,ctx.organizationId))).for('update').limit(1)"
    );
    expect(startBlock.indexOf("for('update').limit(1)")).toBeLessThan(
      startBlock.indexOf('constinventoryItems=awaittx.select')
    );
    expect(startBlock).not.toContain('const[count]=awaitdb.select()');
  });

  it('keeps stock count planning edits draft-only and lifecycle-owned', () => {
    const source = compact(read('src/server/functions/inventory/stock-counts.ts'));
    const updateBlock = sliceBetween(
      source,
      'exportconstupdateStockCount',
      'exportconststartStockCount'
    );

    expect(updateBlock).toContain('returnawaitdb.transaction(async(tx)=>{');
    expect(updateBlock).toContain(
      "from(stockCounts).where(and(eq(stockCounts.id,id),eq(stockCounts.organizationId,ctx.organizationId))).for('update').limit(1)"
    );
    expect(updateBlock).toContain("if(existing.status!=='draft')");
    expect(updateBlock).toContain("status:['Countmustbeindraftstatus']");
    expect(updateBlock).not.toContain('...(data.status!==undefined&&{status:data.status})');
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

  it('locks the parent count before item count edits', () => {
    const source = compact(read('src/server/functions/inventory/stock-counts.ts'));
    const itemBlock = sliceBetween(
      source,
      'exportconstupdateStockCountItem',
      'exportconstbulkUpdateCountItems'
    );

    expect(itemBlock).toContain('returnawaitdb.transaction(async(tx)=>{');
    expect(itemBlock).toContain(
      "from(stockCounts).where(and(eq(stockCounts.id,countId),eq(stockCounts.organizationId,ctx.organizationId))).for('update').limit(1)"
    );
    expect(itemBlock.indexOf("for('update').limit(1)")).toBeLessThan(
      itemBlock.indexOf('const[item]=awaittx.select().from(stockCountItems)')
    );
    expect(itemBlock).not.toContain('const[count]=awaitdb.select()');
  });

  it('locks the parent count before bulk count item edits', () => {
    const source = compact(read('src/server/functions/inventory/stock-counts.ts'));
    const bulkBlock = sliceBetween(
      source,
      'exportconstbulkUpdateCountItems',
      'exportconstcompleteStockCount'
    );

    expect(bulkBlock).toContain('returnawaitdb.transaction(async(tx)=>{');
    expect(bulkBlock).toContain(
      "from(stockCounts).where(and(eq(stockCounts.id,data.countId),eq(stockCounts.organizationId,ctx.organizationId))).for('update').limit(1)"
    );
    expect(bulkBlock.indexOf("for('update').limit(1)")).toBeLessThan(
      bulkBlock.indexOf('constitemIds=data.items.map')
    );
    expect(bulkBlock).not.toContain('const[count]=awaitdb.select()');
  });

  it('locks the parent count before cancellation status writes', () => {
    const source = compact(read('src/server/functions/inventory/stock-counts.ts'));
    const cancelBlock = sliceBetween(
      source,
      'exportconstcancelStockCount',
      'exportconstgetCountVarianceAnalysis'
    );

    expect(cancelBlock).toContain('returnawaitdb.transaction(async(tx)=>{');
    expect(cancelBlock).toContain(
      "from(stockCounts).where(and(eq(stockCounts.id,data.id),eq(stockCounts.organizationId,ctx.organizationId))).for('update').limit(1)"
    );
    expect(cancelBlock.indexOf("for('update').limit(1)")).toBeLessThan(
      cancelBlock.indexOf('const[cancelledCount]=awaittx.update(stockCounts)')
    );
    expect(cancelBlock).not.toContain('const[count]=awaitdb.select()');
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

  it('locks all counted rows and rejects stale count-sheet snapshots before reconciliation', () => {
    const source = compact(read('src/server/functions/inventory/stock-counts.ts'));

    expect(source).toContain('functionassertStockCountInventorySnapshotFresh');
    expect(source).toContain('constinventoryIds=Array.from(newSet(items.map((item)=>item.inventoryId)))');
    expect(source).toContain('if(items.length>0){');
    expect(source).toContain('if(data.applyAdjustments&&varianceItems.length>0){');
    expect(source).toContain(
      "thrownewConflictError('Inventorychangedsincecountsheetwasgenerated.Refreshandrecountbeforecompleting.')"
    );
    expect(source).toContain(
      "where(and(eq(inventory.organizationId,ctx.organizationId),inArray(inventory.id,inventoryIds))).for('update')"
    );
    expect(source).toContain(
      'assertStockCountInventorySnapshotFresh({currentQuantity:Number(inv.quantityOnHand??0),expectedQuantity:item.expectedQuantity,});'
    );
    expect(source.indexOf('assertStockCountInventorySnapshotFresh({')).toBeLessThan(
      source.indexOf('constnewQuantity=previousQuantity+variance')
    );
    expect(source).not.toContain('if(data.applyAdjustments&&items.length>0)');
    expect(source).not.toContain('constinventoryIds=varianceItems.map((item)=>item.inventoryId)');
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
