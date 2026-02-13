/**
 * Goods Receipt Hooks
 *
 * TanStack Query hooks for goods receipt operations.
 *
 * @see src/server/functions/suppliers/receive-goods.ts
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
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
      const result = await listPurchaseOrderReceipts({
        data: { purchaseOrderId: poId } 
      });
      if (result == null) throw new Error('Query returned no data');
      return result;
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
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      // Invalidate product data (costPrice may have changed)
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}
