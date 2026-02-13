/**
 * Bulk Purchase Orders Hook
 *
 * Fetches multiple purchase orders by IDs.
 * Used for bulk operations that need PO details.
 *
 * @see STANDARDS.md - Hook patterns
 * @see SCHEMA-TRACE.md - Data flow patterns
 */

import { useQueries } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import { getPurchaseOrder } from '@/server/functions/suppliers/purchase-orders';

// ============================================================================
// TYPES
// ============================================================================

export interface UseBulkPurchaseOrdersOptions {
  purchaseOrderIds: string[];
  enabled?: boolean;
}

// ============================================================================
// HOOK
// ============================================================================

/**
 * Fetches multiple purchase orders by IDs.
 * Returns array of query results matching the input order.
 *
 * @param options - Configuration options
 * @returns Array of useQuery results for each PO
 */
export function useBulkPurchaseOrders({
  purchaseOrderIds,
  enabled = true,
}: UseBulkPurchaseOrdersOptions) {
  const queries = useQueries({
    queries: purchaseOrderIds.map((poId) => ({
      queryKey: queryKeys.suppliers.purchaseOrderDetail(poId),
      queryFn: async () => {
      const result = await getPurchaseOrder({
        data: { id: poId } 
      });
      if (result == null) throw new Error('Query returned no data');
      return result;
    },
      enabled: enabled && !!poId,
      staleTime: 30 * 1000,
    })),
  });

  const isLoading = queries.some((query) => query.isLoading);
  const hasErrors = queries.some((query) => query.isError);
  const errors = queries
    .map((query, index) => ({
      poId: purchaseOrderIds[index],
      error: query.error,
    }))
    .filter((item) => item.error);

  return {
    queries,
    isLoading,
    hasErrors,
    errors,
  };
}
