/**
 * Order Picking Hook
 *
 * TanStack Query mutations for picking and unpicking order items.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import {
  pickOrderItems,
  unpickOrderItems,
} from '@/server/functions/orders/order-picking';
import type { PickOrderItems, UnpickOrderItems } from '@/lib/schemas/orders/picking';

/**
 * Mutation hook for picking order items.
 * Invalidates order detail and list caches on success.
 */
export function usePickOrderItems() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: PickOrderItems) => pickOrderItems({ data }),
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.orders.detail(variables.orderId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.orders.withCustomer(variables.orderId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.orders.lists(),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.fulfillment.lists(),
      });
      // Serial availability changes when picking — SerialPicker (useAvailableSerials) must refresh
      queryClient.invalidateQueries({
        queryKey: [...queryKeys.inventory.all, 'availableSerials'],
      });
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
      queryClient.invalidateQueries({
        queryKey: queryKeys.orders.detail(variables.orderId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.orders.withCustomer(variables.orderId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.orders.lists(),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.fulfillment.lists(),
      });
      // Released serials become available — SerialPicker (useAvailableSerials) must refresh
      queryClient.invalidateQueries({
        queryKey: [...queryKeys.inventory.all, 'availableSerials'],
      });
    },
  });
}
