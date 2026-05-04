/**
 * Payment schedule hooks.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { queryKeys } from '@/lib/query-keys';
import { isReadQueryError, normalizeReadQueryError, requireReadResult } from '@/lib/read-path-policy';
import {
  getPaymentSchedule,
  getOverdueInstallments,
  createPaymentPlan,
  updateInstallment,
  recordInstallmentPayment,
} from '@/server/functions/financial/payment-schedules';
import type { CreatePaymentPlanInput } from '@/lib/schemas';

function rethrowFinancialReadError(
  error: unknown,
  options: {
    fallbackMessage: string;
    contractType: 'always-shaped' | 'detail-not-found';
    notFoundMessage?: string;
  }
): never {
  if (isReadQueryError(error)) {
    throw error;
  }

  throw normalizeReadQueryError(error, options);
}

// ============================================================================
// PAYMENT SCHEDULE HOOKS
// ============================================================================

export function usePaymentSchedule(orderId: string, enabled = true) {
  const fn = useServerFn(getPaymentSchedule);

  return useQuery({
    queryKey: queryKeys.financial.paymentScheduleDetail(orderId),
    queryFn: async () => {
      try {
        const result = await fn({ data: { orderId } });
        return requireReadResult(result, {
          message: 'Payment schedule not found',
          contractType: 'detail-not-found',
          fallbackMessage:
            'Payment schedule details are temporarily unavailable. Please refresh and try again.',
          notFoundMessage: 'The requested payment schedule could not be found.',
        });
      } catch (error) {
        rethrowFinancialReadError(error, {
          contractType: 'detail-not-found',
          fallbackMessage:
            'Payment schedule details are temporarily unavailable. Please refresh and try again.',
          notFoundMessage: 'The requested payment schedule could not be found.',
        });
      }
    },
    enabled: enabled && !!orderId,
    staleTime: 30 * 1000,
  });
}

export function useOverdueInstallments(options: {
  page?: number;
  limit?: number;
  minDaysOverdue?: number;
  includeAlerted?: boolean;
  enabled?: boolean;
} = {}) {
  const { enabled = true, ...params } = options;
  const fn = useServerFn(getOverdueInstallments);

  return useQuery({
    queryKey: [...queryKeys.financial.paymentSchedules(), 'overdue', params],
    queryFn: async () => {
      try {
        const result = await fn({
          data: {
            page: params.page ?? 1,
            limit: params.limit ?? 20,
            minDaysOverdue: params.minDaysOverdue ?? 1,
            includeAlerted: params.includeAlerted ?? false,
          },
        });
        return requireReadResult(result, {
          message: 'Overdue installments returned no data',
          contractType: 'always-shaped',
          fallbackMessage:
            'Payment-plan workbench is temporarily unavailable. Please refresh and try again.',
        });
      } catch (error) {
        rethrowFinancialReadError(error, {
          contractType: 'always-shaped',
          fallbackMessage:
            'Payment-plan workbench is temporarily unavailable. Please refresh and try again.',
        });
      }
    },
    enabled,
    staleTime: 30 * 1000,
  });
}

export function useCreatePaymentPlan() {
  const queryClient = useQueryClient();
  const fn = useServerFn(createPaymentPlan);

  return useMutation({
    mutationFn: (data: CreatePaymentPlanInput) => fn({ data }),
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.financial.paymentSchedules(),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.financial.paymentScheduleDetail(variables.orderId),
      });
    },
  });
}

export function useUpdateInstallment() {
  const queryClient = useQueryClient();
  const fn = useServerFn(updateInstallment);

  return useMutation({
    mutationFn: (data: {
      installmentId: string;
      dueDate?: string;
      amount?: number;
      gstAmount?: number;
      description?: string;
      notes?: string | null;
    }) => fn({ data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.financial.paymentSchedules() });
    },
  });
}

export function useRecordInstallmentPayment() {
  const queryClient = useQueryClient();
  const fn = useServerFn(recordInstallmentPayment);

  return useMutation({
    mutationFn: (data: {
      installmentId: string;
      paidAmount: number;
      paymentMethod?: 'bank_transfer' | 'credit_card' | 'cash' | 'cheque' | 'paypal' | 'stripe' | 'xero';
      paymentDate: string;
      reference?: string;
      paymentReference?: string;
      notes?: string;
    }) => fn({ data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.financial.paymentSchedules() });
    },
  });
}
