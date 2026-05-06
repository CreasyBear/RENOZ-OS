import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

describe('product import result row errors', () => {
  it('keeps server import result row failures operator-safe', () => {
    const server = read('src/server/functions/products/product-bulk-ops.ts');

    expect(server).toContain('PRODUCT_IMPORT_ROW_FAILED_MESSAGE');
    expect(server).toContain('message: PRODUCT_IMPORT_ROW_FAILED_MESSAGE');
    expect(server).toContain('Import failed at row ${i + 1}.');
    expect(server).toContain('Row ${i + 1}: ${PRODUCT_IMPORT_ROW_FAILED_MESSAGE}');

    expect(server).not.toContain("err instanceof Error ? err.message : 'Unknown error'");
    expect(server).not.toContain('Import failed at row ${i + 1}: ${message}');
    expect(server).not.toContain('Row ${i + 1}: ${message}');
  });
});
