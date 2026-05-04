/**
 * PO Cost Hooks
 *
 * TanStack Query hooks for purchase order cost management.
 *
 * @see src/server/functions/suppliers/po-costs.ts
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import { classifyReadFailureKind, normalizeReadQueryError } from '@/lib/read-path-policy';
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
      try {
        return await getPurchaseOrderCosts({
          data: { purchaseOrderId: poId },
        });
      } catch (error) {
        throw normalizeReadQueryError(error, {
          contractType: 'always-shaped',
          fallbackMessage:
            'Purchase order costs are temporarily unavailable. Please refresh and try again.',
        });
      }
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
      try {
        return await calculateAllocatedCosts({
          data: { purchaseOrderId: poId },
        });
      } catch (error) {
        const normalizedError = normalizeReadQueryError(error, {
          contractType: 'detail-not-found',
          fallbackMessage:
            'Landed cost allocation is temporarily unavailable. Please refresh and try again.',
          notFoundMessage: 'The requested purchase order could not be found.',
        });
        if (
          classifyReadFailureKind(error) === 'validation' &&
          error &&
          typeof error === 'object' &&
          typeof (error as { message?: unknown }).message === 'string'
        ) {
          normalizedError.message = (error as { message: string }).message;
        }
        throw normalizedError;
      }
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
