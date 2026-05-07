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

describe('product stock alert cache contract', () => {
  it('keys low-stock alerts by alert scope and exposes a prefix invalidation key', () => {
    const queryKeys = read('src/lib/query-keys.ts');
    const productInventoryHook = read('src/hooks/products/use-product-inventory.ts');
    const compactQueryKeys = compact(queryKeys);
    const compactProductHook = compact(productInventoryHook);

    expect(compactQueryKeys).toContain(
      "stockAlertsAll:()=>[...queryKeys.products.all,'stockAlerts']asconst"
    );
    expect(compactQueryKeys).toContain(
      'stockAlerts:(scope:string)=>[...queryKeys.products.stockAlertsAll(),scope]asconst'
    );
    expect(compactProductHook).toContain(
      "queryKey:queryKeys.products.stockAlerts(locationId??'all')"
    );
  });

  it('invalidates all low-stock alert scopes after stock-changing mutations', () => {
    const inventoryCache = read('src/hooks/inventory/_stock-mutation-cache.ts');
    const fulfillmentCache = read('src/hooks/orders/_fulfillment-cache.ts');
    const productInventoryHook = read('src/hooks/products/use-product-inventory.ts');
    const combined = compact([inventoryCache, fulfillmentCache, productInventoryHook].join('\n'));

    expect(combined).toContain('queryKeys.products.stockAlertsAll()');
    expect(combined).not.toContain('queryKeys.products.stockAlerts(productId)');
    expect(combined).not.toContain('queryKeys.products.stockAlerts(variables.productId)');
  });
});
