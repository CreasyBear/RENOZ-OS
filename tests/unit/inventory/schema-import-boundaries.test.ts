import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

const inventoryRouteSchemaCallers = [
  'src/routes/_authenticated/inventory/browser.tsx',
  'src/routes/_authenticated/inventory/locations-page.tsx',
  'tests/unit/root-input-normalization-sweep.test.ts',
];

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

describe('inventory schema import boundaries', () => {
  it('keeps route and normalization callers off the inventory schema monolith', () => {
    for (const path of inventoryRouteSchemaCallers) {
      expect(read(path), path).not.toContain('@/lib/schemas/inventory/inventory');
    }
  });
});
