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

describe('supplier price agreement create contract', () => {
  it('throws an operator-safe error when price agreement creation returns no row', () => {
    const source = compact(read('src/server/functions/suppliers/pricing.ts'));
    const block = exportedFunctionBlock(source, 'createPriceAgreement');

    expect(block).toContain(
      'if(!result){thrownewValidationError("Supplierpriceagreementcouldnotbesaved.Refreshandtryagain.");}'
    );
    expect(block.indexOf('if(!result){thrownewValidationError(')).toBeLessThan(
      block.indexOf('returnresult;')
    );
  });
});
