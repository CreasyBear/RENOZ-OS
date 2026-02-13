/**
 * Advanced Product Search Hooks
 *
 * TanStack Query hooks for advanced product search features:
 * - Search suggestions with autocomplete
 * - Search facets for filtering
 * - Search event recording for analytics
 *
 * @see src/server/functions/products/product-search.ts
 */

import { useQuery, useMutation } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { queryKeys } from '@/lib/query-keys';
import {
  getSearchSuggestions,
  getSearchFacets,
  recordSearchEvent,
} from '@/server/functions/products/product-search';

// ============================================================================
// TYPES
// ============================================================================

export interface Suggestion {
  type: 'recent' | 'category' | 'product';
  value: string;
  id: string | null;
  sku?: string;
}

export interface Facets {
  status: Array<{ value: string; count: number }>;
  type: Array<{ value: string; count: number }>;
  category: Array<{ id: string; name: string; count: number }>;
  priceRange: { min: number; max: number };
  attributes: Array<{ id: string; name: string; type: string }>;
}

export interface SearchFilters {
  categoryId?: string;
  status?: 'active' | 'inactive' | 'discontinued';
  type?: 'physical' | 'service' | 'digital' | 'bundle';
  minPrice?: number;
  maxPrice?: number;
  attributes?: Array<{
    attributeId: string;
    value: string | number | boolean;
    operator: 'eq' | 'contains';
  }>;
}

// ============================================================================
// HOOKS
// ============================================================================

/**
 * Hook for fetching search suggestions.
 */
export function useSearchSuggestions(query: string, limit = 10) {
  const getSuggestionsFn = useServerFn(getSearchSuggestions);

  return useQuery({
    queryKey: queryKeys.products.search(query, { limit }),
    queryFn: async () => {
      const result = await getSuggestionsFn({
        data: { query, limit }
      });
      if (result == null) throw new Error('Query returned no data');
      return result;
    },
    enabled: query.length >= 2,
    staleTime: 30 * 1000,
  });
}

/**
 * Hook for fetching search facets.
 */
export function useSearchFacets() {
  const getFacetsFn = useServerFn(getSearchFacets);

  return useQuery({
    queryKey: [...queryKeys.products.all, 'facets'] as const,
    queryFn: async () => {
      const result = await getFacetsFn({
        data: {}
      });
      if (result == null) throw new Error('Query returned no data');
      return result;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook for recording search events for analytics.
 */
export function useRecordSearchEvent() {
  const recordFn = useServerFn(recordSearchEvent);

  return useMutation({
    mutationFn: (input: { query: string; resultCount: number; filters?: Record<string, unknown> }) =>
      recordFn({ data: input }),
  });
}
