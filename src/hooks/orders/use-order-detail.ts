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

// Dynamic imports to prevent server-only code from being bundled to client
const loadOrdersModule = async () => import('@/server/functions/orders/orders');

// Types inferred from server functions
type OrdersModule = Awaited<ReturnType<typeof loadOrdersModule>>;
export type OrderWithCustomer = Awaited<ReturnType<OrdersModule['getOrderWithCustomer']>>;

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
  const getOrderWithCustomerFn = useServerFn(
    async ({ data }: { data: { id: string } }) => {
      const { getOrderWithCustomer } = await loadOrdersModule();
      return getOrderWithCustomer({ data });
    }
  );

  return useQuery({
    queryKey: queryKeys.orders.withCustomer(orderId),
    queryFn: () => getOrderWithCustomerFn({ data: { id: orderId } }),
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

  const updateStatusFn = useServerFn(
    async ({ data }: { data: { id: string; data: UpdateStatusInput } }) => {
      const { updateOrderStatus } = await loadOrdersModule();
      return updateOrderStatus({ data });
    }
  );

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

  const deleteFn = useServerFn(async ({ data }: { data: { id: string } }) => {
    const { deleteOrder } = await loadOrdersModule();
    return deleteOrder({ data });
  });

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

  const duplicateFn = useServerFn(async ({ data }: { data: { id: string } }) => {
    const { duplicateOrder } = await loadOrdersModule();
    return duplicateOrder({ data });
  });

  return useMutation({
    mutationFn: () => duplicateFn({ data: { id: orderId } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.lists() });
    },
  });
}
