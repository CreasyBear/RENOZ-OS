'use client';

/**
 * Order Detail Hook
 *
 * Fetches order with customer details and provides mutations for order actions.
 * Used by OrderDetailContainer.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { queryKeys } from '@/lib/query-keys';
import type { OrderStatus } from '@/lib/schemas/orders';
import {
  getOrderWithCustomer,
  updateOrderStatus,
  deleteOrder,
  duplicateOrder,
} from '@/server/functions/orders/orders';

export type OrderWithCustomer = Awaited<ReturnType<typeof getOrderWithCustomer>>;

// ============================================================================
// ORDER WITH CUSTOMER HOOK
// ============================================================================

export interface UseOrderWithCustomerOptions {
  orderId: string;
  enabled?: boolean;
  /** Poll interval in ms (default: 30000) */
  refetchInterval?: number | false;
}

/**
 * Fetch order with customer details.
 * Provides more complete data than useOrder for detail views.
 */
export function useOrderWithCustomer({
  orderId,
  enabled = true,
  refetchInterval = 30000,
}: UseOrderWithCustomerOptions) {
  const getOrderWithCustomerFn = useServerFn(getOrderWithCustomer);

  return useQuery({
    queryKey: queryKeys.orders.withCustomer(orderId),
    queryFn: async () => {
      const result = await getOrderWithCustomerFn({
        data: { id: orderId }
      });
      if (result == null) throw new Error('Query returned no data');
      return result;
    },
    enabled: enabled && !!orderId,
    staleTime: 60 * 1000, // 60 seconds
    refetchInterval,
  });
}

// ============================================================================
// STATUS UPDATE HOOK
// ============================================================================

export interface UpdateStatusInput {
  status: OrderStatus;
  notes?: string;
}

export function useOrderDetailStatusUpdate(orderId: string) {
  const queryClient = useQueryClient();

  const updateStatusFn = useServerFn(updateOrderStatus);

  return useMutation({
    mutationFn: (input: UpdateStatusInput) =>
      updateStatusFn({ data: { id: orderId, data: input } }),
    onSuccess: () => {
      // Invalidate both detail and list queries
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.withCustomer(orderId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.detail(orderId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.lists() });
    },
  });
}

// ============================================================================
// DELETE ORDER HOOK (with confirmation state)
// ============================================================================

export function useDeleteOrderWithConfirmation(orderId: string) {
  const queryClient = useQueryClient();

  const deleteFn = useServerFn(deleteOrder);

  return useMutation({
    mutationFn: () => deleteFn({ data: { id: orderId } }),
    onSuccess: () => {
      // Remove from cache and invalidate lists
      queryClient.removeQueries({ queryKey: queryKeys.orders.withCustomer(orderId) });
      queryClient.removeQueries({ queryKey: queryKeys.orders.detail(orderId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.lists() });
    },
  });
}

// ============================================================================
// DUPLICATE ORDER HOOK
// ============================================================================

export function useDuplicateOrderById(orderId: string) {
  const queryClient = useQueryClient();

  const duplicateFn = useServerFn(duplicateOrder);

  return useMutation({
    mutationFn: () => duplicateFn({ data: { id: orderId } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.lists() });
    },
  });
}
