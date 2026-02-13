/**
 * Email Analytics Hooks
 *
 * Query hooks for email delivery metrics.
 *
 * @see INT-RES-005
 */

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { QUERY_CONFIG } from "@/lib/constants";
import { getEmailMetrics } from "@/server/functions/communications/email-analytics";
import type { EmailMetricsFilters } from "@/lib/schemas/communications/email-analytics";

// ============================================================================
// QUERY HOOKS
// ============================================================================

export interface UseEmailMetricsOptions extends Partial<EmailMetricsFilters> {
  enabled?: boolean;
}

/**
 * Query email delivery metrics for the specified period.
 *
 * @example
 * ```tsx
 * const { data, isLoading } = useEmailMetrics({ period: '30d' });
 *
 * if (data?.metrics) {
 *   console.log(`Delivery rate: ${data.metrics.deliveryRate}%`);
 * }
 * ```
 */
export function useEmailMetrics(options: UseEmailMetricsOptions = {}) {
  const { enabled = true, ...filters } = options;

  return useQuery({
    queryKey: queryKeys.communications.emailAnalytics.metrics(filters),
    queryFn: async () => {
      const result = await getEmailMetrics({
        data: {
          period: filters.period ?? "30d",
          startDate: filters.startDate,
          endDate: filters.endDate,
        },
      });
      if (result == null) throw new Error('Email analytics returned no data');
      return result;
    },
    enabled,
    staleTime: QUERY_CONFIG.STALE_TIME_LONG,
  });
}
