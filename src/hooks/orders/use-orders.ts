'use client'

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
import type {
  OrderListQuery,
  CreateOrder,
  UpdateOrder,
  AddOrderLineItemInput,
  UpdateOrderLineItemInput,
  DeleteOrderLineItemInput,
  ListOrdersResult,
} from '@/lib/schemas/orders';
import { queryKeys } from '@/lib/query-keys';
import {
  listOrders,
  getOrder,
  createOrder,
  updateOrder,
  deleteOrder,
  duplicateOrder,
  getOrderStats,
  addOrderLineItem,
  updateOrderLineItem,
  deleteOrderLineItem,
} from '@/server/functions/orders/orders';

type OrderDetail = Awaited<ReturnType<typeof getOrder>>;

// ============================================================================
// LIST HOOKS
// ============================================================================

export interface UseOrdersOptions extends Partial<OrderListQuery> {
  enabled?: boolean;
}

export function useOrders(options: UseOrdersOptions = {}) {
  const { enabled = true, ...filters } = options;

  const listOrdersFn = useServerFn(listOrders);

  return useQuery<ListOrdersResult>({
    queryKey: queryKeys.orders.list(filters),
    queryFn: async () => {
      const result = await listOrdersFn({ data: filters as OrderListQuery });
      return (
        (result as ListOrdersResult) ?? {
          orders: [],
          total: 0,
          page: filters.page ?? 1,
          pageSize: filters.pageSize ?? 10,
          hasMore: false,
        }
      );
    },
    enabled,
    staleTime: 30 * 1000, // 30 seconds
  });
}

/**
 * Infinite scroll orders list
 */
export function useOrdersInfinite(filters: Partial<OrderListQuery> = {}) {
  const listOrdersFn = useServerFn(listOrders);

  return useInfiniteQuery<ListOrdersResult>({
    queryKey: queryKeys.orders.list(filters),
    queryFn: async ({ pageParam }) => {
      const result = await listOrdersFn({
        data: {
          ...filters,
          page: pageParam,
          pageSize: filters.pageSize ?? 50,
        } as OrderListQuery,
      });
      if (result == null) throw new Error('Orders list returned no data');
      return result;
    },
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
  const getOrderFn = useServerFn(getOrder);

  return useQuery({
    queryKey: queryKeys.orders.detail(orderId),
    queryFn: async () => {
      const result = await getOrderFn({ data: { id: orderId } });
      if (result == null) throw new Error('Order not found');
      return result;
    },
    enabled: enabled && !!orderId,
    staleTime: 60 * 1000, // 60 seconds for details
  });
}

// NOTE: useOrderWithCustomer is in use-order-detail.ts to avoid duplicate exports

// ============================================================================
// MUTATION HOOKS
// ============================================================================

export function useCreateOrder() {
  const queryClient = useQueryClient();

  const createFn = useServerFn(createOrder);

  return useMutation({
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

  return useMutation({
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
      const previousLists = queryClient.getQueriesData<ListOrdersResult>({
        queryKey: queryKeys.orders.lists(),
      });

      if (previousDetail) {
        queryClient.setQueryData<OrderDetail>(queryKeys.orders.detail(variables.id), {
          ...previousDetail,
          ...optimisticUpdate,
          updatedAt: new Date(),
        });
      }

      queryClient.setQueriesData<ListOrdersResult>(
        { queryKey: queryKeys.orders.lists() },
        (old: ListOrdersResult | undefined) => {
          if (!old) return old;
          const updatedOrders = old.orders.map((order) =>
            order.id === variables.id
              ? {
                  ...order,
                  ...optimisticUpdate,
                  updatedAt: new Date(),
                }
              : order
          );
          return { ...old, orders: updatedOrders } as ListOrdersResult;
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

  return useMutation({
    mutationFn: (orderId: string) => deleteFn({ data: { id: orderId } }),
    onSuccess: (_result, orderId) => {
      // Remove the specific order from cache
      queryClient.removeQueries({ queryKey: queryKeys.orders.detail(orderId) });
      // Invalidate order lists
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.lists() });
    },
  });
}

export function useDuplicateOrder() {
  const queryClient = useQueryClient();

  const duplicateFn = useServerFn(duplicateOrder);

  return useMutation({
    mutationFn: (orderId: string) => duplicateFn({ data: { id: orderId } }),
    onSuccess: () => {
      // Invalidate order lists to show the new duplicated order
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.lists() });
    },
  });
}

// ============================================================================
// ORDER STATS HOOK
// ============================================================================

export function useOrderStats() {
  const statsFn = useServerFn(getOrderStats);

  return useQuery({
    queryKey: queryKeys.orders.stats(),
    queryFn: async () => {
      const result = await statsFn();
      if (result == null) throw new Error('Order stats returned no data');
      return result;
    },
    staleTime: 60 * 1000, // 1 minute
  });
}

// ============================================================================
// ORDER LINE ITEM HOOKS
// ============================================================================

export function useAddOrderLineItem() {
  const queryClient = useQueryClient();

  const addFn = useServerFn(addOrderLineItem);

  return useMutation({
    mutationFn: (input: AddOrderLineItemInput) => addFn({ data: input }),
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.detail(variables.orderId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.lists() });
    },
  });
}

export function useUpdateOrderLineItem() {
  const queryClient = useQueryClient();

  const updateLineItemFn = useServerFn(updateOrderLineItem);

  return useMutation({
    mutationFn: (input: UpdateOrderLineItemInput) => updateLineItemFn({ data: input }),
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.detail(variables.orderId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.lists() });
    },
  });
}

export function useDeleteOrderLineItem() {
  const queryClient = useQueryClient();

  const deleteLineItemFn = useServerFn(deleteOrderLineItem);

  return useMutation({
    mutationFn: (input: DeleteOrderLineItemInput) => deleteLineItemFn({ data: input }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.detail(variables.orderId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.lists() });
    },
  });
}
