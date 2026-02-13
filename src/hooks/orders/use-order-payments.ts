/**
 * Order Payments Hooks
 *
 * React hooks for managing order payments data and mutations.
 * Follows the patterns from HOOK-STANDARDS.md.
 */

import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryOptions,
} from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { queryKeys } from "@/lib/query-keys";
import {
  getOrderPayments,
  getOrderPayment,
  getOrderPaymentSummary,
  createOrderPayment,
  updateOrderPayment,
  deleteOrderPayment,
  createRefundPayment,
} from "@/server/functions/orders/order-payments";
import type {
  InsertOrderPayment,
  UpdateOrderPayment,
  DeleteOrderPayment,
} from "@/lib/schemas/orders/order-payments";

// ============================================================================
// QUERY HOOKS
// ============================================================================

/**
 * Hook to fetch all payments for an order
 */
export function useOrderPayments(
  orderId: string,
  options?: Omit<
    UseQueryOptions<Awaited<ReturnType<typeof getOrderPayments>>>,
    "queryKey" | "queryFn"
  >
) {
  const getPaymentsFn = useServerFn(getOrderPayments);

  return useQuery({
    queryKey: queryKeys.orders.payments(orderId),
    queryFn: async () => {
      const result = await getPaymentsFn({
        data: { orderId } 
      });
      if (result == null) throw new Error('Query returned no data');
      return result;
    },
    enabled: !!orderId,
    ...options,
  });
}

/**
 * Hook to fetch a single payment by ID
 */
export function useOrderPayment(
  paymentId: string,
  options?: Omit<
    UseQueryOptions<Awaited<ReturnType<typeof getOrderPayment>>>,
    "queryKey" | "queryFn"
  >
) {
  const getPaymentFn = useServerFn(getOrderPayment);

  return useQuery({
    queryKey: queryKeys.orders.paymentDetail(paymentId),
    queryFn: async () => {
      const result = await getPaymentFn({
        data: { paymentId } 
      });
      if (result == null) throw new Error('Query returned no data');
      return result;
    },
    enabled: !!paymentId,
    ...options,
  });
}

/**
 * Hook to fetch payment summary for an order
 */
export function useOrderPaymentSummary(
  orderId: string,
  options?: Omit<
    UseQueryOptions<Awaited<ReturnType<typeof getOrderPaymentSummary>>>,
    "queryKey" | "queryFn"
  >
) {
  const getSummaryFn = useServerFn(getOrderPaymentSummary);

  return useQuery({
    queryKey: [...queryKeys.orders.payments(orderId), "summary"],
    queryFn: async () => {
      const result = await getSummaryFn({
        data: { orderId } 
      });
      if (result == null) throw new Error('Query returned no data');
      return result;
    },
    enabled: !!orderId,
    ...options,
  });
}

// ============================================================================
// MUTATION HOOKS
// ============================================================================

/**
 * Hook to create a new payment
 */
export function useCreateOrderPayment(orderId: string) {
  const queryClient = useQueryClient();
  const createPaymentFn = useServerFn(createOrderPayment);

  return useMutation({
    mutationFn: (input: InsertOrderPayment) => createPaymentFn({ data: input }),
    onSuccess: () => {
      // Invalidate payments list and summary
      queryClient.invalidateQueries({
        queryKey: queryKeys.orders.payments(orderId),
      });
      queryClient.invalidateQueries({
        queryKey: [...queryKeys.orders.payments(orderId), "summary"],
      });
      // Invalidate order detail to refresh payment status
      queryClient.invalidateQueries({
        queryKey: queryKeys.orders.detail(orderId),
      });
    },
  });
}

/**
 * Hook to update an existing payment
 */
export function useUpdateOrderPayment(orderId: string) {
  const queryClient = useQueryClient();
  const updatePaymentFn = useServerFn(updateOrderPayment);

  return useMutation({
    mutationFn: (input: UpdateOrderPayment) => updatePaymentFn({ data: input }),
    onSuccess: (data) => {
      if (!data) return;

      // Invalidate payments list and specific payment
      queryClient.invalidateQueries({
        queryKey: queryKeys.orders.payments(orderId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.orders.paymentDetail(data.id),
      });
      queryClient.invalidateQueries({
        queryKey: [...queryKeys.orders.payments(orderId), "summary"],
      });
      // Invalidate order detail
      queryClient.invalidateQueries({
        queryKey: queryKeys.orders.detail(orderId),
      });
    },
  });
}

/**
 * Hook to delete a payment
 */
export function useDeleteOrderPayment(orderId: string) {
  const queryClient = useQueryClient();
  const deletePaymentFn = useServerFn(deleteOrderPayment);

  return useMutation({
    mutationFn: (input: DeleteOrderPayment) => deletePaymentFn({ data: input }),
    onSuccess: () => {
      // Invalidate payments list and summary
      queryClient.invalidateQueries({
        queryKey: queryKeys.orders.payments(orderId),
      });
      queryClient.invalidateQueries({
        queryKey: [...queryKeys.orders.payments(orderId), "summary"],
      });
      // Invalidate order detail
      queryClient.invalidateQueries({
        queryKey: queryKeys.orders.detail(orderId),
      });
    },
  });
}

/**
 * Hook to create a refund payment
 */
export function useCreateRefundPayment(orderId: string) {
  const queryClient = useQueryClient();
  const createRefundFn = useServerFn(createRefundPayment);

  return useMutation({
    mutationFn: ({
      originalPaymentId,
      amount,
      notes,
    }: {
      originalPaymentId: string;
      amount: number;
      notes?: string | null;
    }) =>
      createRefundFn({
        data: { orderId, originalPaymentId, amount, notes },
      }),
    onSuccess: () => {
      // Invalidate payments list and summary
      queryClient.invalidateQueries({
        queryKey: queryKeys.orders.payments(orderId),
      });
      queryClient.invalidateQueries({
        queryKey: [...queryKeys.orders.payments(orderId), "summary"],
      });
      // Invalidate order detail
      queryClient.invalidateQueries({
        queryKey: queryKeys.orders.detail(orderId),
      });
    },
  });
}
