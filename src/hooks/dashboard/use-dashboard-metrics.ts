/**
 * Dashboard Metrics Hooks
 *
 * TanStack Query hooks for dashboard metrics:
 * - Dashboard summary with KPIs
 * - Metrics comparison between periods
 * - Enhanced comparison with insights and trends
 *
 * @see src/server/functions/dashboard/dashboard-metrics.ts
 * @see src/server/functions/dashboard/comparison.ts
 * @see src/lib/schemas/dashboard/metrics.ts
 * @see src/lib/schemas/dashboard/comparison.ts
 */
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import {
  getDashboardMetrics,
  getMetricsComparison,
  getEnhancedComparison,
} from '@/server/functions/dashboard';
import type {
  GetDashboardMetricsInput,
  GetMetricsComparisonInput,
} from '@/lib/schemas/dashboard/metrics';
import type { EnhancedComparisonInput } from '@/lib/schemas/dashboard/comparison';

// ============================================================================
// TYPES
// ============================================================================

export interface UseDashboardMetricsOptions extends Partial<GetDashboardMetricsInput> {
  enabled?: boolean;
}

export interface UseMetricsComparisonOptions extends GetMetricsComparisonInput {
  enabled?: boolean;
}

export interface UseEnhancedComparisonOptions extends EnhancedComparisonInput {
  enabled?: boolean;
}

// ============================================================================
// METRICS HOOKS
// ============================================================================

/**
 * Get dashboard metrics summary with KPIs, charts, and activity.
 *
 * Uses direct server function call (no useServerFn) per backup pattern -
 * matches working implementation from renoz-v3 6.
 */
export function useDashboardMetrics(options: UseDashboardMetricsOptions = {}) {
  const { enabled = true, ...filters } = options;

  return useQuery({
    queryKey: queryKeys.dashboard.metrics.summary(filters as Record<string, unknown>),
    queryFn: async () => {
      const result = await getDashboardMetrics({ data: filters });
      if (result == null) throw new Error('Dashboard metrics returned no data');
      // Normalize dateRange and lastUpdated from ISO strings (RPC serialization) to Date objects
      const dr = result.dateRange;
      return {
        ...result,
        dateRange: {
          from: typeof dr.from === 'string' ? new Date(dr.from) : dr.from,
          to: typeof dr.to === 'string' ? new Date(dr.to) : dr.to,
          preset: dr.preset,
        },
        lastUpdated:
          typeof result.lastUpdated === 'string'
            ? new Date(result.lastUpdated)
            : result.lastUpdated,
      };
    },
    enabled,
    staleTime: 30 * 1000, // 30 seconds - metrics refresh frequently
    refetchOnWindowFocus: true,
  });
}

/**
 * Get metrics comparison between two time periods.
 */
export function useMetricsComparison({
  dateFrom,
  dateTo,
  comparisonType,
  enabled = true,
}: UseMetricsComparisonOptions) {
  return useQuery({
    queryKey: queryKeys.dashboard.metrics.comparison({
      startDate: dateFrom,
      endDate: dateTo,
      comparisonType: comparisonType === 'none' ? 'previous_period' : comparisonType,
    }),
    queryFn: async () => {
      const result = await getMetricsComparison({
        data: { dateFrom, dateTo, comparisonType },
      });
      if (result == null) throw new Error('Metrics comparison returned no data');
      return result;
    },
    enabled: enabled && !!dateFrom && !!dateTo,
    staleTime: 60 * 1000, // 1 minute - comparison data changes less frequently
  });
}

/**
 * Get enhanced metrics comparison with trend analysis, statistical significance,
 * and automated insights.
 *
 * @see DASH-COMPARISON-API acceptance criteria
 */
export function useEnhancedComparison({
  dateFrom,
  dateTo,
  comparisonPeriod = 'previous_period',
  customPreviousFrom,
  customPreviousTo,
  metrics,
  includeTrend = true,
  includeSignificance = true,
  includeInsights = true,
  enabled = true,
}: UseEnhancedComparisonOptions) {
  return useQuery({
    queryKey: queryKeys.dashboard.metrics.enhanced({
      startDate: dateFrom,
      endDate: dateTo,
      comparisonType: comparisonPeriod,
      metrics,
      includeTrends: includeTrend,
      includeInsights,
    }),
    queryFn: async () => {
      const result = await getEnhancedComparison({
        data: {
          dateFrom,
          dateTo,
          comparisonPeriod,
          customPreviousFrom,
          customPreviousTo,
          metrics,
          includeTrend,
          includeSignificance,
          includeInsights,
        },
      });
      if (result == null) throw new Error('Enhanced comparison returned no data');
      return result;
    },
    enabled: enabled && !!dateFrom && !!dateTo,
    staleTime: 60 * 1000, // 1 minute - comparison data changes less frequently
  });
}

// ============================================================================
// TYPES EXPORT
// ============================================================================

export type {
  GetDashboardMetricsInput,
  GetMetricsComparisonInput,
  EnhancedComparisonInput,
};
