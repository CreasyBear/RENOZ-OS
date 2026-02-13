/**
 * Order Status Mutation Hooks
 *
 * TanStack Query mutations for order status updates.
 * Provides simple status updates for fulfillment workflows.
 *
 * @see src/server/functions/orders/orders.ts for updateOrderStatus
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { queryKeys } from '@/lib/query-keys';
import type { OrderStatus } from '@/lib/schemas/orders';
import {
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
    onSuccess: () => {
      // Invalidate order lists and fulfillment queries
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.lists() });
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.details() });
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.fulfillment() });
      queryClient.invalidateQueries({ queryKey: queryKeys.fulfillment.kanban() });
      options.onSuccess?.();
    },
    onError: (error) => {
      options.onError?.(error);
    },
  });
}
