/**
 * Fulfillment Kanban Hooks
 *
 * TanStack Query hooks for order fulfillment kanban board.
 * Provides data fetching, mutations, and real-time updates for fulfillment workflow.
 *
 * @see src/hooks/realtime/use-orders-realtime.ts for realtime integration
 * @see src/server/functions/orders/orders.ts for listFulfillmentKanbanOrders
 */

import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { queryKeys } from '@/lib/query-keys';
import {
  listFulfillmentKanbanOrders,
  updateOrderStatus,
  bulkUpdateOrderStatus,
  type FulfillmentKanbanResult,
  type FulfillmentKanbanOrder,
} from '@/server/functions/orders/orders';
import { useOrdersRealtime } from '@/hooks/realtime/use-orders-realtime';
import { useCurrentOrg } from '@/hooks/auth';
import type { OrderStatus } from '@/lib/schemas/orders';

// Query keys are now centralized in @/lib/query-keys.ts

// ============================================================================
// KANBAN DATA TYPES
// ============================================================================

export interface FulfillmentKanbanData {
  stages: {
    to_allocate: FulfillmentKanbanOrder[];
    to_pick: FulfillmentKanbanOrder[];
    picking: FulfillmentKanbanOrder[];
    to_ship: FulfillmentKanbanOrder[];
    shipped_today: FulfillmentKanbanOrder[];
  };
  total: number;
  filters: Record<string, unknown>;
}

// ============================================================================
// MAIN KANBAN HOOK
// ============================================================================

export interface UseFulfillmentKanbanOptions {
  customerId?: string;
  dateFrom?: Date;
  dateTo?: Date;
  search?: string;
  enabled?: boolean;
}

/**
 * Main hook for fulfillment kanban board data.
 * Combines server-side data fetching with real-time updates.
 */
export function useFulfillmentKanban(options: UseFulfillmentKanbanOptions = {}) {
  const { currentOrg } = useCurrentOrg();
  const { customerId, dateFrom, dateTo, search, enabled = true } = options;

  const listFn = useServerFn(listFulfillmentKanbanOrders);
  const queryClient = useQueryClient();

  const filters = {
    customerId,
    dateFrom,
    dateTo,
    search,
  };

  // Main kanban data query
  const query = useQuery({
    queryKey: queryKeys.fulfillment.list(filters),
    queryFn: () => listFn({ data: filters }),
    enabled,
    refetchInterval: 30000, // Poll every 30 seconds for live updates
    staleTime: 10000, // Consider data stale after 10 seconds
    gcTime: 300000, // Keep in cache for 5 minutes

    // Transform data for kanban consumption
    select: (data: FulfillmentKanbanResult): FulfillmentKanbanData => {
      // Apply any additional sorting if needed
      const sortedStages = { ...data.stages };

      // Sort orders within each stage by creation date (newest first)
      Object.keys(sortedStages).forEach((stage) => {
        sortedStages[stage as keyof typeof sortedStages].sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      });

      return {
        stages: sortedStages,
        total: data.total,
        filters,
      };
    },
  });

  // Real-time updates integration
  const realtime = useOrdersRealtime({
    organizationId: currentOrg?.id || '',
    enabled: enabled && query.isSuccess && !!currentOrg?.id,
    onOrderUpdate: (payload) => {
      // Invalidate kanban queries when orders change
      if (payload.type === 'UPDATE' || payload.type === 'INSERT' || payload.type === 'DELETE') {
        queryClient.invalidateQueries({
          queryKey: queryKeys.fulfillment.kanban(),
        });
      }
    },
  });

  return {
    ...query,
    realtimeStatus: realtime.status,
    reconnectAttempts: realtime.reconnectAttempts,
    reconnect: realtime.reconnect,
  };
}

// ============================================================================
// STATUS UPDATE MUTATION
// ============================================================================

