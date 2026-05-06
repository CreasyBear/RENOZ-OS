import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

describe('product catalog form errors', () => {
  it('keeps catalog form summaries behind product-owned safe formatters', () => {
    const categoryEditor = read('src/components/domain/products/categories/category-editor.tsx');
    const productEditDialog = read('src/components/domain/products/product-edit-dialog.tsx');
    const imageEditor = read('src/components/domain/products/images/image-editor.tsx');
    const index = read('src/hooks/products/index.ts');

    expect(index).toContain('formatProductCoreMutationError');
    expect(index).toContain('formatProductImageMutationError');

    expect(categoryEditor).toContain('formatProductCoreMutationError(error, action)');
    expect(categoryEditor).toContain('mode === "create" ? "createCategory" : "updateCategory"');
    expect(categoryEditor).not.toContain('error instanceof Error ? error.message : "Failed to save category"');

    expect(productEditDialog).toContain('formatProductCoreMutationError(error, "updateProduct")');
    expect(productEditDialog).not.toContain('error instanceof Error ? error.message : "Failed to update product"');

    expect(imageEditor).toContain('formatProductImageMutationError(err, "update")');
    expect(imageEditor).not.toContain('err instanceof Error ? err.message : "Failed to update image"');
  });
});
