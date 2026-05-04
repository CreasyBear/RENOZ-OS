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
import { normalizeReadQueryError } from '@/lib/read-path-policy';
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
        try {
          return await getPurchaseOrder({
            data: { id: poId },
          });
        } catch (error) {
          throw normalizeReadQueryError(error, {
            contractType: 'detail-not-found',
            fallbackMessage:
              'Purchase order details are temporarily unavailable. Please refresh and try again.',
            notFoundMessage: 'The requested purchase order could not be found.',
          });
        }
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
