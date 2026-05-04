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

describe('receive goods tenant-scope contract', () => {
  it('keeps PO receive weighted-cost layer aggregation organization-scoped', () => {
    const source = compact(read('src/server/functions/suppliers/receive-goods.ts'));

    expect(source).toContain(
      'innerJoin(inventory,and(eq(inventoryCostLayers.inventoryId,inventory.id),eq(inventoryCostLayers.organizationId,organizationId)))'
    );
    expect(source).toContain('eq(inventory.productId,productId)');
    expect(source).toContain('eq(inventory.organizationId,organizationId)');
    expect(source).not.toContain(
      'innerJoin(inventory,eq(inventoryCostLayers.inventoryId,inventory.id))'
    );
  });

  it('keeps PO receive product cost-price updates organization-scoped', () => {
    const source = compact(read('src/server/functions/suppliers/receive-goods.ts'));

    expect(source).toContain(
      'update(products).set({costPrice:weightedAvgCost}).where(and(eq(products.id,productId),eq(products.organizationId,organizationId)))'
    );
    expect(source).not.toContain(
      'update(products).set({costPrice:weightedAvgCost}).where(eq(products.id,productId))'
    );
  });

  it('keeps PO receive existing inventory balance updates organization-scoped', () => {
    const source = compact(read('src/server/functions/suppliers/receive-goods.ts'));
    const scopedInventoryUpdates = source.match(
      /where\(and\(eq\(inventory\.id,inventoryId\),eq\(inventory\.organizationId,ctx\.organizationId\)\)\)/g
    );

    expect(scopedInventoryUpdates).toHaveLength(2);
    expect(source).not.toContain('.where(eq(inventory.id,inventoryId))');
  });
});
