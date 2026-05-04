/**
 * Payment reminder hooks.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { queryKeys } from '@/lib/query-keys';
import { isReadQueryError, normalizeReadQueryError, requireReadResult } from '@/lib/read-path-policy';
import {
  listReminderTemplates,
  createReminderTemplate,
  updateReminderTemplate,
  deleteReminderTemplate,
  sendReminder,
  getReminderHistory,
  getOrdersForReminders,
} from '@/server/functions/financial/payment-reminders';
import type {
  CreateReminderTemplateInput,
  UpdateReminderTemplateInput,
  SendReminderInput,
} from '@/lib/schemas';

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
// PAYMENT REMINDER HOOKS
// ============================================================================

export function useReminderTemplates() {
  const fn = useServerFn(listReminderTemplates);

  return useQuery({
    queryKey: queryKeys.financial.reminderTemplates(),
    queryFn: async () => {
      try {
        const result = await fn({ data: {} });
        return requireReadResult(result, {
          message: 'Reminder templates returned no data',
          contractType: 'always-shaped',
          fallbackMessage:
            'Reminder templates are temporarily unavailable. Please refresh and try again.',
        });
      } catch (error) {
        rethrowFinancialReadError(error, {
          contractType: 'always-shaped',
          fallbackMessage:
            'Reminder templates are temporarily unavailable. Please refresh and try again.',
        });
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useCreateReminderTemplate() {
  const queryClient = useQueryClient();
  const fn = useServerFn(createReminderTemplate);

  return useMutation({
    mutationFn: (data: CreateReminderTemplateInput) => fn({ data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.financial.reminderTemplates() });
    },
  });
}

export function useUpdateReminderTemplate() {
  const queryClient = useQueryClient();
  const fn = useServerFn(updateReminderTemplate);

  return useMutation({
    mutationFn: (data: UpdateReminderTemplateInput & { id: string }) => fn({ data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.financial.reminderTemplates() });
    },
  });
}

export function useDeleteReminderTemplate() {
  const queryClient = useQueryClient();
  const fn = useServerFn(deleteReminderTemplate);

  return useMutation({
    mutationFn: (id: string) => fn({ data: { id } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.financial.reminderTemplates() });
    },
  });
}

export function useSendPaymentReminder() {
  const queryClient = useQueryClient();
  const fn = useServerFn(sendReminder);

  return useMutation({
    mutationFn: (data: SendReminderInput) => fn({ data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.financial.reminders() });
    },
  });
}

export interface UseOrdersForRemindersOptions {
  page?: number;
  pageSize?: number;
  minDaysOverdue?: number;
  matchTemplateDays?: boolean;
  excludeAlreadyReminded?: boolean;
  enabled?: boolean;
}

/**
 * Fetch orders that are due for payment reminders.
 */
export function useOrdersForReminders(options: UseOrdersForRemindersOptions = {}) {
  const { enabled = true, ...params } = options;
  const fn = useServerFn(getOrdersForReminders);

  return useQuery({
    queryKey: queryKeys.financial.ordersForReminders(params),
    queryFn: async () => {
      try {
        const result = await fn({ data: params });
        return requireReadResult(result, {
          message: 'Orders for reminders returned no data',
          contractType: 'always-shaped',
          fallbackMessage:
            'Payment reminder candidates are temporarily unavailable. Please refresh and try again.',
        });
      } catch (error) {
        rethrowFinancialReadError(error, {
          contractType: 'always-shaped',
          fallbackMessage:
            'Payment reminder candidates are temporarily unavailable. Please refresh and try again.',
        });
      }
    },
    enabled,
    staleTime: 30 * 1000,
  });
}

export interface UseReminderHistoryOptions {
  orderId?: string;
  customerId?: string;
  enabled?: boolean;
}

export function useReminderHistory(options: UseReminderHistoryOptions = {}) {
  const { enabled = true, ...filters } = options;
  const fn = useServerFn(getReminderHistory);

  return useQuery({
    queryKey: queryKeys.financial.reminderHistory(filters),
    queryFn: async () => {
      try {
        const result = await fn({ data: filters });
        return requireReadResult(result, {
          message: 'Reminder history returned no data',
          contractType: 'always-shaped',
          fallbackMessage:
            'Reminder history is temporarily unavailable. Please refresh and try again.',
        });
      } catch (error) {
        rethrowFinancialReadError(error, {
          contractType: 'always-shaped',
          fallbackMessage:
            'Reminder history is temporarily unavailable. Please refresh and try again.',
        });
      }
    },
    enabled,
    staleTime: 30 * 1000,
  });
}

