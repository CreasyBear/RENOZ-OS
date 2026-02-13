/**
 * Dashboard Inventory Counts Hook
 *
 * TanStack Query hook for fetching inventory counts by SKU patterns.
 * Used for dashboard widgets showing key product stock levels.
 *
 * @see src/lib/schemas/dashboard/tracked-products.ts
 * @see src/server/functions/dashboard/dashboard-metrics.ts
 */

import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import { getInventoryCountsBySkus } from '@/server/functions/dashboard';
import type {
  SkuPatternGroup,
  InventoryCountResult,
} from '@/lib/schemas/dashboard/tracked-products';

// Re-export types from schema
export type { SkuPatternGroup, InventoryCountResult };

// ============================================================================
// TYPES
// ============================================================================

export interface UseInventoryCountsBySkusOptions {
  /** Array of SKU pattern groups to query */
  skuPatterns: SkuPatternGroup[];
  /** Whether to enable the query */
  enabled?: boolean;
}

// ============================================================================
// HOOK
// ============================================================================

/**
 * Fetch inventory counts for specific SKU patterns.
 *
 * @example
 * ```tsx
 * const { data, isLoading } = useInventoryCountsBySkus({
 *   skuPatterns: [
 *     { key: 'batteries', patterns: ['lv-5kwh100ah'] },
 *     { key: 'kits', patterns: ['lv-top', 'lv-bottom'] },
 *   ],
 * });
 *
 * // Access results
 * const batteriesCount = data?.batteries?.totalQuantity ?? 0;
 * const kitsCount = data?.kits?.totalQuantity ?? 0;
 * ```
 */
export function useInventoryCountsBySkus(options: UseInventoryCountsBySkusOptions) {
  const { skuPatterns, enabled = true } = options;

  return useQuery({
    queryKey: queryKeys.dashboard.inventoryCounts(skuPatterns),
    queryFn: async () => {
      const result = await getInventoryCountsBySkus({
        data: { skuPatterns } 
      });
      if (result == null) throw new Error('Query returned no data');
      return result;
    },
    enabled: enabled && skuPatterns.length > 0,
    staleTime: 60 * 1000, // 1 minute
  });
}
