/**
 * Assignees Hook
 *
 * Provides functionality for fetching and managing order assignees.
 * Filters users by appropriate roles for order fulfillment assignment.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { listUsers } from '@/server/functions/users/users';
import { updateOrder } from '@/server/functions/orders/orders';
import { useCurrentOrg } from '@/hooks/auth';
import { queryKeys } from '@/lib/query-keys';

type OrderDetail = Awaited<ReturnType<typeof updateOrder>>;

/**
 * Available assignee roles for order fulfillment
 */
const ASSIGNEE_ROLES = ['admin', 'manager', 'operations', 'sales'] as const;
const isAssigneeRole = (role: string): role is (typeof ASSIGNEE_ROLES)[number] =>
  ASSIGNEE_ROLES.includes(role as (typeof ASSIGNEE_ROLES)[number]);

/**
 * Hook for fetching available assignees for order fulfillment
 */
export function useAssignees() {
  const { currentOrg } = useCurrentOrg();
  const listUsersFn = useServerFn(listUsers);

  const query = useQuery({
    queryKey: queryKeys.orders.assignees(currentOrg?.id, ASSIGNEE_ROLES),
    queryFn: async () => {
      if (!currentOrg?.id) return { assignees: [] };

      const result = await listUsersFn({
        data: {
          page: 1,
          pageSize: 100, // Get all active users for assignment
          status: 'active',
        },
      });

      // Transform to assignee format
      const assignees = result.items
        .filter((user) => isAssigneeRole(user.role))
        .map((user) => ({
          id: user.id,
          name: user.name || user.email,
          email: user.email,
          role: user.role,
        }));

      return { assignees };
    },
    enabled: !!currentOrg?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  return {
    assignees: query.data?.assignees || [],
    isLoading: query.isLoading,
    error: query.error,
  };
}

/**
 * Hook for assigning an order to a user
 */
export function useAssignOrder() {
  const queryClient = useQueryClient();
  const updateOrderFn = useServerFn(updateOrder);

  return useMutation<
    OrderDetail,
    Error,
    { orderId: string; assigneeId: string | null },
    {
      previousDetail?: OrderDetail;
      previousLists: Array<[unknown, { orders?: OrderDetail[] } | undefined]>;
    }
  >({
    mutationFn: (input: { orderId: string; assigneeId: string | null }) => {
      const existing = queryClient.getQueryData<OrderDetail>(
        queryKeys.orders.detail(input.orderId)
      );
      const metadata = {
        ...(existing?.metadata ?? {}),
        assignedTo: input.assigneeId ?? null,
      };

      return updateOrderFn({
        data: {
          id: input.orderId,
          data: { metadata },
        },
      });
    },
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.orders.detail(input.orderId) });
      await queryClient.cancelQueries({ queryKey: queryKeys.orders.lists() });

      const previousDetail = queryClient.getQueryData<OrderDetail>(
        queryKeys.orders.detail(input.orderId)
      );
      const previousLists = queryClient.getQueriesData<{ orders?: OrderDetail[] }>({
        queryKey: queryKeys.orders.lists(),
      });

      queryClient.setQueryData(
        queryKeys.orders.detail(input.orderId),
        (old: OrderDetail | undefined) => {
          if (!old) return old;
          return {
            ...old,
            metadata: {
              ...(old.metadata ?? {}),
              assignedTo: input.assigneeId ?? null,
            },
            updatedAt: new Date(),
          };
        }
      );

      queryClient.setQueriesData(
        { queryKey: queryKeys.orders.lists() },
        (old: { orders?: OrderDetail[] } | undefined) => {
          if (!old?.orders) return old;
          return {
            ...old,
            orders: old.orders.map((order: OrderDetail) =>
              order.id === input.orderId
                ? {
                    ...order,
                    metadata: {
                      ...(order.metadata ?? {}),
                      assignedTo: input.assigneeId ?? null,
                    },
                    updatedAt: new Date(),
                  }
                : order
            ),
          };
        }
      );

      return { previousDetail, previousLists };
    },
    onError: (_error, _input, context) => {
      if (!context) return;
      if (context.previousDetail) {
        queryClient.setQueryData(
          queryKeys.orders.detail(context.previousDetail.id),
          context.previousDetail
        );
      }
      context.previousLists.forEach(([key, data]) => {
        queryClient.setQueryData(key as readonly unknown[], data);
      });
    },
    onSuccess: (_result, input) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.detail(input.orderId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.lists() });
    },
  });
}
