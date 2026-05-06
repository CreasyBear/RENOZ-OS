import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

describe('product stock adjustment errors', () => {
  it('keeps local stock adjustment errors behind product inventory mapper', () => {
    const dialog = read('src/components/domain/products/inventory/stock-adjustment.tsx');
    const index = read('src/hooks/products/index.ts');
    const hook = read('src/hooks/products/use-product-inventory.ts');

    expect(index).toContain('mapProductInventoryMutationError');
    expect(dialog).toContain('setError(mapProductInventoryMutationError(err))');
    expect(dialog).not.toContain('setError(err.message || "Failed to adjust stock")');

    expect(hook).toContain('toast.error(mapProductInventoryMutationError(error))');
  });
});
