/**
 * Support Metrics Hooks
 *
 * TanStack Query hooks for support dashboard metrics.
 *
 * @see src/server/functions/support-metrics.ts
 * @see _Initiation/_prd/2-domains/support/support.prd.json - DOM-SUP-006
 */

import { useQuery } from '@tanstack/react-query';
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
      const result = await getSupportMetrics({
        data: { startDate, endDate } 
      });
      if (result == null) throw new Error('Query returned no data');
      return result;
    },
    enabled,
    staleTime: 60 * 1000, // 1 minute
    refetchInterval: 5 * 60 * 1000, // 5 minutes
  });
}
