/**
 * AR aging hooks.
 */

import { useQuery } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { queryKeys } from '@/lib/query-keys';
import { isReadQueryError, normalizeReadQueryError, requireReadResult } from '@/lib/read-path-policy';
import { getARAgingReport, getARAgingCustomerDetail } from '@/server/functions/financial/ar-aging';
import type { ARAgingReportQuery } from '@/lib/schemas';

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
// AR AGING HOOKS
// ============================================================================

export interface UseARAgingReportOptions extends Partial<ARAgingReportQuery> {
  enabled?: boolean;
}

export function useARAgingReport(options: UseARAgingReportOptions = {}) {
  const { enabled = true, ...filters } = options;
  const fn = useServerFn(getARAgingReport);

  return useQuery({
    queryKey: queryKeys.financial.arAgingReport(filters),
    queryFn: async () => {
      try {
        const result = await fn({ data: filters });
        return requireReadResult(result, {
          message: 'AR aging report returned no data',
          contractType: 'always-shaped',
          fallbackMessage: 'AR aging is temporarily unavailable. Please refresh and try again.',
        });
      } catch (error) {
        rethrowFinancialReadError(error, {
          contractType: 'always-shaped',
          fallbackMessage: 'AR aging is temporarily unavailable. Please refresh and try again.',
        });
      }
    },
    enabled,
    staleTime: 60 * 1000, // 1 minute
  });
}

export function useCustomerAgingDetail(customerId: string, enabled = true) {
  const fn = useServerFn(getARAgingCustomerDetail);

  return useQuery({
    queryKey: queryKeys.financial.arAgingCustomer(customerId),
    queryFn: async () => {
      try {
        const result = await fn({ data: { customerId } });
        return requireReadResult(result, {
          message: 'Customer aging detail returned no data',
          contractType: 'always-shaped',
          fallbackMessage:
            'Customer aging details are temporarily unavailable. Please refresh and try again.',
        });
      } catch (error) {
        rethrowFinancialReadError(error, {
          contractType: 'always-shaped',
          fallbackMessage:
            'Customer aging details are temporarily unavailable. Please refresh and try again.',
        });
      }
    },
    enabled: enabled && !!customerId,
    staleTime: 60 * 1000,
  });
}

