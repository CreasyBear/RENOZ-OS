/**
 * Order Picking Hook
 *
 * TanStack Query mutation for picking order items.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import { pickOrderItems } from '@/server/functions/orders/order-picking';
import type { PickOrderItems } from '@/lib/schemas/orders/picking';

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
    },
  });
}
