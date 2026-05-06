import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { formatProductCoreMutationError } from '@/hooks/products/product-mutation-error-messages';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

describe('product core mutation errors', () => {
  it('suppresses infrastructure messages and keeps safe recovery copy', () => {
    expect(
      formatProductCoreMutationError(
        new Error('duplicate key value violates unique constraint products_sku_key'),
        'createProduct'
      )
    ).toBe('Product creation is temporarily unavailable. Please refresh and try again.');

    expect(
      formatProductCoreMutationError(
        new Error('postgres database stack trace while exporting products'),
        'exportProducts'
      )
    ).toBe('Product export is temporarily unavailable. Please refresh and try again.');
  });

  it('keeps safe validation and permission guidance', () => {
    expect(
      formatProductCoreMutationError(
        {
          errors: {
            sku: ['SKU is already in use.'],
          },
        },
        'updateProduct'
      )
    ).toBe('SKU is already in use.');

    expect(
      formatProductCoreMutationError(
        { statusCode: 403, message: 'You do not have permission to manage products.' },
        'deleteProduct'
      )
    ).toBe('You do not have permission to manage products.');
  });

  it('keeps product core mutations behind product-owned formatters', () => {
    const hook = read('src/hooks/products/use-products.ts');
    const index = read('src/hooks/products/index.ts');

    expect(index).toContain('formatProductCoreMutationError');
    expect(hook).toContain("formatProductCoreMutationError(error, 'createProduct')");
    expect(hook).toContain("formatProductCoreMutationError(error, 'updateProduct')");
    expect(hook).toContain("formatProductCoreMutationError(error, 'deleteProduct')");
    expect(hook).toContain("formatProductCoreMutationError(error, 'bulkDelete')");
    expect(hook).toContain("formatProductCoreMutationError(error, 'duplicateProduct')");
    expect(hook).toContain("formatProductCoreMutationError(error, 'createCategory')");
    expect(hook).toContain("formatProductCoreMutationError(error, 'updateCategory')");
    expect(hook).toContain("formatProductCoreMutationError(error, 'deleteCategory')");
    expect(hook).toContain("formatProductCoreMutationError(error, 'importProducts')");
    expect(hook).toContain("formatProductCoreMutationError(error, 'bulkUpdateProducts')");
    expect(hook).toContain("formatProductCoreMutationError(error, 'bulkAdjustPrices')");
    expect(hook).toContain("formatProductCoreMutationError(error, 'exportProducts')");
    expect(hook).not.toContain('toast.error(error.message');
    expect(hook).not.toContain("Failed to create product");
    expect(hook).not.toContain("Failed to update product");
    expect(hook).not.toContain("Failed to delete product");
    expect(hook).not.toContain("Failed to duplicate product");
    expect(hook).not.toContain("Failed to create category");
    expect(hook).not.toContain("Failed to import products");
    expect(hook).not.toContain("Failed to export products");
  });
});
