/**
 * WMS Dashboard Hooks
 *
 * Hooks for the Warehouse Management System (WMS) dashboard.
 * Provides aggregated stock views by category, location, and recent movements.
 *
 * @see src/server/functions/inventory/inventory.ts for server functions
 * @see docs/design-system/INVENTORY-DASHBOARD-SPEC.md for specification
 */

import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import {
  getWMSDashboard,
  getStockByCategory,
  getStockByLocation,
  getRecentMovementsTimeline,
} from '@/server/functions/inventory';
import type {
  CategoryStock,
  LocationStock,
  RecentMovement,
  WMSDashboardData,
} from '@/lib/schemas/inventory';
import { inventoryLogger } from '@/lib/logger';

// ============================================================================
// TYPES
// ============================================================================

// Re-export types from schema for convenience
export type { CategoryStock, LocationStock, RecentMovement, WMSDashboardData };

// ============================================================================
// HOOKS
// ============================================================================

/**
 * Hook for fetching complete WMS dashboard data.
 * Combines totals, category breakdown, location breakdown, and recent movements
 * in a single optimized query.
 *
 * @example
 * ```tsx
 * const { data, isLoading } = useWMSDashboard();
 *
 * // Access totals
 * console.log(data?.totals.totalValue);
 *
 * // Render category cards
 * data?.stockByCategory.map(cat => (
 *   <CategoryCard key={cat.categoryId} category={cat} />
 * ));
 * ```
 */
const EMPTY_WMS_DASHBOARD: WMSDashboardData = {
  totals: { totalValue: 0, totalUnits: 0, totalSkus: 0 },
  comparison: {
    totalValueChange: 0,
    totalUnitsChange: 0,
    totalSkusChange: 0,
    alertsChange: 0,
    locationsChange: 0,
  },
  stockByCategory: [],
  stockByLocation: [],
  recentMovements: [],
};

export function useWMSDashboard() {
  return useQuery({
    queryKey: queryKeys.inventory.wmsDashboard(),
    queryFn: async () => {
      inventoryLogger.debug('[useWMSDashboard] queryFn started');
      try {
        const result = await getWMSDashboard({ data: {} });
        inventoryLogger.debug('[useWMSDashboard] getWMSDashboard returned', {
          status: result == null ? 'null/undefined' : 'ok',
          totalValue: result?.totals?.totalValue,
        });
        // Return empty structure when server returns null (avoids noisy error; dashboard renders empty state)
        return result ?? EMPTY_WMS_DASHBOARD;
      } catch (err) {
        inventoryLogger.error('[useWMSDashboard] queryFn error', err);
        throw err;
      }
    },
    staleTime: 60 * 1000, // 1 minute
  });
}

/**
 * Hook for fetching stock aggregated by product category.
 * Use this for the category cards section of the dashboard.
 *
 * @example
 * ```tsx
 * const { data: categories } = useStockByCategory();
 * categories?.map(cat => (
 *   <Card key={cat.categoryId}>
 *     <p>{cat.categoryName}</p>
 *     <p>{cat.unitCount} units</p>
 *     <p>${cat.totalValue}</p>
 *   </Card>
 * ));
 * ```
 */
export function useStockByCategory() {
  return useQuery({
    queryKey: queryKeys.inventory.stockByCategory(),
    queryFn: async () => {
      const result = await getStockByCategory();
      if (result == null) throw new Error('Stock by category returned no data');
      return result;
    },
    staleTime: 60 * 1000, // 1 minute
  });
}

/**
 * Hook for fetching stock aggregated by warehouse location.
 * Includes percentage of total inventory for each location.
 *
 * @example
 * ```tsx
 * const { data: locations } = useStockByLocation();
 * locations?.map(loc => (
 *   <div key={loc.locationId}>
 *     <span>{loc.locationName}</span>
 *     <Progress value={loc.percentage} />
 *     <span>{loc.percentage}%</span>
 *   </div>
 * ));
 * ```
 */
export function useStockByLocation() {
  return useQuery({
    queryKey: queryKeys.inventory.stockByLocation(),
    queryFn: async () => {
      const result = await getStockByLocation();
      if (result == null) throw new Error('Stock by location returned no data');
      return result;
    },
    staleTime: 60 * 1000, // 1 minute
  });
}

/**
 * Hook for fetching recent inventory movements for timeline display.
 * Movements are simplified to receipt/transfer/allocation types.
 *
 * @param limit - Maximum number of movements to fetch (default: 10)
 *
 * @example
 * ```tsx
 * const { data: movements } = useRecentMovementsTimeline(10);
 * movements?.map(m => (
 *   <div key={m.id}>
 *     <time>{format(m.timestamp, 'HH:mm')}</time>
 *     <span>{m.type}</span>
 *     <span>{m.quantity}</span>
 *     <span>{m.productName}</span>
 *   </div>
 * ));
 * ```
 */
export function useRecentMovementsTimeline(limit = 10) {
  return useQuery({
    queryKey: queryKeys.inventory.recentMovementsTimeline(limit),
    queryFn: async () => {
      const result = await getRecentMovementsTimeline({
        data: { limit }
      });
      if (result == null) throw new Error('Query returned no data');
      return result;
    },
    staleTime: 30 * 1000, // 30 seconds
  });
}
