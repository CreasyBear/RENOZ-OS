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

describe('supplier price import execute contract', () => {
  it('fails with an operator-safe error when an import row cannot be persisted', () => {
    const source = compact(read('src/server/functions/suppliers/price-imports.ts'));

    expect(source).toContain('persistedPrice=updatedPrice');
    expect(source).toContain('persistedPrice=newPrice');
    expect(source).toContain(
      'if(!persistedPrice){thrownewValidationError(`Priceimportrow${row.rowNumber}couldnotbesaved.Refreshvalidationandtryagain.`);}'
    );
    expect(source).toContain('priceListId:persistedPrice.id');
    expect(source).toContain('priceId:persistedPrice.id');
  });

  it('re-resolves supplier and product identities at execution before building write values', () => {
    const source = compact(read('src/server/functions/suppliers/price-imports.ts'));

    expect(source).toContain('constexecutionResolution=awaitresolveImportRow({organizationId:ctx.organizationId');
    expect(source).toContain('assertResolvedResolution(executionResolution);');
    expect(source).toContain('supplierId:executionResolution.supplierId');
    expect(source).toContain('productId:executionResolution.productId');
    expect(source).not.toContain('supplierId:row.resolution.supplierId');
    expect(source).not.toContain('productId:row.resolution.productId');
    expect(source).not.toContain('supplierId:row.resolution.supplierId!');
    expect(source).not.toContain('productId:row.resolution.productId!');
  });

  it('rejects approval-required imports before processing rows', () => {
    const source = compact(read('src/server/functions/suppliers/price-imports.ts'));

    expect(source).toContain(
      'if(data.approvalRequired){thrownewValidationError("Supplierpriceimportapprovalworkflowisnotavailableyet.Runtheimportwithoutapprovalorcreatepricechangerequestsseparately.");}'
    );
    expect(source.indexOf('if(data.approvalRequired){thrownewValidationError(')).toBeLessThan(
      source.indexOf('for(constrowofdata.validatedRows)')
    );
  });
});
