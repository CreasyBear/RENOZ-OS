/**
 * Revenue recognition hooks.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { queryKeys } from '@/lib/query-keys';
import { isReadQueryError, normalizeReadQueryError, requireReadResult } from '@/lib/read-path-policy';
import {
  listRecognitionsByState,
  getRecognitionSummary,
  getDeferredRevenueBalance,
  retryRecognitionSync,
} from '@/server/functions/financial/revenue-recognition';
import type { RecognitionState } from '@/lib/schemas';

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
// REVENUE RECOGNITION HOOKS
// ============================================================================

export interface UseRecognitionsOptions {
  state?: RecognitionState;
  page?: number;
  pageSize?: number;
  enabled?: boolean;
}

export function useRecognitions(options: UseRecognitionsOptions = {}) {
  const { enabled = true, ...params } = options;
  const fn = useServerFn(listRecognitionsByState);

  return useQuery({
    queryKey: queryKeys.financial.recognitions(params),
    queryFn: async () => {
      try {
        const result = await fn({ data: params });
        return requireReadResult(result, {
          message: 'Revenue recognitions returned no data',
          contractType: 'always-shaped',
          fallbackMessage:
            'Revenue recognition data is temporarily unavailable. Please refresh and try again.',
        });
      } catch (error) {
        rethrowFinancialReadError(error, {
          contractType: 'always-shaped',
          fallbackMessage:
            'Revenue recognition data is temporarily unavailable. Please refresh and try again.',
        });
      }
    },
    enabled,
    staleTime: 30 * 1000,
  });
}

export interface UseRecognitionSummaryOptions {
  dateFrom: Date;
  dateTo: Date;
  groupBy?: 'day' | 'week' | 'month' | 'quarter';
  enabled?: boolean;
}

export function useRecognitionSummary(options: UseRecognitionSummaryOptions) {
  const { enabled = true, dateFrom, dateTo, groupBy } = options;
  const fn = useServerFn(getRecognitionSummary);

  return useQuery({
    queryKey: queryKeys.financial.recognitionSummary(dateFrom.toISOString(), dateTo.toISOString(), groupBy),
    queryFn: async () => {
      try {
        const result = await fn({ data: { dateFrom, dateTo, groupBy } });
        return requireReadResult(result, {
          message: 'Recognition summary returned no data',
          contractType: 'always-shaped',
          fallbackMessage:
            'Recognition summary is temporarily unavailable. Please refresh and try again.',
        });
      } catch (error) {
        rethrowFinancialReadError(error, {
          contractType: 'always-shaped',
          fallbackMessage:
            'Recognition summary is temporarily unavailable. Please refresh and try again.',
        });
      }
    },
    enabled,
    staleTime: 60 * 1000,
  });
}

export function useDeferredRevenueBalance() {
  const fn = useServerFn(getDeferredRevenueBalance);

  return useQuery({
    queryKey: queryKeys.financial.deferredBalance(),
    queryFn: async () => {
      try {
        const result = await fn({ data: {} });
        return requireReadResult(result, {
          message: 'Deferred revenue balance returned no data',
          contractType: 'always-shaped',
          fallbackMessage:
            'Deferred revenue balance is temporarily unavailable. Please refresh and try again.',
        });
      } catch (error) {
        rethrowFinancialReadError(error, {
          contractType: 'always-shaped',
          fallbackMessage:
            'Deferred revenue balance is temporarily unavailable. Please refresh and try again.',
        });
      }
    },
    staleTime: 60 * 1000,
  });
}

export function useRetryRecognitionSync() {
  const queryClient = useQueryClient();
  const fn = useServerFn(retryRecognitionSync);

  return useMutation({
    mutationFn: (recognitionId: string) => fn({ data: { recognitionId } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.financial.revenue() });
    },
  });
}
