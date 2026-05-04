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

describe('purchase order draft mutation result contract', () => {
  it('verifies draft purchase-order update returns a row before logging', () => {
    const source = compact(read('src/server/functions/suppliers/purchase-orders.ts'));
    const block = exportedFunctionBlock(source, 'updatePurchaseOrder');

    expect(block).toContain('constupdatedPo=result[0];');
    expect(block).toContain(
      "if(!updatedPo){thrownewNotFoundError('Purchaseordernotfoundorupdatefailed','purchaseOrder');}"
    );
    expect(block.indexOf("if(!updatedPo){thrownewNotFoundError('Purchaseordernotfoundorupdatefailed'")).toBeLessThan(
      block.indexOf('logger.logAsync')
    );
  });

  it('verifies draft purchase-order delete returns a row before logging and returning', () => {
    const source = compact(read('src/server/functions/suppliers/purchase-orders.ts'));
    const block = exportedFunctionBlock(source, 'deletePurchaseOrder');

    expect(block).toContain('constdeletedPo=result[0];');
    expect(block).toContain(
      "if(!deletedPo){thrownewNotFoundError('Purchaseordernotfoundordeletionfailed','purchaseOrder');}"
    );
    expect(block.indexOf("if(!deletedPo){thrownewNotFoundError('Purchaseordernotfoundordeletionfailed'")).toBeLessThan(
      block.indexOf('logger.logAsync')
    );
    expect(block).toContain('return{success:true,id:deletedPo.id};');
    expect(block).not.toContain('return{success:true,id:result[0].id};');
  });
});
