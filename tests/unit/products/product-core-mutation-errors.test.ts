import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  formatProductAttributeMutationError,
  formatProductBundleMutationError,
  formatProductCoreMutationError,
  formatProductImageMutationError,
  formatProductPricingMutationError,
  isUnsafeProductMutationMessage,
} from '@/hooks/products/product-mutation-error-messages';

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

  it('suppresses implementation-shaped messages across product mutation surfaces', () => {
    expect(
      formatProductCoreMutationError(
        {
          statusCode: 400,
          message: 'TypeError: Cannot read properties of undefined (reading productId)',
        },
        'updateProduct'
      )
    ).toBe('Product update is temporarily unavailable. Please refresh and try again.');

    expect(
      formatProductCoreMutationError(
        {
          statusCode: 400,
          errors: {
            csvContent: ['SQL syntax error at or near "products"'],
          },
        },
        'parseImportProducts'
      )
    ).toBe('Product import preview is temporarily unavailable. Please check the CSV file and try again.');

    expect(
      formatProductPricingMutationError(
        {
          statusCode: 400,
          message: 'ReferenceError: priceTier is not defined',
        },
        'setTiers'
      )
    ).toBe('Product price tier update is temporarily unavailable. Please refresh and try again.');

    expect(
      formatProductImageMutationError(
        {
          statusCode: 400,
          message: 'SyntaxError: Unexpected token in storage response',
        },
        'add'
      )
    ).toBe('Product image upload is temporarily unavailable. Please refresh and try again.');

    expect(
      formatProductAttributeMutationError(
        {
          statusCode: 400,
          message: 'attributeNormalizer is not a function',
        },
        'setValue'
      )
    ).toBe('Product attribute value update is temporarily unavailable. Please refresh and try again.');

    expect(
      formatProductBundleMutationError(
        {
          statusCode: 400,
          message: 'at updateBundleComponents (bundle-service.ts:42:7)',
        },
        'setComponents'
      )
    ).toBe('Bundle component update is temporarily unavailable. Please refresh and try again.');

    expect(isUnsafeProductMutationMessage('TypeError: Cannot set properties of null')).toBe(true);
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
