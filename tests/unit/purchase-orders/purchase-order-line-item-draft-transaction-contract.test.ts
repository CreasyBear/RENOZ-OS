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

function exportedFunctionBlock(source: string, functionName: string): string {
  const start = source.indexOf(`exportconst${functionName}=`);
  expect(start, `${functionName} export should exist`).toBeGreaterThanOrEqual(0);

  const nextExport = source.indexOf('exportconst', start + `exportconst${functionName}=`.length);
  return nextExport === -1 ? source.slice(start) : source.slice(start, nextExport);
}

describe('purchase order line-item draft transaction contract', () => {
  it('locks and rechecks the draft purchase order before inserting line items', () => {
    const source = compact(read('src/server/functions/suppliers/purchase-orders.ts'));
    const block = exportedFunctionBlock(source, 'addPurchaseOrderItem');

    expect(block).toContain(
      "select({id:purchaseOrders.id}).from(purchaseOrders).where(and(eq(purchaseOrders.id,data.purchaseOrderId),eq(purchaseOrders.organizationId,ctx.organizationId),eq(purchaseOrders.status,'draft'),isNull(purchaseOrders.deletedAt))).limit(1).for('update')"
    );
    expect(block.indexOf("select({id:purchaseOrders.id}).from(purchaseOrders)")).toBeLessThan(
      block.indexOf('insert(purchaseOrderItems)')
    );
    expect(block).toContain(
      "if(!item){thrownewValidationError('Purchaseorderitemcouldnotbesaved.Refreshandtryagain.');}"
    );
    expect(block).toContain(
      'awaitassertLinkedPurchaseOrderProductsActive(tx,ctx.organizationId,[data.item.productId]);'
    );
    expect(block.indexOf('awaitassertLinkedPurchaseOrderProductsActive')).toBeLessThan(
      block.indexOf('insert(purchaseOrderItems)')
    );
    expect(block.indexOf('if(!item){thrownewValidationError(')).toBeLessThan(
      block.indexOf('awaitrecalculatePurchaseOrderTotals')
    );
  });

  it('locks and rechecks the draft purchase order before deleting line items', () => {
    const source = compact(read('src/server/functions/suppliers/purchase-orders.ts'));
    const block = exportedFunctionBlock(source, 'removePurchaseOrderItem');

    expect(block).toContain(
      "select({id:purchaseOrders.id}).from(purchaseOrders).where(and(eq(purchaseOrders.id,item.purchaseOrderId),eq(purchaseOrders.organizationId,ctx.organizationId),eq(purchaseOrders.status,'draft'),isNull(purchaseOrders.deletedAt))).limit(1).for('update')"
    );
    expect(block.indexOf("select({id:purchaseOrders.id}).from(purchaseOrders)")).toBeLessThan(
      block.indexOf('delete(purchaseOrderItems)')
    );
    expect(block).toContain(
      'where(and(eq(purchaseOrderItems.id,data.itemId),eq(purchaseOrderItems.purchaseOrderId,item.purchaseOrderId),eq(purchaseOrderItems.organizationId,ctx.organizationId)))'
    );
  });
});
