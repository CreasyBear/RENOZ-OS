import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { formatProductCoreMutationError } from '@/hooks/products/product-mutation-error-messages';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

describe('product import feedback errors', () => {
  it('keeps import preview failures behind product-owned safe copy', () => {
    expect(
      formatProductCoreMutationError(
        new Error('postgres database stack trace while parsing product import preview'),
        'parseImportProducts'
      )
    ).toBe('Product import preview is temporarily unavailable. Please check the CSV file and try again.');

    expect(
      formatProductCoreMutationError(
        { statusCode: 400, message: 'CSV file is missing required product columns.' },
        'parseImportProducts'
      )
    ).toBe('CSV file is missing required product columns.');
  });

  it('keeps route and dialog import feedback behind product-owned formatters', () => {
    const route = read('src/routes/_authenticated/products/import.tsx');
    const dialog = read('src/components/domain/products/bulk/bulk-import.tsx');
    const formatter = read('src/hooks/products/product-mutation-error-messages.ts');

    expect(formatter).toContain('parseImportProducts');

    expect(route).toContain("formatProductCoreMutationError(error, 'parseImportProducts')");
    expect(route).not.toContain("description: error instanceof Error ? error.message : 'Please check the file format'");
    expect(route).not.toContain("description: error instanceof Error ? error.message : 'Please try again'");
    expect(route).not.toContain("toast.error('Import failed'");

    expect(dialog).toContain('formatProductCoreMutationError(err, "parseImportProducts")');
    expect(dialog).toContain('formatProductCoreMutationError(err, "importProducts")');
    expect(dialog).not.toContain('err instanceof Error ? err.message : "Failed to parse file"');
    expect(dialog).not.toContain('err instanceof Error ? err.message : "Import failed"');
  });
});
