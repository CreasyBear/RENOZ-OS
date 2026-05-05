import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { formatSupplierMutationError } from '@/hooks/suppliers/_mutation-errors';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

describe('supplier mutation error formatting', () => {
  it('maps known supplier mutation codes and validation fields', () => {
    expect(
      formatSupplierMutationError(
        { statusCode: 404, code: 'NOT_FOUND' },
        'Failed to update supplier'
      )
    ).toBe('The supplier could not be found. Refresh and try again.');

    expect(
      formatSupplierMutationError(
        {
          statusCode: 400,
          errors: {
            email: ['Email is already in use.'],
          },
        },
        'Failed to update supplier'
      )
    ).toBe('Email is already in use.');
  });

  it('keeps safe supplier validation messages without leaking infrastructure details', () => {
    expect(
      formatSupplierMutationError(
        new Error('A supplier with this email address already exists. Use a different email.'),
        'Failed to update supplier'
      )
    ).toBe('A supplier with this email address already exists. Use a different email.');

    expect(
      formatSupplierMutationError(
        new Error('duplicate key value violates unique constraint suppliers_email_unique'),
        'Failed to update supplier'
      )
    ).toBe('Failed to update supplier');
  });

  it('keeps supplier mutation feedback on the formatter contract', () => {
    const create = read('src/components/domain/suppliers/supplier-create-container.tsx');
    const edit = read('src/components/domain/suppliers/supplier-edit-container.tsx');
    const list = read('src/components/domain/suppliers/suppliers-list-container.tsx');
    const detail = read('src/components/domain/suppliers/containers/supplier-detail-container.tsx');
    const index = read('src/hooks/suppliers/index.ts');

    expect(index).toContain("export { formatSupplierMutationError } from './_mutation-errors';");
    expect(create).toContain('formatSupplierMutationError(');
    expect(edit).toContain('formatSupplierMutationError(');
    expect(list).toContain('formatSupplierMutationError(');
    expect(detail).toContain('formatSupplierMutationError(');

    expect(create).not.toContain('description: error instanceof Error ? error.message');
    expect(edit).not.toContain('description: error instanceof Error ? error.message');
    expect(list).not.toContain('error instanceof Error ? error.message : "Failed to delete supplier"');
    expect(list).not.toContain('error instanceof Error ? error.message : "Failed to delete some suppliers"');
    expect(list).not.toContain('error instanceof Error ? error.message : "Failed to update supplier status"');
    expect(detail).not.toContain("error instanceof Error ? error.message : 'Failed to delete supplier'");
  });
});
