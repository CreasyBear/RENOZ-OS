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
  it('keeps single-order lifecycle writes organization-scoped', () => {
    const source = compact(read('src/server/functions/suppliers/purchase-orders.ts'));

    for (const functionName of [
      'deletePurchaseOrder',
      'submitForApproval',
      'approvePurchaseOrder',
      'rejectPurchaseOrder',
      'markAsOrdered',
      'cancelPurchaseOrder',
      'closePurchaseOrder',
    ]) {
      const writeBlock = firstPurchaseOrderWriteBlock(exportedFunctionBlock(source, functionName));

      expect(writeBlock).toContain(
        'where(and(eq(purchaseOrders.id,data.id),eq(purchaseOrders.organizationId,ctx.organizationId)))'
      );
      expect(writeBlock).not.toContain('.where(eq(purchaseOrders.id,data.id))');
    }
  });

  it('keeps bulk-delete lifecycle writes organization-scoped', () => {
    const source = compact(read('src/server/functions/suppliers/purchase-orders.ts'));
    const writeBlock = firstPurchaseOrderWriteBlock(
      exportedFunctionBlock(source, 'bulkDeletePurchaseOrders')
    );

    expect(writeBlock).toContain(
      'where(and(eq(purchaseOrders.id,id),eq(purchaseOrders.organizationId,ctx.organizationId)))'
    );
    expect(writeBlock).not.toContain('.where(eq(purchaseOrders.id,id))');
  });
});
