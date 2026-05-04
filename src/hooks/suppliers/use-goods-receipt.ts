/**
 * Goods Receipt Hooks
 *
 * TanStack Query hooks for goods receipt operations.
 *
 * @see src/server/functions/suppliers/receive-goods.ts
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import { normalizeReadQueryError } from '@/lib/read-path-policy';
import {
  receiveGoods,
  listPurchaseOrderReceipts,
} from '@/server/functions/suppliers';

// ============================================================================
// QUERIES
// ============================================================================

export function usePurchaseOrderReceipts(poId: string, options: { enabled?: boolean } = {}) {
  const { enabled = true } = options;

  return useQuery({
    queryKey: queryKeys.suppliers.purchaseOrderReceipts(poId),
    queryFn: async () => {
      try {
        return await listPurchaseOrderReceipts({
          data: { purchaseOrderId: poId },
        });
      } catch (error) {
        throw normalizeReadQueryError(error, {
          contractType: 'always-shaped',
          fallbackMessage:
            'Purchase order receipts are temporarily unavailable. Please refresh and try again.',
        });
      }
    },
    enabled: enabled && !!poId,
    staleTime: 30 * 1000,
  });
}

// ============================================================================
// MUTATIONS
// ============================================================================

export function useReceiveGoods() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Parameters<typeof receiveGoods>[0]['data']) =>
      receiveGoods({ data }),
    onSuccess: (_, variables) => {
      // Invalidate PO detail (status may have changed)
      queryClient.invalidateQueries({
        queryKey: queryKeys.suppliers.purchaseOrderDetail(variables.purchaseOrderId),
      });
      // Invalidate PO list (status column)
      queryClient.invalidateQueries({
        queryKey: queryKeys.suppliers.purchaseOrdersList(),
      });
      // Invalidate receipts for this PO
      queryClient.invalidateQueries({
        queryKey: queryKeys.suppliers.purchaseOrderReceipts(variables.purchaseOrderId),
      });
      // Invalidate inventory data (balances changed)
      queryClient.invalidateQueries({ queryKey: queryKeys.inventory.all });
      // Invalidate product data (costPrice may have changed)
      queryClient.invalidateQueries({ queryKey: queryKeys.products.all });
    },
  });
}
