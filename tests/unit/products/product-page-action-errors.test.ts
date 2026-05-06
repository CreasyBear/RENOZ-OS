import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

describe('products page action errors', () => {
  it('keeps products page bulk and export failures behind product-owned formatters', () => {
    const page = read('src/routes/_authenticated/products/products-page.tsx');
    const hook = read('src/hooks/products/use-products.ts');

    expect(page).toContain('formatProductCoreMutationError(error, "updateProduct")');
    expect(page).toContain('formatProductCoreMutationError(error, "deleteProduct")');
    expect(page).toContain('formatError: (error) => formatProductCoreMutationError(error, "updateProduct")');
    expect(page).toContain('formatError: (error) => formatProductCoreMutationError(error, "deleteProduct")');
    expect(page).toContain("logger.error('Export failed', error);");
    expect(page).not.toContain("toastError(error instanceof Error ? error.message : 'Failed to export products')");
    expect(page).not.toContain('result.reason instanceof Error');

    expect(hook).toContain("formatProductCoreMutationError(error, 'exportProducts')");
  });
});
