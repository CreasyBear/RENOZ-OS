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
import { queryKeys } from '@/lib/query-keys';
import { toast } from '../_shared/use-toast';
import {
  getProductInventory,
  getInventoryStats,
  getLowStockAlerts,
  getProductMovements,
  adjustStock,
  receiveStock,
  listLocations,
  getAggregatedProductMovements,
} from '@/server/functions/products/product-inventory';
import { getProductCostLayers } from '@/server/functions/inventory/valuation';

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
      const result = await getProductInventory({
        data: { productId } 
      });
      if (result == null) throw new Error('Query returned no data');
      return result;
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
      const result = await getInventoryStats({
        data: { productId } 
      });
      if (result == null) throw new Error('Query returned no data');
      return result;
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
      const result = await getLowStockAlerts({
        data: { reorderPoint, criticalThreshold, locationId } 
      });
      if (result == null) throw new Error('Query returned no data');
      return result;
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

  return useQuery({
    queryKey: queryKeys.products.movements(productId, { movementType, limit, page }),
    queryFn: async () => {
      const result = await getProductMovements({
        data: { productId, movementType, limit, page, locationId },
      
      });
      if (result == null) throw new Error('Query returned no data');
      return result;
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
      const result = await listLocations({
        data: {} 
      });
      if (result == null) throw new Error('Query returned no data');
      return result;
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
      const result = await getAggregatedProductMovements({
        data: { productId, movementType, limit, page },
      
      });
      if (result == null) throw new Error('Query returned no data');
      return result;
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
    onSuccess: (_, variables) => {
      toast.success('Stock adjusted successfully');
      queryClient.invalidateQueries({
        queryKey: queryKeys.products.inventory(variables.productId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.products.movements(variables.productId, {}),
      });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to adjust stock');
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
      const result = await getProductCostLayers({
        data: { productId } 
      });
      if (result == null) throw new Error('Query returned no data');
      return result;
    },
    enabled: enabled && !!productId,
    staleTime: 30 * 1000,
  });
}

/**
 * Receive stock for a product.
 */
export function useReceiveStock() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Parameters<typeof receiveStock>[0]['data']) =>
      receiveStock({ data }),
    onSuccess: (_, variables) => {
      toast.success('Stock received successfully');
      queryClient.invalidateQueries({
        queryKey: queryKeys.products.inventory(variables.productId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.products.movements(variables.productId, {}),
      });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to receive stock');
    },
  });
}
