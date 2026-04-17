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
import { normalizeReadQueryError } from '@/lib/read-path-policy';
import type { OrderStatus } from '@/lib/schemas/orders';
import {
  getOrderWithCustomer,
  updateOrderStatus,
  deleteOrder,
  duplicateOrder,
} from '@/server/functions/orders/orders';
import type { Address } from 'drizzle/schema';
import {
  expectOrderQueryData,
  normalizeOrderMutationError,
} from './order-mutation-client-errors';

type BaseOrderWithCustomer = Awaited<ReturnType<typeof getOrderWithCustomer>>;

function invalidateOrderCollectionQueries(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: queryKeys.orders.lists() });
  queryClient.invalidateQueries({ queryKey: queryKeys.orders.infiniteLists() });
}

/** Order with customer; customer includes addresses when present (from getOrderWithCustomer) */
export type OrderWithCustomer = Omit<BaseOrderWithCustomer, 'customer'> & {
  customer: (BaseOrderWithCustomer['customer'] & { addresses?: Address[] }) | null;
};

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

  return useQuery<OrderWithCustomer>({
    queryKey: queryKeys.orders.withCustomer(orderId),
    queryFn: async () => {
      try {
        const result = await getOrderWithCustomerFn({
          data: { id: orderId }
        });
        return expectOrderQueryData(result, 'Order detail is unavailable.') as OrderWithCustomer;
      } catch (error) {
        throw normalizeReadQueryError(error, {
          contractType: 'detail-not-found',
          fallbackMessage: 'Order details are temporarily unavailable. Please refresh and try again.',
          notFoundMessage: 'The requested order could not be found.',
        });
      }
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
    mutationFn: async (input: UpdateStatusInput) => {
      try {
        return await updateStatusFn({ data: { id: orderId, data: input } });
      } catch (error) {
        throw normalizeOrderMutationError(error, 'Unable to update order status.');
      }
    },
    onSuccess: () => {
      // Invalidate both detail and list queries
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.withCustomer(orderId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.detail(orderId) });
      invalidateOrderCollectionQueries(queryClient);
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
    mutationFn: async () => {
      try {
        return await deleteFn({ data: { id: orderId } });
      } catch (error) {
        throw normalizeOrderMutationError(error, 'Unable to delete order.');
      }
    },
    onSuccess: () => {
      // Remove from cache and invalidate lists
      queryClient.removeQueries({ queryKey: queryKeys.orders.withCustomer(orderId) });
      queryClient.removeQueries({ queryKey: queryKeys.orders.detail(orderId) });
      invalidateOrderCollectionQueries(queryClient);
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
    mutationFn: async () => {
      try {
        return await duplicateFn({ data: { id: orderId } });
      } catch (error) {
        throw normalizeOrderMutationError(error, 'Unable to duplicate order.');
      }
    },
    onSuccess: () => {
      invalidateOrderCollectionQueries(queryClient);
    },
  });
}
