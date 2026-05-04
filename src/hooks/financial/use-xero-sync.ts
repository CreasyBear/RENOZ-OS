/**
 * Xero sync hooks.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { queryKeys } from '@/lib/query-keys';
import { isReadQueryError, normalizeReadQueryError, requireReadResult } from '@/lib/read-path-policy';
import {
  listInvoicesBySyncStatus,
  getInvoiceXeroStatus,
  resyncInvoiceToXero,
} from '@/server/functions/financial/xero-invoice-sync';
import {
  getXeroIntegrationStatus,
  listRecentXeroPaymentEvents,
} from '@/server/functions/financial/xero-operations';

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
// XERO SYNC HOOKS
// ============================================================================

export interface UseXeroSyncsOptions {
  status?: 'pending' | 'syncing' | 'synced' | 'error';
  errorsOnly?: boolean;
  issue?: string;
  customerId?: string;
  orderId?: string;
  page?: number;
  pageSize?: number;
  enabled?: boolean;
}

export function useXeroSyncs(options: UseXeroSyncsOptions = {}) {
  const { enabled = true, ...params } = options;
  const fn = useServerFn(listInvoicesBySyncStatus);

  return useQuery({
    queryKey: queryKeys.financial.xeroSyncs({
      status: params.status,
      errorsOnly: params.errorsOnly,
      issue: params.issue,
      customerId: params.customerId,
      orderId: params.orderId,
      page: params.page ?? 1,
      pageSize: params.pageSize ?? 50,
    }),
    queryFn: async () => {
      try {
        const result = await fn({ data: params });
        return requireReadResult(result, {
          message: 'Xero syncs returned no data',
          contractType: 'always-shaped',
          fallbackMessage: 'Xero sync history is temporarily unavailable. Please refresh and try again.',
        });
      } catch (error) {
        rethrowFinancialReadError(error, {
          contractType: 'always-shaped',
          fallbackMessage: 'Xero sync history is temporarily unavailable. Please refresh and try again.',
        });
      }
    },
    enabled,
    staleTime: 30 * 1000,
  });
}

export function useXeroIntegrationStatus(enabled = true) {
  const fn = useServerFn(getXeroIntegrationStatus);

  return useQuery({
    queryKey: queryKeys.financial.xeroIntegration(),
    queryFn: async () => {
      try {
        const result = await fn({ data: undefined });
        return requireReadResult(result, {
          message: 'Xero integration status returned no data',
          contractType: 'always-shaped',
          fallbackMessage:
            'Xero integration status is temporarily unavailable. Please refresh and try again.',
        });
      } catch (error) {
        rethrowFinancialReadError(error, {
          contractType: 'always-shaped',
          fallbackMessage:
            'Xero integration status is temporarily unavailable. Please refresh and try again.',
        });
      }
    },
    enabled,
    staleTime: 30 * 1000,
  });
}

export interface UseXeroPaymentEventsOptions {
  page?: number;
  pageSize?: number;
  enabled?: boolean;
}

export function useXeroPaymentEvents(options: UseXeroPaymentEventsOptions = {}) {
  const { enabled = true, page = 1, pageSize = 20 } = options;
  const fn = useServerFn(listRecentXeroPaymentEvents);

  return useQuery({
    queryKey: [...queryKeys.financial.xeroPaymentEvents(), { page, pageSize }],
    queryFn: async () => {
      try {
        const result = await fn({ data: { page, pageSize } });
        return requireReadResult(result, {
          message: 'Xero payment events returned no data',
          contractType: 'always-shaped',
          fallbackMessage:
            'Xero payment events are temporarily unavailable. Please refresh and try again.',
        });
      } catch (error) {
        rethrowFinancialReadError(error, {
          contractType: 'always-shaped',
          fallbackMessage:
            'Xero payment events are temporarily unavailable. Please refresh and try again.',
        });
      }
    },
    enabled,
    staleTime: 30 * 1000,
  });
}

export function useXeroInvoiceStatus(orderId: string, enabled = true) {
  const fn = useServerFn(getInvoiceXeroStatus);

  return useQuery({
    queryKey: queryKeys.financial.xeroStatus(orderId),
    queryFn: async () => {
      try {
        const result = await fn({ data: { orderId } });
        return requireReadResult(result, {
          message: 'Xero invoice status returned no data',
          contractType: 'always-shaped',
          fallbackMessage:
            'Xero invoice status is temporarily unavailable. Please refresh and try again.',
        });
      } catch (error) {
        rethrowFinancialReadError(error, {
          contractType: 'always-shaped',
          fallbackMessage:
            'Xero invoice status is temporarily unavailable. Please refresh and try again.',
        });
      }
    },
    enabled: enabled && !!orderId,
    staleTime: 30 * 1000,
  });
}

export function useResyncXeroInvoice() {
  const queryClient = useQueryClient();
  const fn = useServerFn(resyncInvoiceToXero);

  return useMutation({
    mutationFn: (orderId: string) => fn({ data: { orderId } }),
    onSuccess: (_result, orderId) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.financial.xero() });
      queryClient.invalidateQueries({ queryKey: queryKeys.financial.xeroStatus(orderId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.detail(orderId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.lists() });
    },
  });
}
