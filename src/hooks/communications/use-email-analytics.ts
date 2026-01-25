/**
 * Email Analytics Hooks
 *
 * Query hooks for email delivery metrics.
 *
 * @see INT-RES-005
 */

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
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
    queryFn: () =>
      getEmailMetrics({
        data: {
          period: filters.period ?? "30d",
          startDate: filters.startDate,
          endDate: filters.endDate,
        },
      }),
    enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes - metrics change slowly
  });
}
