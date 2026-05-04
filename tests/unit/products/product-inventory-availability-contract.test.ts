import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

describe('product inventory availability contract', () => {
  it('counts only available-status rows as product available stock', () => {
    const source = read('src/server/functions/products/product-inventory.ts');

    expect(source).toContain("CASE WHEN ${inventory.status} = 'available'");
    expect(source).toContain('const available = Number(inv.quantityAvailable ?? 0);');
    expect(source).toContain('summary.totalAvailable += Number(loc.quantityAvailable ?? 0);');
  });
});