export interface UseUpdateFulfillmentOrderStatusOptions {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

/**
 * Update order status for kanban drag-drop operations.
 * Provides optimistic updates and proper error handling.
 */
export function useUpdateFulfillmentOrderStatus(
  options: UseUpdateFulfillmentOrderStatusOptions = {}
) {
  const updateStatusMutation = useServerFn(updateOrderStatus);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { orderId: string; status: OrderStatus; notes?: string }) =>
      updateStatusMutation({
        data: {
          id: input.orderId,
          data: {
            status: input.status,
            notes: input.notes,
          },
        },
      }),
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.fulfillment.kanban() });

      const previous = queryClient.getQueriesData<FulfillmentKanbanData>({
        queryKey: queryKeys.fulfillment.kanban(),
      });

      queryClient.setQueriesData<FulfillmentKanbanData>(
        { queryKey: queryKeys.fulfillment.kanban() },
        (oldData) => {
          if (!oldData) return oldData;

          const newStages = { ...oldData.stages };
          let movedOrder: FulfillmentKanbanOrder | null = null;

          Object.entries(newStages).forEach(([stage, orders]) => {
            const orderIndex = (orders as FulfillmentKanbanOrder[]).findIndex(
              (o) => o.id === input.orderId
            );
            if (orderIndex !== -1) {
              movedOrder = (orders as FulfillmentKanbanOrder[])[orderIndex];
              (newStages[stage as keyof typeof newStages] as FulfillmentKanbanOrder[]).splice(
                orderIndex,
                1
              );
            }
          });

          if (movedOrder) {
            const targetStage = getStageForStatus(input.status);
            if (targetStage && newStages[targetStage]) {
              const updatedOrder = {
                ...(movedOrder as FulfillmentKanbanOrder),
                status: input.status,
              };
              (newStages[targetStage] as FulfillmentKanbanOrder[]).unshift(updatedOrder);
            }
          }

          return {
            ...oldData,
            stages: newStages,
          };
        }
      );

      return { previous };
    },
    onError: (error, _input, context) => {
      if (context?.previous) {
        context.previous.forEach(([key, data]) => {
          queryClient.setQueryData(key, data);
        });
      }
      options.onError?.(error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.fulfillment.kanban(),
      });
      options.onSuccess?.();
    },
  });
}

// ============================================================================
// BULK OPERATIONS
// ============================================================================

export interface UseBulkUpdateFulfillmentOrdersOptions {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

/**
 * Bulk update order statuses for fulfillment operations.
 */
export function useBulkUpdateFulfillmentOrders(
  options: UseBulkUpdateFulfillmentOrdersOptions = {}
) {
  const bulkUpdateMutation = useServerFn(bulkUpdateOrderStatus);
  const queryClient = useQueryClient();

  return {
    mutateAsync: async (input: { orderIds: string[]; status: OrderStatus; notes?: string }) => {
      try {
        const result = await bulkUpdateMutation({
          data: {
            orderIds: input.orderIds,
            status: input.status,
            notes: input.notes,
          },
        });

        // Invalidate kanban queries to refresh the board
        await queryClient.invalidateQueries({
          queryKey: queryKeys.fulfillment.kanban(),
        });

        options.onSuccess?.();
        return result;
      } catch (error) {
        options.onError?.(error as Error);
        throw error;
      }
    },

    isPending: false, // Could be enhanced with proper loading state
  };
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Map order status to kanban stage
 */
function getStageForStatus(status: OrderStatus): keyof FulfillmentKanbanData['stages'] | null {
  switch (status) {
    case 'confirmed':
      return 'to_allocate';
    case 'picking':
      return 'picking';
    case 'picked':
      return 'to_ship';
    case 'shipped':
      return 'shipped_today';
    default:
      return null;
  }
}

/**
 * Get kanban column configuration and status validation rules.
 */
export function useFulfillmentKanbanConfig() {
  return {
    columns: [
      {
        id: 'to_allocate',
        name: 'To Allocate',
        color: 'orange',
        description: 'Orders awaiting stock allocation',
      },
      { id: 'to_pick', name: 'To Pick', color: 'blue', description: 'Orders ready for picking' },
      {
        id: 'picking',
        name: 'Picking',
        color: 'yellow',
        description: 'Orders currently being picked',
      },
      {
        id: 'to_ship',
        name: 'To Ship',
        color: 'green',
        description: 'Picked orders ready for shipping',
      },
      {
        id: 'shipped_today',
        name: 'Shipped Today',
        color: 'purple',
        description: 'Orders shipped today',
      },
    ] as const,

    // Status transition validation
    canTransition: (from: string, to: string): boolean => {
      const validTransitions: Record<string, string[]> = {
        to_allocate: ['to_pick', 'picking'],
        to_pick: ['picking'],
        picking: ['to_ship'],
        to_ship: ['shipped_today'],
        shipped_today: [], // Final stage
      };

      return validTransitions[from]?.includes(to) ?? false;
    },

    // Get column display name
    getColumnName: (stage: string): string => {
      const column = [
        { id: 'to_allocate', name: 'To Allocate' },
        { id: 'to_pick', name: 'To Pick' },
        { id: 'picking', name: 'Picking' },
        { id: 'to_ship', name: 'To Ship' },
        { id: 'shipped_today', name: 'Shipped Today' },
      ].find((col) => col.id === stage);
      return column?.name || stage;
    },

    // Get stage for status
    getStageForStatus,
  };
}
