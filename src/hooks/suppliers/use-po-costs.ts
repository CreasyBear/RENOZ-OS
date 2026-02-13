/**
 * PO Cost Hooks
 *
 * TanStack Query hooks for purchase order cost management.
 *
 * @see src/server/functions/suppliers/po-costs.ts
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import {
  getPurchaseOrderCosts,
  addPurchaseOrderCost,
  updatePurchaseOrderCost,
  deletePurchaseOrderCost,
  calculateAllocatedCosts,
} from '@/server/functions/suppliers';

// ============================================================================
// QUERIES
// ============================================================================

export function usePurchaseOrderCosts(poId: string, options: { enabled?: boolean } = {}) {
  const { enabled = true } = options;

  return useQuery({
    queryKey: queryKeys.suppliers.purchaseOrderCosts(poId),
    queryFn: async () => {
      const result = await getPurchaseOrderCosts({
        data: { purchaseOrderId: poId } 
      });
      if (result == null) throw new Error('Query returned no data');
      return result;
    },
    enabled: enabled && !!poId,
    staleTime: 30 * 1000,
  });
}

export function useAllocatedCosts(poId: string, options: { enabled?: boolean } = {}) {
  const { enabled = true } = options;

  return useQuery({
    queryKey: queryKeys.suppliers.purchaseOrderAllocatedCosts(poId),
    queryFn: async () => {
      const result = await calculateAllocatedCosts({
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

export function useAddPurchaseOrderCost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Parameters<typeof addPurchaseOrderCost>[0]['data']) =>
      addPurchaseOrderCost({ data }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.suppliers.purchaseOrderCosts(variables.purchaseOrderId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.suppliers.purchaseOrderAllocatedCosts(variables.purchaseOrderId),
      });
    },
  });
}

export function useUpdatePurchaseOrderCost(poId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Parameters<typeof updatePurchaseOrderCost>[0]['data']) =>
      updatePurchaseOrderCost({ data }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.suppliers.purchaseOrderCosts(poId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.suppliers.purchaseOrderAllocatedCosts(poId),
      });
    },
  });
}

export function useDeletePurchaseOrderCost(poId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Parameters<typeof deletePurchaseOrderCost>[0]['data']) =>
      deletePurchaseOrderCost({ data }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.suppliers.purchaseOrderCosts(poId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.suppliers.purchaseOrderAllocatedCosts(poId),
      });
    },
  });
}
