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

describe('receive goods tenant-scope contract', () => {
  it('keeps PO receive weighted-cost layer aggregation organization-scoped', () => {
    const source = compact(read('src/server/functions/suppliers/receive-goods.ts'));

    expect(source).toContain(
      'innerJoin(inventory,and(eq(inventoryCostLayers.inventoryId,inventory.id),eq(inventoryCostLayers.organizationId,organizationId)))'
    );
    expect(source).toContain('eq(inventory.productId,productId)');
    expect(source).toContain('eq(inventory.organizationId,organizationId)');
    expect(source).not.toContain(
      'innerJoin(inventory,eq(inventoryCostLayers.inventoryId,inventory.id))'
    );
  });

  it('keeps PO receive product cost-price updates organization-scoped', () => {
    const source = compact(read('src/server/functions/suppliers/receive-goods.ts'));

    expect(source).toContain(
      'update(products).set({costPrice:weightedAvgCost}).where(and(eq(products.id,productId),eq(products.organizationId,organizationId),isNull(products.deletedAt))).returning({id:products.id})'
    );
    expect(source).toContain(
      "if(!updatedProducts[0]){thrownewValidationError('Productcostpricecouldnotbeupdated.Refreshandtryagain.');}"
    );
    expect(source).not.toContain(
      'update(products).set({costPrice:weightedAvgCost}).where(eq(products.id,productId))'
    );
  });

  it('keeps PO receive existing inventory balance updates organization-scoped', () => {
    const source = compact(read('src/server/functions/suppliers/receive-goods.ts'));
    const scopedInventoryUpdates = source.match(
      /where\(and\(eq\(inventory\.id,inventoryId\),eq\(inventory\.organizationId,ctx\.organizationId\)\)\)/g
    );

    expect(scopedInventoryUpdates).toHaveLength(2);
    expect(source).not.toContain('.where(eq(inventory.id,inventoryId))');
  });

  it('keeps PO receive item reads and quantity updates organization-scoped', () => {
    const source = compact(read('src/server/functions/suppliers/receive-goods.ts'));
    const scopedPoItemReads = source.match(
      /where\(and\(eq\(purchaseOrderItems\.purchaseOrderId,data\.purchaseOrderId\),eq\(purchaseOrderItems\.organizationId,ctx\.organizationId\)\)\)/g
    );

    expect(scopedPoItemReads).toHaveLength(2);
    expect(source).toContain(
      'from(purchaseOrderItems).where(and(eq(purchaseOrderItems.purchaseOrderId,data.purchaseOrderId),eq(purchaseOrderItems.organizationId,ctx.organizationId))).orderBy(asc(purchaseOrderItems.lineNumber)).for(\'update\')'
    );
    expect(source).toContain(
      'where(and(eq(purchaseOrderItems.id,receiptItem.poItemId),eq(purchaseOrderItems.organizationId,ctx.organizationId),eq(purchaseOrderItems.purchaseOrderId,data.purchaseOrderId))).returning({id:purchaseOrderItems.id})'
    );
    expect(source).toContain(
      "if(!updatedPoItemRows[0]){thrownewValidationError('Purchaseorderitemquantitiescouldnotbeupdated.Refreshandtryagain.');}"
    );
    expect(source).not.toContain('.where(eq(purchaseOrderItems.id,receiptItem.poItemId))');
    expect(source).not.toContain(
      '.where(eq(purchaseOrderItems.purchaseOrderId,data.purchaseOrderId))'
    );
  });

  it('keeps PO receive order status updates organization-scoped', () => {
    const source = compact(read('src/server/functions/suppliers/receive-goods.ts'));

    expect(source).toContain(
      'update(purchaseOrders).set({status:newStatus,...(allReceived&&{actualDeliveryDate:newDate().toISOString().split(\'T\')[0]}),updatedBy:ctx.user.id,}).where(and(eq(purchaseOrders.id,data.purchaseOrderId),eq(purchaseOrders.organizationId,ctx.organizationId),inArray(purchaseOrders.status,[\'ordered\',\'partial_received\']),isNull(purchaseOrders.deletedAt))).returning({id:purchaseOrders.id})'
    );
    expect(source).toContain(
      "if(!updatedPurchaseOrders[0]){thrownewValidationError('Purchaseorderstatuscouldnotbeupdated.Refreshandtryagain.');}"
    );
    expect(source).not.toContain('.where(eq(purchaseOrders.id,data.purchaseOrderId))');
  });

  it('guards receipt header and line-item insert results before dependent writes', () => {
    const source = compact(read('src/server/functions/suppliers/receive-goods.ts'));

    expect(source).toContain(
      "if(!receipt){thrownewValidationError('Purchaseorderreceiptcouldnotbecreated.Refreshandtryagain.');}"
    );
    expect(source.indexOf("if(!receipt){thrownewValidationError('Purchaseorderreceiptcouldnotbecreated.Refreshandtryagain.');}")).toBeLessThan(
      source.indexOf('constcreatedMovements:string[]=[]')
    );
    expect(source).toContain(
      "if(!createdReceiptItem){thrownewValidationError('Purchaseorderreceiptitemcouldnotbesaved.Refreshandtryagain.');}"
    );
    expect(source.indexOf("if(!createdReceiptItem){thrownewValidationError('Purchaseorderreceiptitemcouldnotbesaved.Refreshandtryagain.');}")).toBeLessThan(
      source.indexOf('purchaseOrderReceiptItemId:createdReceiptItem.id')
    );
  });

  it('guards inventory balance, inventory creation, and movement write results', () => {
    const source = compact(read('src/server/functions/suppliers/receive-goods.ts'));

    expect(
      source.match(
        /if\(!updatedInventory\[0\]\)\{thrownewValidationError\('Inventorybalancecouldnotbeupdated\.Refreshandtryagain\.'\);\}/g
      )
    ).toHaveLength(2);
    expect(
      source.match(
        /if\(!newInv\)\{thrownewValidationError\('Inventoryrecordcouldnotbecreated\.Refreshandtryagain\.'\);\}/g
      )
    ).toHaveLength(2);
    expect(
      source.match(
        /if\(!movement\)\{thrownewValidationError\('Inventorymovementcouldnotberecorded\.Refreshandtryagain\.'\);\}/g
      )
    ).toHaveLength(2);
    expect(source).toContain(
      'update(inventory).set({quantityOnHand:sql`${inventory.quantityOnHand}+1`,unitCost:landedUnitCost,updatedBy:ctx.user.id,}).where(and(eq(inventory.id,inventoryId),eq(inventory.organizationId,ctx.organizationId))).returning({id:inventory.id})'
    );
    expect(source).toContain(
      'update(inventory).set({quantityOnHand:sql`${inventory.quantityOnHand}+${quantityAccepted}`,unitCost:newWeightedAvgCost,updatedBy:ctx.user.id,}).where(and(eq(inventory.id,inventoryId),eq(inventory.organizationId,ctx.organizationId))).returning({id:inventory.id})'
    );
  });

  it('keeps receipt history item reads and PO item joins organization-scoped', () => {
    const source = compact(read('src/server/functions/suppliers/receive-goods.ts'));

    expect(source).toContain(
      'leftJoin(purchaseOrderItems,and(eq(purchaseOrderReceiptItems.purchaseOrderItemId,purchaseOrderItems.id),eq(purchaseOrderItems.organizationId,ctx.organizationId)))'
    );
    expect(source).toContain(
      'where(and(inArray(purchaseOrderReceiptItems.receiptId,receiptIds),eq(purchaseOrderReceiptItems.organizationId,ctx.organizationId)))'
    );
    expect(source).not.toContain(
      'leftJoin(purchaseOrderItems,eq(purchaseOrderReceiptItems.purchaseOrderItemId,purchaseOrderItems.id))'
    );
    expect(source).not.toContain(
      '.where(inArray(purchaseOrderReceiptItems.receiptId,receiptIds))'
    );
  });
});
