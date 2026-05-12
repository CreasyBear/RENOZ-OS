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

describe('inventory stock mutation tenant-scope contract', () => {
  it('keeps adjustment final inventory and serialized lineage writes organization-scoped', () => {
    const source = compact(read('src/server/functions/inventory/adjustments.ts'));

    expect(source).toContain('withAuth({permission:PERMISSIONS.inventory.adjust})');
    expect(source).toContain(
      'select({id:products.id,isSerialized:products.isSerialized,status:products.status,isActive:products.isActive,trackInventory:products.trackInventory,}).from(products).where(and(eq(products.id,data.productId),eq(products.organizationId,ctx.organizationId),isNull(products.deletedAt))).for(\'update\')'
    );
    expect(source).toContain(
      "if(!canCreateOrIncreaseStock&&(data.adjustmentQty>0||!inventoryRecord)){thrownewValidationError('Productisnotavailableforstockincreases',{productId:['Onlyactiveinventory-trackedproductscancreateorincreasestock'],code:['product_not_adjustable_in'],});}"
    );
    expect(source).toContain("sql`SELECTset_config('app.organization_id',${ctx.organizationId},false)`");
    expect(source).toContain(
      'where(and(eq(inventory.id,inventoryRecord.id),eq(inventory.organizationId,ctx.organizationId)))'
    );
    expect(source).toContain(
      'where(and(eq(serializedItems.id,serializedItem.id),eq(serializedItems.organizationId,ctx.organizationId)))'
    );
    expect(source).not.toContain('.where(eq(inventory.id,inventoryRecord.id))');
    expect(source).not.toContain('.where(eq(serializedItems.id,serializedItem.id))');
  });

  it('locks adjustment product availability before inventory writes', () => {
    const source = compact(read('src/server/functions/inventory/adjustments.ts'));
    const adjustBlock = sliceBetween(source, 'exportconstadjustInventory', '});});');

    expect(adjustBlock).toContain('returnawaitdb.transaction(async(tx)=>{');
    expect(adjustBlock).toContain(
      "from(products).where(and(eq(products.id,data.productId),eq(products.organizationId,ctx.organizationId),isNull(products.deletedAt))).for('update').limit(1)"
    );
    expect(adjustBlock.indexOf("for('update').limit(1)")).toBeLessThan(
      adjustBlock.indexOf('let[inventoryRecord]=awaittx')
    );
    expect(adjustBlock).not.toContain('const[product]=awaitdb.select()');
  });

  it('keeps allocation and deallocation final inventory writes organization-scoped', () => {
    const source = compact(read('src/server/functions/inventory/allocations.ts'));

    expect(source).toContain('withAuth({permission:PERMISSIONS.inventory.allocate})');
    expect(source).toContain("sql`SELECTset_config('app.organization_id',${ctx.organizationId},false)`");
    expect(source).toContain(
      'where(and(eq(inventory.id,data.inventoryId),eq(inventory.organizationId,ctx.organizationId)))'
    );
    expect(source).not.toContain('.where(eq(inventory.id,data.inventoryId))');
  });

  it('requires allocation writes to use allocatable inventory rows', () => {
    const source = compact(read('src/server/functions/inventory/allocations.ts'));
    const allocateBlock = sliceBetween(source, 'exportconstallocateInventory', 'exportconstdeallocateInventory');

    expect(allocateBlock).toContain("if(item.status!=='available')");
    expect(allocateBlock).toContain(
      "thrownewValidationError('Inventoryitemisnotavailableforallocation',{status:['Onlyavailableinventorycanbeallocated'],code:['inventory_not_allocatable'],});"
    );
    expect(allocateBlock.indexOf("if(item.status!=='available')")).toBeLessThan(
      allocateBlock.indexOf('if((item.quantityAvailable??0)<data.quantity)')
    );
  });

  it('keeps manual receive final inventory writes organization-scoped', () => {
    const source = compact(read('src/server/functions/inventory/receiving.ts'));

    expect(source).toContain('withAuth({permission:PERMISSIONS.inventory.receive})');
    expect(source).toContain(
      'select({id:products.id,isSerialized:products.isSerialized,status:products.status,isActive:products.isActive,trackInventory:products.trackInventory,}).from(products).where(and(eq(products.id,data.productId),eq(products.organizationId,ctx.organizationId),isNull(products.deletedAt))).for(\'update\')'
    );
    expect(source).toContain(
      "if(product.status!=='active'||!product.isActive||!product.trackInventory){thrownewValidationError('Productisnotavailableformanualreceiving',{productId:['Selectanactiveinventory-trackedproduct'],code:['product_not_receivable'],});}"
    );
    expect(source).toContain("sql`SELECTset_config('app.organization_id',${ctx.organizationId},false)`");
    expect(source).toContain(
      'where(and(eq(inventory.id,inventoryRecord.id),eq(inventory.organizationId,ctx.organizationId)))'
    );
    expect(source).not.toContain('.where(eq(inventory.id,inventoryRecord.id))');
  });

  it('locks manual receive product availability before stock-in writes', () => {
    const source = compact(read('src/server/functions/inventory/receiving.ts'));
    const receiveBlock = sliceBetween(source, 'exportconstreceiveInventory', '});});');

    expect(receiveBlock).toContain('returnawaitdb.transaction(async(tx)=>{');
    expect(receiveBlock).toContain(
      "from(products).where(and(eq(products.id,data.productId),eq(products.organizationId,ctx.organizationId),isNull(products.deletedAt))).for('update').limit(1)"
    );
    expect(receiveBlock.indexOf("for('update').limit(1)")).toBeLessThan(
      receiveBlock.indexOf('let[inventoryRecord]=awaittx')
    );
    expect(receiveBlock.indexOf('getManualReceiveSerializationIssues({')).toBeLessThan(
      receiveBlock.indexOf('let[inventoryRecord]=awaittx')
    );
    expect(receiveBlock).not.toContain('const[product]=awaitdb.select()');
  });

  it('keeps manual receive cost-layer response reads organization-scoped', () => {
    const source = compact(read('src/server/functions/inventory/receiving.ts'));

    expect(source).toContain(
      'where(and(eq(inventoryCostLayers.id,costLayerId),eq(inventoryCostLayers.organizationId,ctx.organizationId)))'
    );
    expect(source).not.toContain('.where(eq(inventoryCostLayers.id,costLayerId))');
  });

  it('preserves inventory finance and serialized-lineage continuity references', () => {
    const adjustmentSource = read('src/server/functions/inventory/adjustments.ts');
    const receivingSource = read('src/server/functions/inventory/receiving.ts');
    const allocationSource = read('src/server/functions/inventory/allocations.ts');

    expect(adjustmentSource).toContain('consumeLayersFIFO');
    expect(adjustmentSource).toContain('createReceiptLayersWithCostComponents');
    expect(adjustmentSource).toContain('recomputeInventoryValueFromLayers');
    expect(adjustmentSource).toContain('assertSerializedInventoryCostIntegrity');
    expect(receivingSource).toContain('createReceiptLayersWithCostComponents');
    expect(receivingSource).toContain('recomputeInventoryValueFromLayers');
    expect(allocationSource).toContain('upsertSerializedItemForInventory');
    expect(allocationSource).toContain('addSerializedItemEvent');
    expect(adjustmentSource).toContain('inventoryFinanceMutationSuccess');
    expect(receivingSource).toContain('inventoryFinanceMutationSuccess');
  });
});
