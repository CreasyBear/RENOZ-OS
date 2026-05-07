/**
 * Product Inventory Hooks
 *
 * TanStack Query hooks for fetching product inventory data.
 * Replaces direct server function calls with proper cache management.
 *
 * @see STANDARDS.md - Hook Patterns
 * @see src/server/functions/products/product-inventory.ts
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { normalizeReadQueryError } from '@/lib/read-path-policy';
import { queryKeys } from '@/lib/query-keys';
import { toast } from '../_shared/use-toast';
import {
  getProductInventory,
  getInventoryStats,
  getLowStockAlerts,
  getProductMovements,
  adjustStock,
  listLocations,
  getAggregatedProductMovements,
} from '@/server/functions/products/product-inventory';
import { getProductCostLayers } from '@/server/functions/inventory/valuation';
import { mapProductInventoryMutationError } from './product-inventory-error-messages';

// ============================================================================
// TYPES
// ============================================================================

export interface InventorySummary {
  totalOnHand: number;
  totalAvailable: number;
  totalAllocated: number;
  locationCount: number;
  totalValue: number;
}

export interface UseProductInventorySummaryOptions {
  /** Product ID to fetch inventory for */
  productId: string;
  /** Whether to enable the query (useful for conditional fetching) */
  enabled?: boolean;
}

// ============================================================================
// HOOKS
// ============================================================================

/**
 * Fetch product inventory data across all locations.
 *
 * @example
 * ```tsx
 * const { data, isLoading } = useProductInventory({
 *   productId: '...',
 *   enabled: product.trackInventory,
 * });
 * ```
 */
export function useProductInventory(options: UseProductInventorySummaryOptions) {
  const { productId, enabled = true } = options;

  return useQuery({
    queryKey: queryKeys.products.inventory(productId),
    queryFn: async () => {
      try {
        return await getProductInventory({
          data: { productId }
        });
      } catch (error) {
        throw normalizeReadQueryError(error, {
          contractType: 'detail-not-found',
          fallbackMessage: 'Product inventory is temporarily unavailable. Please refresh and try again.',
          notFoundMessage: 'The requested product could not be found.',
        });
      }
    },
    enabled: enabled && !!productId,
    staleTime: 30 * 1000, // 30 seconds
  });
}

/**
 * Fetch inventory statistics for a product.
 *
 * @example
 * ```tsx
 * const { data: stats } = useProductInventoryStats({
 *   productId: '...',
 *   enabled: product.trackInventory,
 * });
 * ```
 */
export function useProductInventoryStats(options: UseProductInventorySummaryOptions) {
  const { productId, enabled = true } = options;

  return useQuery({
    queryKey: queryKeys.products.inventoryStats(productId),
    queryFn: async () => {
      try {
        return await getInventoryStats({
          data: { productId }
        });
      } catch (error) {
        throw normalizeReadQueryError(error, {
          contractType: 'always-shaped',
          fallbackMessage: 'Inventory statistics are temporarily unavailable. Please refresh and try again.',
        });
      }
    },
    enabled: enabled && !!productId,
    staleTime: 30 * 1000, // 30 seconds
  });
}

/**
 * Combined hook for fetching both inventory and stats in parallel.
 * Returns a consolidated summary object.
 *
 * @example
 * ```tsx
 * const { summary, isLoading } = useProductInventorySummary({
 *   productId: '...',
 *   enabled: product.trackInventory,
 * });
 *
 * if (summary) {
 *   console.log(summary.totalOnHand, summary.totalValue);
 * }
 * ```
 */
export function useProductInventorySummary(options: UseProductInventorySummaryOptions) {
  const { productId, enabled = true } = options;

  const inventoryQuery = useProductInventory({ productId, enabled });
  const statsQuery = useProductInventoryStats({ productId, enabled });

  const isLoading = inventoryQuery.isLoading || statsQuery.isLoading;
  const isError = inventoryQuery.isError || statsQuery.isError;
  const error = inventoryQuery.error || statsQuery.error;

  // Combine data into summary if both queries succeeded
  const summary: InventorySummary | null =
    inventoryQuery.data && statsQuery.data
      ? {
          totalOnHand: inventoryQuery.data.totalOnHand ?? 0,
          totalAvailable: inventoryQuery.data.totalAvailable ?? 0,
          totalAllocated: inventoryQuery.data.totalAllocated ?? 0,
          locationCount: inventoryQuery.data.locationCount ?? 0,
          totalValue: statsQuery.data.totalValue ?? 0,
        }
      : null;

  return {
    summary,
    isLoading,
    isError,
    error,
    // Expose individual queries for advanced use cases
    inventoryQuery,
    statsQuery,
  };
}

// ============================================================================
// ADDITIONAL QUERY HOOKS
// ============================================================================

/**
 * Fetch low stock alerts for a product.
 */
