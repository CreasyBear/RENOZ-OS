/**
 * Tracked Products Hook
 *
 * Manages user's tracked product selection (localStorage-backed)
 * and fetches inventory counts for selected products.
 *
 * @see src/lib/schemas/dashboard/tracked-products.ts
 * @see src/server/functions/dashboard/dashboard-metrics.ts
 */

import { useState, useCallback, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import { getInventoryCountsByProductIds } from '@/server/functions/dashboard';
import type {
  TrackedProduct,
  TrackedProductWithInventory,
} from '@/lib/schemas/dashboard/tracked-products';

// Re-export types from schema
export type { TrackedProduct, TrackedProductWithInventory };

// ============================================================================
// TYPES
// ============================================================================

export interface UseTrackedProductsOptions {
  /** localStorage key for persistence */
  storageKey?: string;
  /** Maximum number of products to track */
  maxProducts?: number;
  /** Whether to fetch inventory counts */
  fetchInventory?: boolean;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const DEFAULT_STORAGE_KEY = 'dashboard:tracked-products';
const DEFAULT_MAX_PRODUCTS = 5;

// ============================================================================
// HOOK
// ============================================================================

/**
 * Hook for managing tracked products on the dashboard.
 *
 * @example
 * ```tsx
 * const {
 *   products,
 *   setProducts,
 *   productsWithInventory,
 *   isLoading,
 * } = useTrackedProducts();
 *
 * // Show inventory counts
 * productsWithInventory.map(p => (
 *   <div key={p.id}>{p.name}: {p.quantity} in stock</div>
 * ));
 *
 * // Update tracked products
 * setProducts([{ id: '...', sku: 'ABC', name: 'Product' }]);
 * ```
 */
export function useTrackedProducts(options: UseTrackedProductsOptions = {}) {
  const {
    storageKey = DEFAULT_STORAGE_KEY,
    maxProducts = DEFAULT_MAX_PRODUCTS,
    fetchInventory = true,
  } = options;

  // Load initial state from localStorage
  const [products, setProductsState] = useState<TrackedProduct[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          return parsed.slice(0, maxProducts);
        }
      }
    } catch {
      // Ignore parse errors
    }
    return [];
  });

  // Persist to localStorage when products change
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(products));
    } catch {
      // Ignore storage errors
    }
  }, [products, storageKey]);

  // Set products with validation
  const setProducts = useCallback(
    (newProducts: TrackedProduct[]) => {
      setProductsState(newProducts.slice(0, maxProducts));
    },
    [maxProducts]
  );

  // Add a product
  const addProduct = useCallback(
    (product: TrackedProduct) => {
      setProductsState((prev) => {
        if (prev.length >= maxProducts) return prev;
        if (prev.some((p) => p.id === product.id)) return prev;
        return [...prev, product];
      });
    },
    [maxProducts]
  );

  // Remove a product
  const removeProduct = useCallback((productId: string) => {
    setProductsState((prev) => prev.filter((p) => p.id !== productId));
  }, []);

  // Clear all products
  const clearProducts = useCallback(() => {
    setProductsState([]);
  }, []);

  // Get product IDs for query
  const productIds = useMemo(() => products.map((p) => p.id), [products]);

  // Fetch inventory counts
  const inventoryQuery = useQuery({
    queryKey: queryKeys.dashboard.trackedProductsInventory(productIds),
    queryFn: async () => {
      const result = await getInventoryCountsByProductIds({
        data: { productIds } 
      });
      if (result == null) throw new Error('Query returned no data');
      return result;
    },
    enabled: fetchInventory && productIds.length > 0,
    staleTime: 60 * 1000, // 1 minute
  });

  // Combine products with inventory data
  const productsWithInventory: TrackedProductWithInventory[] = useMemo(() => {
    const inventoryMap = inventoryQuery.data ?? {};
    return products.map((product) => ({
      ...product,
      quantity: inventoryMap[product.id]?.totalQuantity ?? 0,
    }));
  }, [products, inventoryQuery.data]);

  return {
    // State
    products,
    productsWithInventory,
    maxProducts,

    // Actions
    setProducts,
    addProduct,
    removeProduct,
    clearProducts,

    // Query state
    isLoading: inventoryQuery.isLoading,
    isError: inventoryQuery.isError,
    error: inventoryQuery.error,
  };
}
