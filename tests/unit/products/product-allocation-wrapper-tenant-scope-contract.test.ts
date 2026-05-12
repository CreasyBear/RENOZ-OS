import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

function compact(source: string): string {
  return source.replace(/\s+/g, '');
}

function sliceBetween(source: string, start: string, end: string): string {
  const startIndex = source.indexOf(start);
  const endIndex = source.indexOf(end, startIndex + start.length);

  expect(startIndex).toBeGreaterThanOrEqual(0);
  expect(endIndex).toBeGreaterThan(startIndex);

  return source.slice(startIndex, endIndex);
}

describe('product allocation wrapper tenant-scope contract', () => {
  it('keeps legacy allocation wrapper final inventory writes organization-scoped', () => {
    const source = read('src/server/functions/products/product-inventory.ts');
    const allocateBlock = compact(
      sliceBetween(source, 'export const allocateStock =', '/**\n * Deallocate')
    );
    const deallocateBlock = compact(
      sliceBetween(source, 'export const deallocateStock =', '/**\n * Adjust stock')
    );

    expect(allocateBlock).toContain(
      'where(and(eq(inventory.id,inv.id),eq(inventory.organizationId,ctx.organizationId)))'
    );
    expect(deallocateBlock).toContain(
      'where(and(eq(inventory.id,inv.id),eq(inventory.organizationId,ctx.organizationId)))'
    );
    expect(allocateBlock).not.toContain('.where(eq(inventory.id,inv.id))');
    expect(deallocateBlock).not.toContain('.where(eq(inventory.id,inv.id))');
  });
});
