import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

describe('inventory realtime cache contract', () => {
  it('refreshes explicit inventory and product stock families without inventory root invalidation', () => {
    const hook = read('src/hooks/realtime/use-inventory-realtime.ts');

    expect(hook).toContain('queryKeys.inventory.lists()');
    expect(hook).toContain('queryKeys.inventory.details()');
    expect(hook).toContain('queryKeys.inventory.items({ organizationId })');
    expect(hook).toContain('queryKeys.inventory.movementsAll()');
    expect(hook).toContain('queryKeys.inventory.alertsAll()');
    expect(hook).toContain('queryKeys.products.stock()');
    expect(hook).toContain('queryKeys.products.inventories()');
    expect(hook).toContain('queryKeys.products.inventoryStatsAll()');
    expect(hook).toContain('queryKeys.products.stockLevelsAll()');
    expect(hook).toContain('queryKeys.products.stockAlertsAll()');
    expect(hook).toContain('queryKeys.products.movementsAll()');
    expect(hook).toContain('queryKeys.dashboard.inventory()');
    expect(hook).toContain('queryKeys.dashboard.alerts()');

    expect(hook).not.toContain('queryKeys.inventory.all');
    expect(hook).not.toContain('queryKeys.products.all');
  });
});
