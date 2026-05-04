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

describe('purchase order lifecycle write result contract', () => {
  it('verifies lifecycle status updates return a row before activity logging', () => {
    const source = compact(read('src/server/functions/suppliers/purchase-orders.ts'));

    for (const functionName of [
      'submitForApproval',
      'approvePurchaseOrder',
      'rejectPurchaseOrder',
      'markAsOrdered',
      'cancelPurchaseOrder',
      'closePurchaseOrder',
    ]) {
      const block = exportedFunctionBlock(source, functionName);

      expect(block).toContain('constupdatedPo=result[0];');
      expect(block.indexOf('if(!updatedPo){throw')).toBeGreaterThan(
        block.indexOf('constupdatedPo=result[0];')
      );
      expect(block.indexOf('if(!updatedPo){throw')).toBeLessThan(block.indexOf('logger.logAsync'));
    }
  });
});
