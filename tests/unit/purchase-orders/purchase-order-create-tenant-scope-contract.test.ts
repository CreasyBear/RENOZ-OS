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

describe('purchase order create tenant-scope contract', () => {
  it('rejects missing or cross-tenant suppliers before creating purchase orders', () => {
    const source = compact(read('src/server/functions/suppliers/purchase-orders.ts'));
    const block = exportedFunctionBlock(source, 'createPurchaseOrder');

    expect(block).toContain(
      'from(suppliers).where(and(eq(suppliers.id,data.supplierId),eq(suppliers.organizationId,ctx.organizationId),isNull(suppliers.deletedAt))).limit(1)'
    );
    expect(block).toContain("if(!supplier){thrownewNotFoundError('Suppliernotfound','supplier');}");
    expect(block.indexOf("if(!supplier){thrownewNotFoundError('Suppliernotfound','supplier');}")).toBeLessThan(
      block.indexOf('db.transaction')
    );
    expect(block).toContain('supplierName:supplier.name');
    expect(block).not.toContain('supplierName:supplier?.name');
  });
});
