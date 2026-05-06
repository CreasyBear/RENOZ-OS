import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { formatProductAttributeMutationError } from '@/hooks/products/product-mutation-error-messages';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

describe('product attribute mutation errors', () => {
  it('suppresses infrastructure messages and keeps safe recovery copy', () => {
    expect(
      formatProductAttributeMutationError(
        new Error('duplicate key value violates unique constraint product_attributes_name_key'),
        'createDefinition'
      )
    ).toBe('Product attribute creation is temporarily unavailable. Please refresh and try again.');

    expect(
      formatProductAttributeMutationError(
        new Error('postgres database stack trace while updating product attribute value'),
        'setValue'
      )
    ).toBe('Product attribute value update is temporarily unavailable. Please refresh and try again.');
  });

  it('keeps safe validation and permission guidance', () => {
    expect(
      formatProductAttributeMutationError(
        {
          errors: {
            value: ['Battery capacity must be within the configured range.'],
          },
        },
        'setValue'
      )
    ).toBe('Battery capacity must be within the configured range.');

    expect(
      formatProductAttributeMutationError(
        { statusCode: 403, message: 'You do not have permission to manage product attributes.' },
        'deleteDefinition'
      )
    ).toBe('You do not have permission to manage product attributes.');
  });

  it('keeps product attribute components behind product-owned formatters', () => {
    const definitions = read('src/components/domain/products/attributes/attribute-definitions.tsx');
    const valueEditor = read('src/components/domain/products/attributes/attribute-value-editor.tsx');
    const tabContainer = read('src/components/domain/products/tabs/attributes-tab-container.tsx');
    const index = read('src/hooks/products/index.ts');

    expect(index).toContain('formatProductAttributeMutationError');
    expect(definitions).toContain('formatProductAttributeMutationError(error, action)');
    expect(definitions).toContain('formatProductAttributeMutationError(error, "deleteDefinition")');
    expect(definitions).toContain('formatProductAttributeMutationError(error, "toggleDefinition")');
    expect(definitions).toContain('formatProductAttributeMutationError(updateMutation.error, "updateDefinition")');
    expect(definitions).toContain('formatProductAttributeMutationError(createMutation.error, "createDefinition")');
    expect(definitions).toContain('createMutation.reset();');
    expect(definitions).toContain('updateMutation.reset();');
    expect(definitions).not.toContain('(createMutation.error ?? updateMutation.error)?.message');
    expect(definitions).not.toContain('error instanceof Error ? error.message : "Failed to save attribute"');
    expect(definitions).not.toContain('error instanceof Error ? error.message : "Failed to delete attribute"');
    expect(definitions).not.toContain('error instanceof Error ? error.message : "Failed to toggle attribute"');

    expect(valueEditor).toContain('formatProductAttributeMutationError(err, "setValue")');
    expect(valueEditor).toContain('formatProductAttributeMutationError(setAttributeMutation.error, "setValue")');
    expect(valueEditor).not.toContain('setAttributeMutation.error?.message');
    expect(valueEditor).not.toContain('err instanceof Error ? err.message : "Failed to save attribute"');

    expect(tabContainer).toContain('formatProductAttributeMutationError(error, "deleteValue")');
    expect(tabContainer).not.toContain('error instanceof Error ? error.message : "Failed to delete attribute"');
  });
});
