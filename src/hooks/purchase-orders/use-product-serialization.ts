/**
 * Product Serialization Hook
 *
 * Fetches product serialization data for PO items.
 * Used to determine if products require serial numbers during receiving.
 *
 * @see STANDARDS.md - Hook patterns
 * @see SCHEMA-TRACE.md - Data flow patterns
 */

import { useQueries } from '@tanstack/react-query';
import { getProduct } from '@/server/functions/products/products';
import { queryKeys } from '@/lib/query-keys';
import type { GetProductResponse } from '@/lib/schemas/products';

// ============================================================================
// TYPES
// ============================================================================

export interface ProductSerializationMap {
  get(productId: string): boolean | undefined;
  has(productId: string): boolean;
}

// ============================================================================
// HOOK
// ============================================================================

/**
 * Fetches product serialization data for a list of product IDs.
 * Returns a map of productId -> isSerialized.
 *
 * @param productIds - Array of product IDs to check
 * @param enabled - Whether to enable the queries
 * @returns Map of productId -> isSerialized boolean
 */
export function useProductSerialization(
  productIds: string[],
  enabled = true
): {
  serializationMap: ProductSerializationMap;
  isLoading: boolean;
  hasErrors: boolean;
} {
  const productQueries = useQueries({
    queries: productIds.map((productId) => ({
      queryKey: queryKeys.products.detail(productId),
      queryFn: async (): Promise<GetProductResponse> => getProduct({ data: { id: productId } }),
      enabled: enabled && !!productId,
      staleTime: 60 * 1000,
    })),
  });

  // Create map of productId -> isSerialized
  const serializationMap = new Map<string, boolean>();
  productQueries.forEach((query, index) => {
    const productId = productIds[index];
    if (productId && query.data?.product) {
      serializationMap.set(productId, query.data.product.isSerialized ?? false);
    }
  });

  const isLoading = productQueries.some((query) => query.isLoading);
  const hasErrors = productQueries.some((query) => query.isError);

  return {
    serializationMap,
    isLoading,
    hasErrors,
  };
}