export function useLowStockAlerts(options: {
  reorderPoint?: number;
  criticalThreshold?: number;
  locationId?: string;
  enabled?: boolean;
} = {}) {
  const { reorderPoint, criticalThreshold, locationId, enabled = true } = options;

  return useQuery({
    queryKey: queryKeys.products.stockAlerts(locationId ?? 'all'),
    queryFn: async () => {
      try {
        return await getLowStockAlerts({
          data: { reorderPoint, criticalThreshold, locationId }
        });
      } catch (error) {
        throw normalizeReadQueryError(error, {
          contractType: 'always-shaped',
          fallbackMessage: 'Low stock alerts are temporarily unavailable. Please refresh and try again.',
        });
      }
    },
    enabled,
    staleTime: 60 * 1000, // 1 minute
  });
}

/**
 * Fetch inventory movement history for a product.
 */
export function useProductMovements(options: {
  productId: string;
  page?: number;
  limit?: number;
  movementType?: 'receive' | 'allocate' | 'deallocate' | 'pick' | 'ship' | 'adjust' | 'return' | 'transfer';
  locationId?: string;
  enabled?: boolean;
}) {
  const { productId, page = 1, limit = 20, movementType, locationId, enabled = true } = options;
  const movementFilters = { movementType, locationId, limit, page };

  return useQuery({
    queryKey: queryKeys.products.movements(productId, movementFilters),
    queryFn: async () => {
      try {
        return await getProductMovements({
          data: { productId, ...movementFilters },
        });
      } catch (error) {
        throw normalizeReadQueryError(error, {
          contractType: 'always-shaped',
          fallbackMessage: 'Product movement history is temporarily unavailable. Please refresh and try again.',
        });
      }
    },
    enabled: enabled && !!productId,
    staleTime: 30 * 1000,
  });
}

/**
 * Fetch all inventory locations.
 */
export function useInventoryLocations(options: { enabled?: boolean } = {}) {
  const { enabled = true } = options;

  return useQuery({
    queryKey: queryKeys.products.locations(),
    queryFn: async () => {
      try {
        return await listLocations({
          data: {}
        });
      } catch (error) {
        throw normalizeReadQueryError(error, {
          contractType: 'always-shaped',
          fallbackMessage: 'Inventory locations are temporarily unavailable. Please refresh and try again.',
        });
      }
    },
    enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes - locations don't change often
  });
}

/**
 * Fetch aggregated movement history for a product.
 * Groups movements by type + reference + date for a compact view.
 */
export function useAggregatedProductMovements(options: {
  productId: string;
  page?: number;
  limit?: number;
  movementType?: 'receive' | 'allocate' | 'deallocate' | 'pick' | 'ship' | 'adjust' | 'return' | 'transfer';
  enabled?: boolean;
}) {
  const { productId, page = 1, limit = 20, movementType, enabled = true } = options;

  return useQuery({
    queryKey: queryKeys.products.movementsAggregated(productId, { movementType, limit, page }),
    queryFn: async () => {
      try {
        return await getAggregatedProductMovements({
          data: { productId, movementType, limit, page },
        });
      } catch (error) {
        throw normalizeReadQueryError(error, {
          contractType: 'always-shaped',
          fallbackMessage: 'Aggregated inventory movements are temporarily unavailable. Please refresh and try again.',
        });
      }
    },
    enabled: enabled && !!productId,
    staleTime: 30 * 1000,
  });
}

// ============================================================================
// MUTATION HOOKS
// ============================================================================

/**
 * Adjust stock levels for a product.
 */
export function useAdjustStock() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Parameters<typeof adjustStock>[0]['data']) =>
      adjustStock({ data }),
    onSuccess: (result, variables) => {
      toast.success(result.message || 'Stock adjusted successfully');
      queryClient.invalidateQueries({
        queryKey: queryKeys.products.detail(variables.productId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.products.inventory(variables.productId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.products.inventoryStats(variables.productId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.products.stockAlertsAll(),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.products.movementsForProduct(variables.productId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.products.movementsAggregatedForProduct(variables.productId),
      });
    },
    onError: (error: Error) => {
      toast.error(mapProductInventoryMutationError(error));
    },
  });
}

/**
 * Fetch FIFO cost layers for a product.
 * Shows landed cost breakdown from purchase receipts.
 *
 * @example
 * ```tsx
 * const { data: costLayersData } = useProductCostLayers({
 *   productId: '...',
 *   enabled: product.trackInventory,
 * });
 * ```
 */
export function useProductCostLayers(options: UseProductInventorySummaryOptions) {
  const { productId, enabled = true } = options;

  return useQuery({
    queryKey: queryKeys.inventory.costLayersDetail(productId),
    queryFn: async () => {
      try {
        return await getProductCostLayers({
          data: { productId }
        });
      } catch (error) {
        throw normalizeReadQueryError(error, {
          contractType: 'detail-not-found',
          fallbackMessage: 'Cost layers are temporarily unavailable. Please refresh and try again.',
          notFoundMessage: 'The requested product could not be found.',
        });
      }
    },
    enabled: enabled && !!productId,
    staleTime: 30 * 1000,
  });
}
