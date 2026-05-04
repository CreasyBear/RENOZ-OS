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

describe('supplier pricing supplier tenant-scope contract', () => {
  it('validates supplier ownership before direct price-list creation writes', () => {
    const source = compact(read('src/server/functions/suppliers/pricing.ts'));
    const block = exportedFunctionBlock(source, 'createPriceList');

    expect(source).toContain(
      'from(suppliers).where(and(eq(suppliers.id,params.supplierId),eq(suppliers.organizationId,params.organizationId),isNull(suppliers.deletedAt))).limit(1)'
    );
    expect(block).toContain(
      'awaitassertSupplierBelongsToOrganization({organizationId:ctx.organizationId,supplierId:data.supplierId,});'
    );
    expect(block.indexOf('awaitassertSupplierBelongsToOrganization(')).toBeLessThan(
      block.indexOf('supplierId:data.supplierId')
    );
  });

  it('validates supplier ownership before price agreement creation writes', () => {
    const source = compact(read('src/server/functions/suppliers/pricing.ts'));
    const block = exportedFunctionBlock(source, 'createPriceAgreement');

    expect(block).toContain(
      'awaitassertSupplierBelongsToOrganization({organizationId:ctx.organizationId,supplierId:data.supplierId,});'
    );
    expect(block.indexOf('awaitassertSupplierBelongsToOrganization(')).toBeLessThan(
      block.indexOf('insert(priceAgreements)')
    );
  });
});
