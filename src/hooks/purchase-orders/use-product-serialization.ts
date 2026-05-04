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
import { normalizeReadQueryError } from '@/lib/read-path-policy';
import type { GetProductResponse } from '@/lib/schemas/products';

// ============================================================================
// TYPES
// ============================================================================

export interface ProductSerializationMap {
  get(productId: string): boolean | undefined;
  has(productId: string): boolean;
}

export interface ProductSerializationError {
  productId: string;
  error: Error;
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
  errors: ProductSerializationError[];
  refetchErroredProducts: () => void;
} {
  const uniqueProductIds = Array.from(
    new Set(productIds.filter((productId) => productId.length > 0))
  );

  const productQueries = useQueries({
    queries: uniqueProductIds.map((productId) => ({
      queryKey: queryKeys.products.detail(productId),
      queryFn: async (): Promise<GetProductResponse> => {
        try {
          return await getProduct({ data: { id: productId } });
        } catch (error) {
          throw normalizeReadQueryError(error, {
            contractType: 'detail-not-found',
            fallbackMessage:
              'Product serialization requirements are temporarily unavailable. Please refresh and try again.',
            notFoundMessage: 'A product on this purchase order could not be found.',
          });
        }
      },
      enabled: enabled && !!productId,
      staleTime: 60 * 1000,
    })),
  });

  // Create map of productId -> isSerialized
  const serializationMap = new Map<string, boolean>();
  productQueries.forEach((query, index) => {
    const productId = uniqueProductIds[index];
    if (productId && query.data?.product) {
      serializationMap.set(productId, query.data.product.isSerialized ?? false);
    }
  });

  const isLoading = productQueries.some((query) => query.isLoading);
  const hasErrors = productQueries.some((query) => query.isError);
  const errors = productQueries
    .map((query, index) => ({
      productId: uniqueProductIds[index],
      error: query.error,
    }))
    .filter((item): item is ProductSerializationError => Boolean(item.productId && item.error));

  const refetchErroredProducts = () => {
    productQueries.forEach((query) => {
      if (query.isError) {
        query.refetch();
      }
    });
  };

  return {
    serializationMap,
    isLoading,
    hasErrors,
    errors,
    refetchErroredProducts,
  };
}
