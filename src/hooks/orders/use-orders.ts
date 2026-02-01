'use client'

/**
 * Order Hooks
 *
 * TanStack Query hooks for order data fetching:
 * - Order list with pagination and filtering
 * - Order detail view
 * - Order mutations (create, update, delete)
 * - Order line item management
 *
 * Uses dynamic imports to prevent server-only code from being bundled to client.
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
} from '@/lib/schemas/orders';
import { queryKeys } from '@/lib/query-keys';

// Dynamic imports to prevent server-only code from being bundled to client
const loadOrdersModule = async () => import('@/server/functions/orders/orders');

// Types are inferred from the server functions
type OrdersModule = Awaited<ReturnType<typeof loadOrdersModule>>;
type OrderListResult = Awaited<ReturnType<OrdersModule['listOrders']>>;
type OrderDetail = Awaited<ReturnType<OrdersModule['getOrder']>>;

// ============================================================================
// LIST HOOKS
// ============================================================================

export interface UseOrdersOptions extends Partial<OrderListQuery> {
  enabled?: boolean;
}

export function useOrders(options: UseOrdersOptions = {}) {
  const { enabled = true, ...filters } = options;

  const listOrdersFn = useServerFn(async ({ data }: { data: OrderListQuery }) => {
    const { listOrders } = await loadOrdersModule();
    return listOrders({ data });
  });

  return useQuery({
    queryKey: queryKeys.orders.list(filters),
    queryFn: () => listOrdersFn({ data: filters as OrderListQuery }),
    enabled,
    staleTime: 30 * 1000, // 30 seconds
  });
}

/**
 * Infinite scroll orders list
 */
export function useOrdersInfinite(filters: Partial<OrderListQuery> = {}) {
  const listOrdersFn = useServerFn(async ({ data }: { data: OrderListQuery }) => {
    const { listOrders } = await loadOrdersModule();
    return listOrders({ data });
  });

  return useInfiniteQuery({
    queryKey: queryKeys.orders.list(filters),
    queryFn: ({ pageParam }) =>
      listOrdersFn({
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
  const getOrderFn = useServerFn(async ({ data }: { data: { id: string } }) => {
    const { getOrder } = await loadOrdersModule();
    return getOrder({ data });
  });

  return useQuery({
    queryKey: queryKeys.orders.detail(orderId),
    queryFn: () => getOrderFn({ data: { id: orderId } }),
    enabled: enabled && !!orderId,
    staleTime: 60 * 1000, // 60 seconds for details
  });
}

// ============================================================================
// MUTATION HOOKS
// ============================================================================

export function useCreateOrder() {
  const queryClient = useQueryClient();

  const createFn = useServerFn(async ({ data }: { data: CreateOrder }) => {
    const { createOrder } = await loadOrdersModule();
    return createOrder({ data });
  });

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

  const updateFn = useServerFn(async ({ data }: { data: { id: string; data: UpdateOrder } }) => {
    const { updateOrder } = await loadOrdersModule();
    return updateOrder({ data });
  });

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

  const deleteFn = useServerFn(async ({ data }: { data: { id: string } }) => {
    const { deleteOrder } = await loadOrdersModule();
    return deleteOrder({ data });
  });

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

  const duplicateFn = useServerFn(async ({ data }: { data: { id: string } }) => {
    const { duplicateOrder } = await loadOrdersModule();
    return duplicateOrder({ data });
  });

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
  const statsFn = useServerFn(async () => {
    const { getOrderStats } = await loadOrdersModule();
    return getOrderStats({ data: undefined });
  });

  return useQuery({
    queryKey: queryKeys.orders.stats(),
    queryFn: () => statsFn(),
    staleTime: 60 * 1000, // 1 minute
  });
}

// ============================================================================
// ORDER LINE ITEM HOOKS
// ============================================================================

export function useAddOrderLineItem() {
  const queryClient = useQueryClient();

  const addFn = useServerFn(async ({ data }: { data: AddOrderLineItemInput }) => {
    const { addOrderLineItem } = await loadOrdersModule();
    return addOrderLineItem({ data });
  });

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

  const updateLineItemFn = useServerFn(
    async ({ data }: { data: UpdateOrderLineItemInput }) => {
      const { updateOrderLineItem } = await loadOrdersModule();
      return updateOrderLineItem({ data });
    }
  );

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

  const deleteLineItemFn = useServerFn(
    async ({ data }: { data: DeleteOrderLineItemInput }) => {
      const { deleteOrderLineItem } = await loadOrdersModule();
      return deleteOrderLineItem({ data });
    }
  );

  return useMutation({
    mutationFn: (input: DeleteOrderLineItemInput) => deleteLineItemFn({ data: input }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.detail(variables.orderId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.lists() });
    },
  });
}
