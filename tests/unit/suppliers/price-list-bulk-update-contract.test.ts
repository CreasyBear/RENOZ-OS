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

describe('supplier price-list bulk update contract', () => {
  it('rejects missing scoped targets and verifies every bulk price-list write', () => {
    const source = compact(read('src/server/functions/suppliers/pricing.ts'));
    const block = exportedFunctionBlock(source, 'bulkUpdatePriceLists');

    expect(block).toContain('constuniqueIds=[...newSet(ids)]');
    expect(block).toContain('inArray(priceLists.id,uniqueIds)');
    expect(block).toContain('eq(priceLists.organizationId,ctx.organizationId)');
    expect(block).toContain('if(currentPrices.length!==uniqueIds.length){thrownewValidationError(');
    expect(block).toContain('returning({id:priceLists.id})');
    expect(block).toContain('constupdatedCount=updateResults.filter((rows)=>rows[0]).length');
    expect(block).toContain('if(updatedCount!==itemsToUpdate.length){thrownewValidationError(');
    expect(block).toContain('message:`Successfullyupdated${updatedCount}pricerecords`,');
    expect(block).not.toContain('updatedCount:itemsToUpdate.length');
    expect(block).not.toContain('message:`Successfullyupdated${itemsToUpdate.length}pricerecords`,');
  });
});
