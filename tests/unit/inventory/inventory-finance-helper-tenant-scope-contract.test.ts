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

describe('inventory finance helper tenant-scope contract', () => {
  it('keeps FIFO layer consumption updates organization-scoped', () => {
    const source = compact(read('src/server/functions/_shared/inventory-finance.ts'));

    expect(source).toContain(
      'where(and(eq(inventoryCostLayers.id,layer.id),eq(inventoryCostLayers.organizationId,params.organizationId)))'
    );
    expect(source).not.toContain('.where(eq(inventoryCostLayers.id,layer.id))');
  });

  it('keeps derived inventory value recompute updates organization-scoped', () => {
    const source = compact(read('src/server/functions/_shared/inventory-finance.ts'));

    expect(source).toContain(
      'where(and(eq(inventory.id,params.inventoryId),eq(inventory.organizationId,params.organizationId)))'
    );
    expect(source).not.toContain('.where(eq(inventory.id,params.inventoryId))');
  });
});
