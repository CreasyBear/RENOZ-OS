import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

describe('WMS dashboard diagnostic logging contract', () => {
  it('keeps query diagnostics out of the WMS dashboard read hook', () => {
    const source = read('src/hooks/inventory/use-wms-dashboard.ts');

    expect(source).not.toContain('inventoryLogger');
    expect(source).not.toContain('queryFn started');
    expect(source).not.toContain('getWMSDashboard returned');
    expect(source).not.toContain('queryFn error');
    expect(source).toContain('resolveReadResult(() => getWMSDashboard({ data: {} })');
    expect(source).toContain('Inventory dashboard data is temporarily unavailable');
  });
});
