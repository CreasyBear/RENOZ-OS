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

describe('purchase order bulk delete result contract', () => {
  it('counts bulk delete success from returned rows only', () => {
    const source = compact(read('src/server/functions/suppliers/purchase-orders.ts'));
    const block = exportedFunctionBlock(source, 'bulkDeletePurchaseOrders');

    expect(block).toContain('constdeletedRows=awaitdb.update(purchaseOrders)');
    expect(block).toContain('returning({id:purchaseOrders.id})');
    expect(block).toContain(
      "if(!deletedRows[0]){results.failed.push({id,error:'Purchaseordernotfoundornolongerindraftstatus'});continue;}"
    );
    expect(block.indexOf('if(!deletedRows[0]){results.failed.push')).toBeLessThan(
      block.indexOf('results.deleted+=1')
    );
  });
});
