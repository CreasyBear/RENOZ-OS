import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { formatProductImageMutationError } from '@/hooks/products/product-mutation-error-messages';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

describe('product image mutation errors', () => {
  it('suppresses infrastructure messages and keeps safe recovery copy', () => {
    expect(
      formatProductImageMutationError(
        new Error('duplicate key value violates unique constraint product_images_primary_idx'),
        'setPrimary'
      )
    ).toBe('Primary product image update is temporarily unavailable. Please refresh and try again.');

    expect(
      formatProductImageMutationError(
        new Error('supabase storage token stack trace while deleting product image'),
        'delete'
      )
    ).toBe('Product image deletion is temporarily unavailable. Please refresh and try again.');
  });

  it('keeps safe validation and permission guidance', () => {
    expect(
      formatProductImageMutationError(
        {
          errors: {
            altText: ['Alt text must describe the product image.'],
          },
        },
        'updateAltText'
      )
    ).toBe('Alt text must describe the product image.');

    expect(
      formatProductImageMutationError(
        { statusCode: 403, message: 'You do not have permission to manage product images.' },
        'add'
      )
    ).toBe('You do not have permission to manage product images.');
  });

  it('keeps product image mutations behind product-owned formatters', () => {
    const hook = read('src/hooks/products/use-product-images.ts');
    const index = read('src/hooks/products/index.ts');

    expect(index).toContain('formatProductImageMutationError');
    expect(hook).toContain("formatProductImageMutationError(error, 'add')");
    expect(hook).toContain("formatProductImageMutationError(error, 'update')");
    expect(hook).toContain("formatProductImageMutationError(error, 'delete')");
    expect(hook).toContain("formatProductImageMutationError(error, 'setPrimary')");
    expect(hook).toContain("formatProductImageMutationError(error, 'reorder')");
    expect(hook).toContain("formatProductImageMutationError(error, 'bulkDelete')");
    expect(hook).toContain("formatProductImageMutationError(error, 'updateAltText')");
    expect(hook).not.toContain('toast.error(error.message');
    expect(hook).not.toContain("Failed to add image");
    expect(hook).not.toContain("Failed to update image");
    expect(hook).not.toContain("Failed to delete image");
    expect(hook).not.toContain("Failed to set primary image");
    expect(hook).not.toContain("Failed to reorder images");
    expect(hook).not.toContain("Failed to update alt text");
  });
});
