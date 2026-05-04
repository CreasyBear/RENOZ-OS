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

describe('supplier price change application tenant-scope contract', () => {
  it('keeps price-list application and audit-history application writes organization-scoped', () => {
    const source = compact(read('src/server/functions/suppliers/price-history.ts'));

    expect(source).toContain(
      'update(supplierPriceLists).set({price:record.newPrice,effectivePrice:record.newPrice,lastUpdated:newDate(),updatedBy:ctx.user.id,}).where(and(eq(supplierPriceLists.id,record.priceListId),eq(supplierPriceLists.organizationId,ctx.organizationId)))'
    );
    expect(source).toContain('returning({id:supplierPriceLists.id})');
    expect(source).toContain(
      "if(!updatedPrice){thrownewNotFoundError('Pricelistitemnotfoundforapprovedpricechange','priceList');}"
    );
    expect(source).toContain(
      'update(priceChangeHistory).set({status:\'applied\',appliedBy:ctx.user.id,appliedAt:newDate(),}).where(and(eq(priceChangeHistory.id,data.id),eq(priceChangeHistory.organizationId,ctx.organizationId),eq(priceChangeHistory.status,\'approved\')))'
    );
    expect(source).toContain(
      "if(!applied){thrownewValidationError('Pricechangecouldnotbemarkedasapplied.Refreshandtryagain.');}"
    );
    expect(source).not.toContain('.where(eq(priceChangeHistory.id,data.id))');
  });
});
