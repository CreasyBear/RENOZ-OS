/**
 * Order Picking Hook
 *
 * TanStack Query mutations for picking and unpicking order items.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  pickOrderItems,
  unpickOrderItems,
} from '@/server/functions/orders/order-picking';
import type { PickOrderItems, UnpickOrderItems } from '@/lib/schemas/orders/picking';
import { invalidatePickingMutationQueries } from './_fulfillment-cache';

/**
 * Mutation hook for picking order items.
 * Invalidates order detail and list caches on success.
 */
export function usePickOrderItems() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: PickOrderItems) => pickOrderItems({ data }),
    onSuccess: (_result, variables) => {
      invalidatePickingMutationQueries(queryClient, variables.orderId);
    },
  });
}

/**
 * Mutation hook for unpicking order items.
 * Invalidates order detail, list, fulfillment, and inventory serial availability caches on success.
 */
export function useUnpickOrderItems() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UnpickOrderItems) => unpickOrderItems({ data }),
    onSuccess: (_result, variables) => {
      invalidatePickingMutationQueries(queryClient, variables.orderId);
    },
  });
}
