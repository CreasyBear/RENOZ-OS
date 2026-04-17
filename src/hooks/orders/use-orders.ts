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
import { queryKeys, type OrderFilters } from '@/lib/query-keys';
import { normalizeReadQueryError } from '@/lib/read-path-policy';
import { isValidOrderSortField } from '@/components/domain/orders/order-sorting';
import { applyOptimisticOrderPatch } from './apply-optimistic-order-patch';
import {
  expectOrderQueryData,
  normalizeOrderMutationError,
} from './order-mutation-client-errors';
import {
  listOrders,
  getOrder,
  createOrder,
  updateOrder,
  deleteOrder,
  duplicateOrder,
  getOrderStats,
  getFulfillmentDashboardSummary,
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

function toOrderQueryKeyFilters(filters: Partial<OrderListQuery>): OrderFilters {
  return {
    ...filters,
    sortBy:
      typeof filters.sortBy === 'string' && isValidOrderSortField(filters.sortBy)
        ? filters.sortBy
        : undefined,
  };
}

function invalidateOrderListQueries(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: queryKeys.orders.lists() });
  queryClient.invalidateQueries({ queryKey: queryKeys.orders.infiniteLists() });
}

export function useOrders(options: UseOrdersOptions = {}) {
  const { enabled = true, ...filters } = options;

  const listOrdersFn = useServerFn(listOrders);
  const normalizedFilters = toOrderQueryKeyFilters(filters);

  return useQuery<ListOrdersResult>({
    queryKey: queryKeys.orders.list(normalizedFilters),
    queryFn: async () => {
      try {
        return await listOrdersFn({ data: normalizedFilters as OrderListQuery });
      } catch (error) {
        throw normalizeReadQueryError(error, {
          contractType: 'always-shaped',
          fallbackMessage: 'Orders are temporarily unavailable. Please refresh and try again.',
        });
      }
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
  const normalizedFilters = toOrderQueryKeyFilters(filters);

  return useInfiniteQuery<ListOrdersResult>({
    queryKey: queryKeys.orders.infiniteList(normalizedFilters),
    queryFn: async ({ pageParam }) => {
      try {
        return await listOrdersFn({
          data: {
            ...normalizedFilters,
            page: pageParam,
            pageSize: normalizedFilters.pageSize ?? 50,
          } as OrderListQuery,
        });
      } catch (error) {
        throw normalizeReadQueryError(error, {
          contractType: 'always-shaped',
          fallbackMessage: 'Orders are temporarily unavailable. Please refresh and try again.',
        });
      }
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
      try {
        const result = await getOrderFn({ data: { id: orderId } });
        return expectOrderQueryData(result, 'Order not found.');
      } catch (error) {
        throw normalizeReadQueryError(error, {
          contractType: 'detail-not-found',
          fallbackMessage: 'Order details are temporarily unavailable. Please refresh and try again.',
          notFoundMessage: 'The requested order could not be found.',
        });
      }
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
    mutationFn: async (input: CreateOrder) => {
      try {
        return await createFn({ data: input });
      } catch (error) {
        throw normalizeOrderMutationError(error, 'Unable to create order.');
      }
    },
    onSuccess: (result) => {
      queryClient.setQueryData(queryKeys.orders.detail(result.id), result);
      // Invalidate order lists
      invalidateOrderListQueries(queryClient);
      queryClient.invalidateQueries({
        queryKey: queryKeys.documents.history('order', result.id),
      });
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
    mutationFn: async (input: UpdateOrder & { id: string }) => {
      const { id, ...data } = input;
      try {
        return await updateFn({ data: { id, data } });
      } catch (error) {
        throw normalizeOrderMutationError(error, 'Unable to update order.');
      }
    },
    onMutate: async (variables) => {
      const optimisticUpdate = variables as Record<string, unknown>;
      await queryClient.cancelQueries({ queryKey: queryKeys.orders.detail(variables.id) });
      await queryClient.cancelQueries({ queryKey: queryKeys.orders.lists() });
      await queryClient.cancelQueries({ queryKey: queryKeys.orders.infiniteLists() });

      const previousDetail = queryClient.getQueryData<OrderDetail>(
        queryKeys.orders.detail(variables.id)
      );
      const previousLists = queryClient.getQueriesData<ListOrdersResult>({
        queryKey: queryKeys.orders.lists(),
      });

      if (previousDetail) {
        queryClient.setQueryData<OrderDetail>(
          queryKeys.orders.detail(variables.id),
          applyOptimisticOrderPatch(
            previousDetail as unknown as Record<string, unknown>,
            optimisticUpdate
          ) as unknown as OrderDetail
        );
      }

      queryClient.setQueriesData<ListOrdersResult>(
        { queryKey: queryKeys.orders.lists() },
        (old: ListOrdersResult | undefined) => {
          if (!old) return old;
          const updatedOrders = old.orders.map((order) =>
            order.id === variables.id
              ? (applyOptimisticOrderPatch(
                  order as unknown as Record<string, unknown>,
                  optimisticUpdate
                ) as unknown as typeof order)
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
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.detail(_variables.id) });
      invalidateOrderListQueries(queryClient);
    },
    onSuccess: (result, variables) => {
      // Invalidate the specific order
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.detail(variables.id) });
      queryClient.invalidateQueries({
        queryKey: queryKeys.documents.history('order', variables.id),
      });
      // Invalidate order lists
      invalidateOrderListQueries(queryClient);
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
    mutationFn: async (orderId: string) => {
      try {
        return await deleteFn({ data: { id: orderId } });
      } catch (error) {
        throw normalizeOrderMutationError(error, 'Unable to delete order.');
      }
    },
    onSuccess: (_result, orderId) => {
      // Remove the specific order from cache
      queryClient.removeQueries({ queryKey: queryKeys.orders.detail(orderId) });
      // Invalidate order lists
      invalidateOrderListQueries(queryClient);
    },
  });
}

export function useDuplicateOrder() {
  const queryClient = useQueryClient();

  const duplicateFn = useServerFn(duplicateOrder);

  return useMutation({
    mutationFn: async (orderId: string) => {
      try {
        return await duplicateFn({ data: { id: orderId } });
      } catch (error) {
        throw normalizeOrderMutationError(error, 'Unable to duplicate order.');
      }
    },
    onSuccess: () => {
      // Invalidate order lists to show the new duplicated order
      invalidateOrderListQueries(queryClient);
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
      try {
        return await statsFn();
      } catch (error) {
        throw normalizeReadQueryError(error, {
          contractType: 'always-shaped',
          fallbackMessage: 'Order metrics are temporarily unavailable. Please refresh and try again.',
        });
      }
    },
    staleTime: 60 * 1000, // 1 minute
  });
}

export function useFulfillmentDashboardSummary() {
  const summaryFn = useServerFn(getFulfillmentDashboardSummary);

  return useQuery({
    queryKey: queryKeys.orders.fulfillmentSummary(),
    queryFn: async () => {
      try {
        return await summaryFn();
      } catch (error) {
        throw normalizeReadQueryError(error, {
          contractType: 'always-shaped',
          fallbackMessage: 'Fulfillment metrics are temporarily unavailable. Please refresh and try again.',
        });
      }
    },
    staleTime: 30 * 1000,
  });
}

// ============================================================================
// ORDER LINE ITEM HOOKS
// ============================================================================

export function useAddOrderLineItem() {
  const queryClient = useQueryClient();

  const addFn = useServerFn(addOrderLineItem);

  return useMutation({
    mutationFn: async (input: AddOrderLineItemInput) => {
      try {
        return await addFn({ data: input });
      } catch (error) {
        throw normalizeOrderMutationError(error, 'Unable to add order line item.');
      }
    },
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.detail(variables.orderId) });
      invalidateOrderListQueries(queryClient);
    },
  });
}

export function useUpdateOrderLineItem() {
  const queryClient = useQueryClient();

  const updateLineItemFn = useServerFn(updateOrderLineItem);

  return useMutation({
    mutationFn: async (input: UpdateOrderLineItemInput) => {
      try {
        return await updateLineItemFn({ data: input });
      } catch (error) {
        throw normalizeOrderMutationError(error, 'Unable to update order line item.');
      }
    },
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.detail(variables.orderId) });
      invalidateOrderListQueries(queryClient);
    },
  });
}

export function useDeleteOrderLineItem() {
  const queryClient = useQueryClient();

  const deleteLineItemFn = useServerFn(deleteOrderLineItem);

  return useMutation({
    mutationFn: async (input: DeleteOrderLineItemInput) => {
      try {
        return await deleteLineItemFn({ data: input });
      } catch (error) {
        throw normalizeOrderMutationError(error, 'Unable to delete order line item.');
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.detail(variables.orderId) });
      invalidateOrderListQueries(queryClient);
    },
  });
}
