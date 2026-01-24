/**
 * Order Hooks
 *
 * TanStack Query hooks for order data fetching:
 * - Order list with pagination and filtering
 * - Order detail view
 * - Order mutations (create, update, delete)
 * - Order line item management
 */

import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import {
  listOrders,
  getOrder,
  createOrder,
  updateOrder,
  deleteOrder,
  addOrderLineItem,
  updateOrderLineItem,
  deleteOrderLineItem,
} from '@/server/functions/orders/orders';
import type { OrderListQuery, CreateOrder, UpdateOrder } from '@/lib/schemas/orders';
import { queryKeys } from '@/lib/query-keys';

type OrderListResult = Awaited<ReturnType<typeof listOrders>>;
type OrderDetail = Awaited<ReturnType<typeof getOrder>>;
type UpdateOrderContext = {
  previousDetail?: OrderDetail;
  previousLists: Array<[unknown, OrderListResult | undefined]>;
};

// ============================================================================
// LIST HOOKS
// ============================================================================

export interface UseOrdersOptions extends Partial<OrderListQuery> {
  enabled?: boolean;
}

export function useOrders(options: UseOrdersOptions = {}) {
  const { enabled = true, ...filters } = options;

  return useQuery({
    queryKey: queryKeys.orders.list(filters),
    queryFn: () => listOrders({ data: filters as OrderListQuery }),
    enabled,
    staleTime: 30 * 1000, // 30 seconds
  });
}

/**
 * Infinite scroll orders list
 */
export function useOrdersInfinite(filters: Partial<OrderListQuery> = {}) {
  return useInfiniteQuery({
    queryKey: queryKeys.orders.list(filters), // Use list key for infinite queries too
    queryFn: ({ pageParam }) =>
      listOrders({
        data: {
          ...filters,
          page: pageParam,
          pageSize: filters.pageSize ?? 50,
        } as OrderListQuery,
      }),
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) => {
      const totalFetched = allPages.reduce((sum, p) => sum + p.orders.length, 0);
      return totalFetched < lastPage.total ? allPages.length + 1 : undefined;
    },
  });
}

// ============================================================================
// DETAIL HOOKS
// ============================================================================

export interface UseOrderOptions {
  orderId: string;
  enabled?: boolean;
}

export function useOrder({ orderId, enabled = true }: UseOrderOptions) {
  return useQuery({
    queryKey: queryKeys.orders.detail(orderId),
    queryFn: () => getOrder({ data: { id: orderId } }),
    enabled: enabled && !!orderId,
    staleTime: 60 * 1000, // 60 seconds for details
  });
}

// ============================================================================
// MUTATION HOOKS
// ============================================================================

export function useCreateOrder() {
  const queryClient = useQueryClient();
  const createFn = useServerFn(createOrder);

  return useMutation<Awaited<ReturnType<typeof createOrder>>, Error, CreateOrder>({
    mutationFn: (input: CreateOrder) => createFn({ data: input }),
    onSuccess: (result) => {
      queryClient.setQueryData(queryKeys.orders.detail(result.id), result);
      // Invalidate order lists
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.lists() });
      // Invalidate customer orders if customerId provided
      if (result.customerId) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.orders.byCustomer(result.customerId),
        });
      }
    },
  });
}

export function useUpdateOrder() {
  const queryClient = useQueryClient();
  const updateFn = useServerFn(updateOrder);

  return useMutation<
    Awaited<ReturnType<typeof updateOrder>>,
    Error,
    UpdateOrder & { id: string },
    UpdateOrderContext
  >({
    mutationFn: (input: UpdateOrder & { id: string }) => {
      const { id, ...data } = input;
      return updateFn({ data: { id, data } });
    },
    onMutate: async (variables) => {
      const optimisticUpdate = variables as Partial<OrderDetail>;
      await queryClient.cancelQueries({ queryKey: queryKeys.orders.detail(variables.id) });
      await queryClient.cancelQueries({ queryKey: queryKeys.orders.lists() });

      const previousDetail = queryClient.getQueryData<OrderDetail>(
        queryKeys.orders.detail(variables.id)
      );
      const previousLists = queryClient.getQueriesData<OrderListResult>({
        queryKey: queryKeys.orders.lists(),
      });

      if (previousDetail) {
        queryClient.setQueryData<OrderDetail>(queryKeys.orders.detail(variables.id), {
          ...previousDetail,
          ...optimisticUpdate,
          updatedAt: new Date(),
        });
      }

      queryClient.setQueriesData<OrderListResult>(
        { queryKey: queryKeys.orders.lists() },
        (old: OrderListResult | undefined) => {
          if (!old) return old;
          const orders = old.orders.map((order: OrderListResult['orders'][number]) =>
            order.id === variables.id
              ? {
                  ...order,
                  ...optimisticUpdate,
                  updatedAt: new Date(),
                }
              : order
          );
          return { ...old, orders };
        }
      );

      return { previousDetail, previousLists };
    },
    onError: (_error, _variables, context) => {
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
    onSuccess: (result, variables) => {
      // Invalidate the specific order
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.detail(variables.id) });
      // Invalidate order lists
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.lists() });
      // Invalidate customer orders
      if (result.customerId) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.orders.byCustomer(result.customerId),
        });
      }
    },
  });
}

export function useDeleteOrder() {
  const queryClient = useQueryClient();
  const deleteFn = useServerFn(deleteOrder);

  return useMutation<Awaited<ReturnType<typeof deleteOrder>>, Error, string>({
    mutationFn: (orderId: string) => deleteFn({ data: { id: orderId } }),
    onSuccess: (_result, orderId) => {
      // Remove the specific order from cache
      queryClient.removeQueries({ queryKey: queryKeys.orders.detail(orderId) });
      // Invalidate order lists
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.lists() });
    },
  });
}

// ============================================================================
// ORDER LINE ITEM HOOKS
// ============================================================================

export function useAddOrderLineItem() {
  const queryClient = useQueryClient();
  const addFn = useServerFn(addOrderLineItem);

  return useMutation<Awaited<ReturnType<typeof addOrderLineItem>>, Error, any>({
    mutationFn: (input: any) => addFn({ data: input }),
    onSuccess: (_result, variables) => {
      // Invalidate the order
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.detail(variables.orderId) });
      // Invalidate order lists
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.lists() });
    },
  });
}

export function useUpdateOrderLineItem() {
  const queryClient = useQueryClient();
  const updateLineItemFn = useServerFn(updateOrderLineItem);

  return useMutation<Awaited<ReturnType<typeof updateOrderLineItem>>, Error, any>({
    mutationFn: (input: any) => updateLineItemFn({ data: input }),
    onSuccess: (_result, variables) => {
      // Invalidate the order
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.detail(variables.orderId) });
      // Invalidate order lists
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.lists() });
    },
  });
}

export function useDeleteOrderLineItem() {
  const queryClient = useQueryClient();
  const deleteLineItemFn = useServerFn(deleteOrderLineItem);

  return useMutation<Awaited<ReturnType<typeof deleteOrderLineItem>>, Error, any>({
    mutationFn: (input: any) => deleteLineItemFn({ data: input }),
    onSuccess: (_, variables) => {
      // Invalidate the order
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.detail(variables.orderId) });
      // Invalidate order lists
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.lists() });
    },
  });
}
