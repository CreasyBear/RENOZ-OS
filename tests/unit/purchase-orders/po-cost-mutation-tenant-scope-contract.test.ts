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

describe('purchase order cost mutation tenant-scope contract', () => {
  it('keeps cost update reads and writes organization-scoped with parent closeout guards', () => {
    const source = compact(read('src/server/functions/suppliers/po-costs.ts'));
    const updateBlock = exportedFunctionBlock(source, 'updatePurchaseOrderCost');

    expect(updateBlock).toContain(
      'innerJoin(purchaseOrders,and(eq(purchaseOrderCosts.purchaseOrderId,purchaseOrders.id),eq(purchaseOrders.organizationId,ctx.organizationId),isNull(purchaseOrders.deletedAt)))'
    );
    expect(updateBlock).toContain(
      'where(and(eq(purchaseOrderCosts.id,costId),eq(purchaseOrderCosts.organizationId,ctx.organizationId)))'
    );
    expect(updateBlock).toContain(
      "if(['cancelled','closed'].includes(existing.poStatus)){thrownewValidationError('Cannotupdatecostsforacancelledorclosedpurchaseorder');}"
    );
    expect(updateBlock).toContain('version:existing.cost.version+1');
    expect(updateBlock).not.toContain('.where(eq(purchaseOrderCosts.id,costId))');
  });

  it('keeps cost delete reads and writes organization-scoped with parent closeout guards', () => {
    const source = compact(read('src/server/functions/suppliers/po-costs.ts'));
    const deleteBlock = exportedFunctionBlock(source, 'deletePurchaseOrderCost');

    expect(deleteBlock).toContain(
      'innerJoin(purchaseOrders,and(eq(purchaseOrderCosts.purchaseOrderId,purchaseOrders.id),eq(purchaseOrders.organizationId,ctx.organizationId),isNull(purchaseOrders.deletedAt)))'
    );
    expect(deleteBlock).toContain(
      'where(and(eq(purchaseOrderCosts.id,data.costId),eq(purchaseOrderCosts.organizationId,ctx.organizationId)))'
    );
    expect(deleteBlock).toContain(
      "if(['cancelled','closed'].includes(existing.poStatus)){thrownewValidationError('Cannotdeletecostsforacancelledorclosedpurchaseorder');}"
    );
    expect(deleteBlock).not.toContain('.where(eq(purchaseOrderCosts.id,data.costId))');
  });
});
