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
    expect(source).toContain(
      "if(!data.inventoryId&&matchingInventoryRows.length>1){thrownewValidationError('Adjustmentrequiresaspecificinventoryrow',{inventoryId:['Opentheinventorybrowserandadjustthespecificstockrow'],code:['ambiguous_adjustment_source'],});}"
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
      adjustBlock.indexOf('constmatchingInventoryRows=awaittx')
    );
    expect(adjustBlock).not.toContain('const[product]=awaitdb.select()');
  });

  it('rejects ambiguous product-location adjustment sources before writing inventory', () => {
    const source = compact(read('src/server/functions/inventory/adjustments.ts'));
    const adjustBlock = sliceBetween(source, 'exportconstadjustInventory', '});});');

    expect(adjustBlock).toContain('.limit(data.inventoryId?1:2);');
    expect(adjustBlock).toContain(
      "if(!data.inventoryId&&matchingInventoryRows.length>1){thrownewValidationError('Adjustmentrequiresaspecificinventoryrow',{inventoryId:['Opentheinventorybrowserandadjustthespecificstockrow'],code:['ambiguous_adjustment_source'],});}"
    );
    expect(adjustBlock.indexOf('matchingInventoryRows.length>1')).toBeLessThan(
      adjustBlock.indexOf('if(!inventoryRecord){')
    );
    expect(adjustBlock.indexOf('matchingInventoryRows.length>1')).toBeLessThan(
      adjustBlock.indexOf('.update(inventory)')
    );
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

  it('preserves inventory status semantics when releasing allocations', () => {
    const source = compact(read('src/server/functions/inventory/allocations.ts'));
    const deallocateBlock = sliceBetween(source, 'exportconstdeallocateInventory', '});});');

    expect(source).toContain('functionresolveDeallocatedInventoryStatus(');
    expect(source).toContain("if(currentStatus==='allocated'){returnnewAllocated>0?'allocated':'available';}");
    expect(source).toContain('returncurrentStatus;');
    expect(source).toContain('functionresolveDeallocatedSerializedStatus(');
    expect(source).toContain("if(currentStatus==='quarantined'||currentStatus==='returned'){returncurrentStatus;}");
    expect(source).toContain("if(currentStatus==='damaged'){return'scrapped';}");
    expect(deallocateBlock).toContain('constnextStatus=resolveDeallocatedInventoryStatus(item.status,newAllocated);');
    expect(deallocateBlock).toContain('status:nextStatus');
    expect(deallocateBlock).toContain('constnextSerializedStatus=resolveDeallocatedSerializedStatus(item.status,newAllocated);');
    expect(deallocateBlock).toContain('status:nextSerializedStatus');
    expect(deallocateBlock).toContain("if(newAllocated===0&&nextSerializedStatus!=='available')");
    expect(deallocateBlock).not.toContain("status:newAllocated>0?'allocated':'available'");
  });

  it('blocks bulk status disposition changes while inventory is allocated', () => {
    const source = compact(read('src/server/functions/inventory/status-updates.ts'));
    const statusBlock = sliceBetween(source, 'exportconstbulkUpdateStatus', '});});');

    expect(source).toContain("constoperatorDispositionStatuses=['available','damaged','returned','quarantined',]asconstsatisfiesreadonlyOperatorDispositionStatus[];");
    expect(statusBlock).toContain(
      "if(!isOperatorDispositionStatus(data.status)){thrownewValidationError('Bulkstatuschangescannotsetworkflow-ownedstatuses',{status:['Useallocationorfulfillmentworkflowsforallocatedorsoldinventory'],code:['workflow_owned_inventory_status'],});}"
    );
    expect(statusBlock).toContain('consttargetStatus=data.status;');
    expect(statusBlock).toContain('consttargetItems=awaittx.select({id:inventory.id,quantityAllocated:inventory.quantityAllocated,})');
    expect(statusBlock).toContain(".from(inventory).where(and(eq(inventory.organizationId,ctx.organizationId),inArray(inventory.id,data.inventoryIds))).for('update')");
    expect(statusBlock).toContain('Number(item.quantityAllocated??0)>0');
    expect(statusBlock).toContain('if(allocatedItems.length>0)');
    expect(statusBlock).toContain(
      "thrownewValidationError('Cannotchangestatusforallocatedinventory',{inventoryIds:['Releaseallocationsbeforechanginginventorystatus'],code:['allocated_inventory_status_change'],});"
    );
    expect(statusBlock).toContain('consttargetItemIds=targetItems.map((item)=>item.id);');
    expect(statusBlock).toContain('inArray(inventory.id,targetItemIds)');
    expect(statusBlock).not.toContain("data.status!=='allocated'");
    expect(statusBlock).not.toContain('inArray(inventory.id,data.inventoryIds)).returning()');
  });

  it('keeps bulk status updates aligned with serialized lineage', () => {
    const source = compact(read('src/server/functions/inventory/status-updates.ts'));
    const statusBlock = sliceBetween(source, 'exportconstbulkUpdateStatus', '});});');

    expect(source).toContain('functionmapInventoryStatusToSerializedStatus(status:OperatorDispositionStatus):SerializedStatus');
    expect(source).not.toContain("if(status==='sold')return'shipped';");
    expect(source).toContain("if(status==='damaged')return'scrapped';");
    expect(source).toContain("if(status==='returned'||status==='quarantined')returnstatus;");
    expect(source).toContain("import{addSerializedItemEvent,upsertSerializedItemForInventory,}from'@/server/functions/_shared/serialized-lineage';");
    expect(statusBlock).toContain('constserializedStatus=mapInventoryStatusToSerializedStatus(targetStatus);');
    expect(statusBlock).toContain('if(!item.serialNumber){continue;}');
    expect(statusBlock).toContain(
      'constserializedItemId=awaitupsertSerializedItemForInventory(tx,{organizationId:ctx.organizationId,productId:item.productId,serialNumber:item.serialNumber,inventoryId:item.id,status:serializedStatus,userId:ctx.user.id,});'
    );
    expect(statusBlock).toContain("eventType:'status_changed'");
    expect(statusBlock).toContain("entityType:'inventory'");
    expect(statusBlock).toContain('entityId:item.id');
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
