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

function firstPurchaseOrderWriteBlock(functionBlock: string): string {
  const start = functionBlock.indexOf('update(purchaseOrders)');
  expect(start, 'purchase order write should exist').toBeGreaterThanOrEqual(0);

  const end = functionBlock.indexOf('.returning', start);
  return end === -1 ? functionBlock.slice(start) : functionBlock.slice(start, end);
}

describe('purchase order lifecycle tenant-scope contract', () => {
  it('keeps single-order lifecycle writes scoped to organization and expected state', () => {
    const source = compact(read('src/server/functions/suppliers/purchase-orders.ts'));

    const cases = [
      ['deletePurchaseOrder', "eq(purchaseOrders.status,'draft')"],
      ['submitForApproval', "eq(purchaseOrders.status,'draft')"],
      ['approvePurchaseOrder', "eq(purchaseOrders.status,'pending_approval')"],
      ['rejectPurchaseOrder', "eq(purchaseOrders.status,'pending_approval')"],
      ['markAsOrdered', "eq(purchaseOrders.status,'approved')"],
      [
        'cancelPurchaseOrder',
        "not(inArray(purchaseOrders.status,['received','closed','cancelled']))",
      ],
      [
        'closePurchaseOrder',
        "inArray(purchaseOrders.status,['received','partial_received','ordered'])",
      ],
    ] as const;

    for (const [functionName, statePredicate] of cases) {
      const writeBlock = firstPurchaseOrderWriteBlock(exportedFunctionBlock(source, functionName));

      expect(writeBlock).toContain('eq(purchaseOrders.id,data.id)');
      expect(writeBlock).toContain('eq(purchaseOrders.organizationId,ctx.organizationId)');
      expect(writeBlock).toContain(statePredicate);
      expect(writeBlock).toContain('isNull(purchaseOrders.deletedAt)');
      expect(writeBlock).toContain(
        `where(and(eq(purchaseOrders.id,data.id),eq(purchaseOrders.organizationId,ctx.organizationId),${statePredicate},isNull(purchaseOrders.deletedAt)))`
      );
      expect(writeBlock).not.toContain('.where(eq(purchaseOrders.id,data.id))');
    }
  });

  it('keeps bulk-delete lifecycle writes scoped to organization and draft state', () => {
    const source = compact(read('src/server/functions/suppliers/purchase-orders.ts'));
    const writeBlock = firstPurchaseOrderWriteBlock(
      exportedFunctionBlock(source, 'bulkDeletePurchaseOrders')
    );

    expect(writeBlock).toContain('eq(purchaseOrders.id,id)');
    expect(writeBlock).toContain('eq(purchaseOrders.organizationId,ctx.organizationId)');
    expect(writeBlock).toContain("eq(purchaseOrders.status,'draft')");
    expect(writeBlock).toContain('isNull(purchaseOrders.deletedAt)');
    expect(writeBlock).toContain(
      "where(and(eq(purchaseOrders.id,id),eq(purchaseOrders.organizationId,ctx.organizationId),eq(purchaseOrders.status,'draft'),isNull(purchaseOrders.deletedAt)))"
    );
    expect(writeBlock).not.toContain('.where(eq(purchaseOrders.id,id))');
  });
});
