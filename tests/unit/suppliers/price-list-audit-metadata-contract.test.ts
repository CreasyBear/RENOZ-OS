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

function expectPriceListUpsertPreservesCreator(block: string): void {
  expect(block).toContain(
    'update(priceLists).set({...priceValues,updatedBy:ctx.user.id,updatedAt:newDate(),})'
  );
  expect(block).toContain(
    'insert(priceLists).values({...priceValues,createdBy:ctx.user.id,updatedBy:ctx.user.id,}).returning()'
  );

  const updateStart = block.indexOf('update(priceLists)');
  const insertStart = block.indexOf('insert(priceLists)', updateStart);
  expect(updateStart).toBeGreaterThanOrEqual(0);
  expect(insertStart).toBeGreaterThan(updateStart);

  const updateBlock = block.slice(updateStart, insertStart);
  expect(updateBlock).not.toContain('createdBy:ctx.user.id');
}

describe('supplier price-list audit metadata contract', () => {
  it('preserves createdBy when direct price-list upserts update an existing price', () => {
    const source = compact(read('src/server/functions/suppliers/pricing.ts'));
    const block = exportedFunctionBlock(source, 'createPriceList');

    expectPriceListUpsertPreservesCreator(block);
  });

  it('preserves createdBy when price import execution updates an existing price', () => {
    const source = compact(read('src/server/functions/suppliers/price-imports.ts'));
    const block = exportedFunctionBlock(source, 'executePriceImport');

    expectPriceListUpsertPreservesCreator(block);
  });
});
