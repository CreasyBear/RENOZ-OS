import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

describe('product bulk operation errors', () => {
  it('keeps bulk operation local error state behind product-owned formatters', () => {
    const operations = read('src/components/domain/products/bulk/bulk-operations.tsx');
    const hook = read('src/hooks/products/use-products.ts');

    expect(operations).toContain('formatProductCoreMutationError(err, "bulkUpdateProducts")');
    expect(operations).toContain('formatProductCoreMutationError(err, "bulkAdjustPrices")');
    expect(operations).toContain('formatProductCoreMutationError(err, "bulkDelete")');
    expect(operations).toContain('formatProductCoreMutationError(err, "exportProducts")');
    expect(operations).not.toContain('err instanceof Error ? err.message : "Failed to update products"');
    expect(operations).not.toContain('err instanceof Error ? err.message : "Failed to update prices"');
    expect(operations).not.toContain('err instanceof Error ? err.message : "Failed to delete products"');
    expect(operations).not.toContain('err instanceof Error ? err.message : "Failed to export products"');
    expect(operations).not.toContain('toastError(');

    expect(hook).toContain("formatProductCoreMutationError(error, 'bulkUpdateProducts')");
    expect(hook).toContain("formatProductCoreMutationError(error, 'bulkAdjustPrices')");
    expect(hook).toContain("formatProductCoreMutationError(error, 'bulkDelete')");
    expect(hook).toContain("formatProductCoreMutationError(error, 'exportProducts')");
  });
});
