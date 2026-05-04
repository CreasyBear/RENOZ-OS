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

describe('purchase order line-item totals tenant-scope contract', () => {
  it('keeps line-number selection and total recalculation organization-scoped', () => {
    const source = compact(read('src/server/functions/suppliers/purchase-orders.ts'));

    expect(source).toContain(
      'where(and(eq(purchaseOrderItems.purchaseOrderId,data.purchaseOrderId),eq(purchaseOrderItems.organizationId,ctx.organizationId)))'
    );
    expect(source).toContain(
      'awaitrecalculatePurchaseOrderTotals(data.purchaseOrderId,ctx.organizationId,ctx.user.id,tx)'
    );
    expect(source).toContain(
      'awaitrecalculatePurchaseOrderTotals(item.purchaseOrderId,ctx.organizationId,ctx.user.id,tx)'
    );
    expect(source).toContain(
      'asyncfunctionrecalculatePurchaseOrderTotals(purchaseOrderId:string,organizationId:string,userId:string,executor:PoTotalsExecutor=db)'
    );
    expect(source).toContain(
      'where(and(eq(purchaseOrderItems.purchaseOrderId,purchaseOrderId),eq(purchaseOrderItems.organizationId,organizationId)))'
    );
    expect(source).toContain(
      'where(and(eq(purchaseOrders.id,purchaseOrderId),eq(purchaseOrders.organizationId,organizationId)))'
    );
    expect(source).not.toContain('.where(eq(purchaseOrderItems.purchaseOrderId,data.purchaseOrderId))');
    expect(source).not.toContain('.where(eq(purchaseOrderItems.purchaseOrderId,purchaseOrderId))');
    expect(source).not.toContain('.where(eq(purchaseOrders.id,purchaseOrderId))');
  });
});
