import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { queryKeys } from '@/lib/query-keys';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

function compact(source: string): string {
  return source.replace(/\s+/g, '');
}

describe('product stock alert cache contract', () => {
  it('keys low-stock alerts by every server-side alert filter and exposes a prefix invalidation key', () => {
    const queryKeysSource = read('src/lib/query-keys.ts');
    const productInventoryHook = read('src/hooks/products/use-product-inventory.ts');
    const compactQueryKeys = compact(queryKeysSource);
    const compactProductHook = compact(productInventoryHook);

    expect(compactQueryKeys).toContain(
      'exportinterfaceProductStockAlertFilters{locationId?:stringreorderPoint?:numbercriticalThreshold?:number}'
    );
    expect(compactQueryKeys).toContain(
      "stockAlertsAll:()=>[...queryKeys.products.all,'stockAlerts']asconst"
    );
    expect(compactQueryKeys).toContain(
      'stockAlerts:(filters?:ProductStockAlertFilters)=>[...queryKeys.products.stockAlertsAll(),filters??{}]asconst'
    );
    expect(compactProductHook).toContain(
      'constalertFilters={reorderPoint,criticalThreshold,locationId};'
    );
    expect(compactProductHook).toContain(
      'queryKey:queryKeys.products.stockAlerts(alertFilters)'
    );
    expect(compactProductHook).toContain('data:alertFilters');
    expect(compactProductHook).not.toContain(
      "queryKey:queryKeys.products.stockAlerts(locationId??'all')"
    );

    expect(queryKeys.products.stockAlerts({
      reorderPoint: 20,
      criticalThreshold: 3,
      locationId: 'location-1',
    })).toEqual([
      'products',
      'stockAlerts',
      {
        reorderPoint: 20,
        criticalThreshold: 3,
        locationId: 'location-1',
      },
    ]);
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
