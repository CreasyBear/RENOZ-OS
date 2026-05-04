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

describe('inventory analytics turnover summary contract', () => {
  it('does not annualize already-annualized server turnover a second time', () => {
    const source = compact(read('src/routes/_authenticated/inventory/analytics-page.tsx'));

    expect(source).toContain(
      'constperiodTurnoverRatio=averageInventoryValue>0?cogsForPeriod/averageInventoryValue:0;'
    );
    expect(source).toContain(
      'constannualizedTurnover=Number(turnoverData.turnover?.turnoverRate??0)||0;'
    );
    expect(source).toContain('turnoverRatio:periodTurnoverRatio,');
    expect(source).toContain('annualizedTurnover,');
    expect(source).not.toContain(
      'annualizedTurnover:(turnoverData.turnover?.turnoverRate??0)*4,'
    );
  });
});
