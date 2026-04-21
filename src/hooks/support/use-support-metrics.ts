/**
 * Support Metrics Hooks
 *
 * TanStack Query hooks for support dashboard metrics.
 *
 * @see src/server/functions/support-metrics.ts
 * @see _Initiation/_prd/2-domains/support/support.prd.json - DOM-SUP-006
 */

import { useQuery } from '@tanstack/react-query';
import { normalizeReadQueryError } from '@/lib/read-path-policy';
import { queryKeys } from '@/lib/query-keys';
import { getSupportMetrics } from '@/server/functions/support/support-metrics';

// ============================================================================
// QUERY KEYS
// ============================================================================

// Query keys are now centralized in @/lib/query-keys.ts

// ============================================================================
// HOOKS
// ============================================================================

export interface UseSupportMetricsOptions {
  startDate?: string;
  endDate?: string;
  enabled?: boolean;
}

export function useSupportMetrics({
  startDate,
  endDate,
  enabled = true,
}: UseSupportMetricsOptions = {}) {
  return useQuery({
    queryKey: queryKeys.support.supportMetricsWithDates(startDate, endDate),
    queryFn: async () => {
      try {
        return await getSupportMetrics({
          data: { startDate, endDate }
        });
      } catch (error) {
        throw normalizeReadQueryError(error, {
          contractType: 'always-shaped',
          fallbackMessage: 'Support metrics are temporarily unavailable. Please refresh and try again.',
        });
      }
    },
    enabled,
    staleTime: 60 * 1000, // 1 minute
    refetchInterval: 5 * 60 * 1000, // 5 minutes
  });
}
