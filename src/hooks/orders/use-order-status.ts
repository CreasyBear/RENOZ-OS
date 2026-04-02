/**
 * Order Status Mutation Hooks
 *
 * TanStack Query mutations for order status updates.
 * Provides simple status updates for fulfillment workflows.
 *
 * @see src/server/functions/orders/orders.ts for updateOrderStatus
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { queryKeys } from '@/lib/query-keys';
import type {
  ChangeOrderStatusManagedInput,
  OrderStatus,
  OrderStatusOption,
  OrderWorkflowAction,
} from '@/lib/schemas/orders';
import {
  changeOrderStatusManaged,
  getOrderWorkflowOptions,
  getOrderStatusOptions,
  updateOrderStatus,
  bulkUpdateOrderStatus,
} from '@/server/functions/orders/orders';

// ============================================================================
// TYPES
// ============================================================================

export interface UpdateOrderStatusInput {
  id: string;
  status: OrderStatus;
  notes?: string;
}

export interface BulkUpdateOrderStatusInput {
  orderIds: string[];
  status: OrderStatus;
  notes?: string;
}

export interface UseUpdateOrderStatusOptions {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

export interface UseBulkUpdateOrderStatusOptions {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

export interface ManagedOrderStatusOptionsResult {
  orderId: string;
  currentStatus: OrderStatus;
  options: OrderStatusOption[];
}

export interface OrderWorkflowOptionsResult {
  orderId: string;
  currentStatus: OrderStatus;
  actions: OrderWorkflowAction[];
}

function invalidateOrderCollectionQueries(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: queryKeys.orders.lists() });
  queryClient.invalidateQueries({ queryKey: queryKeys.orders.infiniteLists() });
}

// ============================================================================
// MUTATION HOOK
// ============================================================================

/**
 * Hook for updating order status.
 * Used in fulfillment workflows for picking/shipping transitions.
 */
export function useUpdateOrderStatus(options: UseUpdateOrderStatusOptions = {}) {
  const queryClient = useQueryClient();

  const updateFn = useServerFn(updateOrderStatus);

  return useMutation({
    mutationFn: (input: UpdateOrderStatusInput) =>
      updateFn({
        data: {
          id: input.id,
          data: {
            status: input.status,
            notes: input.notes,
          },
        },
      }),
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.withCustomer(variables.id) });
      invalidateOrderCollectionQueries(queryClient);
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.fulfillment() });
      queryClient.invalidateQueries({ queryKey: queryKeys.fulfillment.kanban() });
      // Cancellation releases serial allocations — availableSerials must refresh
      if (variables.status === 'cancelled') {
        queryClient.invalidateQueries({
          queryKey: [...queryKeys.inventory.all, 'availableSerials'],
        });
      }
      options.onSuccess?.();
    },
    onError: (error) => {
      options.onError?.(error);
    },
  });
}

export function useManagedOrderStatusOptions(orderId: string, enabled = true) {
  const getOptionsFn = useServerFn(getOrderStatusOptions);

  return useQuery<ManagedOrderStatusOptionsResult>({
    queryKey: [...queryKeys.orders.detail(orderId), 'managed-status-options'],
    queryFn: () => getOptionsFn({ data: { orderId } }),
    enabled: enabled && !!orderId,
    staleTime: 30 * 1000,
  });
}

export function useOrderWorkflowOptions(orderId: string, enabled = true) {
  const getOptionsFn = useServerFn(getOrderWorkflowOptions);

  return useQuery<OrderWorkflowOptionsResult>({
    queryKey: [...queryKeys.orders.detail(orderId), 'workflow-options'],
    queryFn: () => getOptionsFn({ data: { orderId } }),
    enabled: enabled && !!orderId,
    staleTime: 30 * 1000,
  });
}

export function useChangeOrderStatusManaged(options: UseUpdateOrderStatusOptions = {}) {
  const queryClient = useQueryClient();
  const changeFn = useServerFn(changeOrderStatusManaged);

  return useMutation({
    mutationFn: (input: ChangeOrderStatusManagedInput) => changeFn({ data: input }),
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.detail(variables.orderId) });
      queryClient.invalidateQueries({
        queryKey: queryKeys.orders.withCustomer(variables.orderId),
      });
      queryClient.invalidateQueries({
        queryKey: [...queryKeys.orders.detail(variables.orderId), 'managed-status-options'],
      });
      invalidateOrderCollectionQueries(queryClient);
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.fulfillment() });
      queryClient.invalidateQueries({ queryKey: queryKeys.fulfillment.kanban() });
      options.onSuccess?.();
    },
    onError: (error) => {
      options.onError?.(error);
    },
  });
}

/**
 * Hook for bulk updating order statuses.
 * Used for list-level bulk operations (allocate/ship/status update).
 */
export function useBulkUpdateOrderStatus(options: UseBulkUpdateOrderStatusOptions = {}) {
  const queryClient = useQueryClient();

  const bulkUpdateFn = useServerFn(bulkUpdateOrderStatus);

  return useMutation({
    mutationFn: (input: BulkUpdateOrderStatusInput) =>
      bulkUpdateFn({
        data: input,
      }),
    onSuccess: (_result, variables) => {
      invalidateOrderCollectionQueries(queryClient);
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.details() });
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.fulfillment() });
      queryClient.invalidateQueries({ queryKey: queryKeys.fulfillment.kanban() });
      // Bulk cancellation releases serial allocations — availableSerials must refresh
      if (variables.status === 'cancelled') {
        queryClient.invalidateQueries({
          queryKey: [...queryKeys.inventory.all, 'availableSerials'],
        });
      }
      options.onSuccess?.();
    },
    onError: (error) => {
      options.onError?.(error);
    },
  });
}
