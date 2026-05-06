import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

describe('product detail action feedback', () => {
  it('keeps duplicate and delete action feedback hook-owned', () => {
    const container = read('src/components/domain/products/containers/product-detail-container.tsx');
    const hook = read('src/hooks/products/use-products.ts');

    expect(container).not.toContain("toastError('Failed to duplicate product')");
    expect(container).not.toContain("toastError('Failed to delete product')");
    expect(container).not.toContain('toastError } from');
    expect(container).not.toContain('Product duplicated as');
    expect(container).not.toContain("toastSuccess('Product deleted')");

    expect(hook).toContain("formatProductCoreMutationError(error, 'duplicateProduct')");
    expect(hook).toContain("formatProductCoreMutationError(error, 'deleteProduct')");
    expect(hook).toContain("toast.success('Product duplicated successfully'");
    expect(hook).toContain("toast.success('Product deleted'");
  });
});
