import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { formatProductBundleMutationError } from '@/hooks/products/product-mutation-error-messages';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

describe('product bundle mutation errors', () => {
  it('suppresses infrastructure messages and keeps safe recovery copy', () => {
    expect(
      formatProductBundleMutationError(
        new Error('duplicate key value violates unique constraint product_bundles_bundle_component_key'),
        'addComponent'
      )
    ).toBe('Bundle component add is temporarily unavailable. Please refresh and try again.');

    expect(
      formatProductBundleMutationError(
        new Error('postgres database stack trace while replacing bundle components'),
        'setComponents'
      )
    ).toBe('Bundle component update is temporarily unavailable. Please refresh and try again.');
  });

  it('keeps safe validation and permission guidance', () => {
    expect(
      formatProductBundleMutationError(
        {
          errors: {
            components: ['A bundle cannot include itself as a component.'],
          },
        },
        'setComponents'
      )
    ).toBe('A bundle cannot include itself as a component.');

    expect(
      formatProductBundleMutationError(
        { statusCode: 403, message: 'You do not have permission to manage product bundles.' },
        'removeComponent'
      )
    ).toBe('You do not have permission to manage product bundles.');
  });

  it('keeps product bundle hooks and creator behind product-owned formatters', () => {
    const hook = read('src/hooks/products/use-product-bundles.ts');
    const creator = read('src/components/domain/products/bundles/bundle-creator.tsx');
    const index = read('src/hooks/products/index.ts');

    expect(index).toContain('formatProductBundleMutationError');
    expect(hook).toContain("formatProductBundleMutationError(error, 'addComponent')");
    expect(hook).toContain("formatProductBundleMutationError(error, 'updateComponent')");
    expect(hook).toContain("formatProductBundleMutationError(error, 'removeComponent')");
    expect(hook).toContain("formatProductBundleMutationError(error, 'setComponents')");
    expect(hook).not.toContain("toast.error('Failed to add component to bundle')");
    expect(hook).not.toContain("toast.error('Failed to update component')");
    expect(hook).not.toContain("toast.error('Failed to remove component')");
    expect(hook).not.toContain("toast.error('Failed to update bundle components')");

    expect(creator).toContain('formatProductCoreMutationError(createProduct.error, "createProduct")');
    expect(creator).toContain('formatProductBundleMutationError(setBundleComponents.error, "setComponents")');
    expect(creator).toContain('formatProductBundleMutationError(error, "setComponents")');
    expect(creator).toContain('formatProductCoreMutationError(error, "createProduct")');
    expect(creator).toContain('createProduct.reset();');
    expect(creator).toContain('setBundleComponents.reset();');
    expect(creator).not.toContain('error instanceof Error ? error.message : "Failed to create bundle"');
    expect(creator).not.toContain('(createProduct.error ?? setBundleComponents.error)?.message');
  });
});
