import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  WMS_DASHBOARD_STOCK_SEMANTICS,
  categoryStockSchema,
  dashboardComparisonSchema,
  locationStockSchema,
  recentMovementSchema,
  wmsDashboardStockSemanticsSchema,
  wmsDashboardDataSchema,
} from '@/lib/schemas/inventory';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

describe('inventory dashboard schema ownership', () => {
  it('keeps dashboard schemas owned by the dashboard schema file', () => {
    const dashboardSchema = read('src/lib/schemas/inventory/dashboard.ts');
    const inventorySchema = read('src/lib/schemas/inventory/inventory.ts');

    expect(dashboardSchema).toContain('export const categoryStockSchema');
    expect(dashboardSchema).toContain('export const locationStockSchema');
    expect(dashboardSchema).toContain('export const recentMovementSchema');
    expect(dashboardSchema).toContain('export const wmsDashboardStockSemanticsSchema');
    expect(dashboardSchema).toContain('export const wmsDashboardDataSchema');
    expect(dashboardSchema).toContain('export interface DashboardTopMovingItem');
    expect(inventorySchema).not.toContain('export const categoryStockSchema');
    expect(inventorySchema).not.toContain('export const locationStockSchema');
    expect(inventorySchema).not.toContain('export const recentMovementSchema');
    expect(inventorySchema).not.toContain('export const wmsDashboardStockSemanticsSchema');
    expect(inventorySchema).not.toContain('export const wmsDashboardDataSchema');
    expect(inventorySchema).not.toContain('export interface DashboardTopMovingItem');
  });

  it('preserves the public inventory schema barrel for dashboard callers', () => {
    expect(
      categoryStockSchema.parse({
        categoryId: null,
        categoryName: 'Uncategorized',
        unitCount: 2,
        totalValue: 100,
      })
    ).toMatchObject({
      categoryId: null,
      categoryName: 'Uncategorized',
      unitCount: 2,
      totalValue: 100,
    });
    expect(
      locationStockSchema.parse({
        locationId: '00000000-0000-4000-8000-000000000002',
        locationName: 'Main Warehouse',
        locationType: 'warehouse',
        unitCount: 4,
        totalValue: 200,
        percentage: 50,
      })
    ).toMatchObject({
      locationName: 'Main Warehouse',
      percentage: 50,
    });
    expect(
      recentMovementSchema.parse({
        id: '00000000-0000-4000-8000-000000000003',
        type: 'receipt',
        timestamp: '2026-01-01T00:00:00.000Z',
        description: 'Received stock',
        reference: null,
        quantity: 3,
        productName: 'Battery',
        productSku: 'BAT-001',
        location: 'Main Warehouse',
        toLocation: null,
      })
    ).toMatchObject({
      type: 'receipt',
      quantity: 3,
      productSku: 'BAT-001',
    });
    expect(
      dashboardComparisonSchema.parse({
        totalValueChange: 1,
        totalUnitsChange: 2,
        totalSkusChange: 3,
        alertsChange: 4,
        locationsChange: 5,
      })
    ).toMatchObject({
      totalValueChange: 1,
      totalUnitsChange: 2,
      totalSkusChange: 3,
    });
    expect(
      wmsDashboardStockSemanticsSchema.parse(WMS_DASHBOARD_STOCK_SEMANTICS)
    ).toMatchObject({
      totals: 'physical_on_hand',
      currentAlerts: 'allocatable_available',
      previousPeriodComparison: 'movement_reconstructed_quantity',
    });
    expect(
      wmsDashboardDataSchema.parse({
        stockSemantics: WMS_DASHBOARD_STOCK_SEMANTICS,
        totals: {
          totalValue: 100,
          totalUnits: 2,
          totalSkus: 1,
        },
        stockByCategory: [],
        stockByLocation: [],
        recentMovements: [],
      })
    ).toMatchObject({
      totals: {
        totalValue: 100,
        totalUnits: 2,
        totalSkus: 1,
      },
      stockByCategory: [],
      stockByLocation: [],
      recentMovements: [],
    });
  });
});
