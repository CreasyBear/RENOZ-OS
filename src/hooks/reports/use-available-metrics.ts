/**
 * Available Metrics Hook
 *
 * TanStack Query hook for fetching available metrics from the registry.
 * Returns all metric definitions for use in report configuration UIs.
 *
 * @see src/lib/metrics/registry.ts
 * @see src/lib/query-keys.ts
 */

import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import { getAllMetrics } from '@/lib/metrics/registry';

// ============================================================================
// TYPES
// ============================================================================

export interface UseAvailableMetricsOptions {
  enabled?: boolean;
}

// ============================================================================
// HOOKS
// ============================================================================

/**
 * Get all available metrics from the registry.
 * This hook provides a client-side cache for metric definitions.
 *
 * @example
 * ```tsx
 * const { data: metrics } = useAvailableMetrics();
 *
 * // Filter metrics by table
 * const orderMetrics = metrics?.filter(m => m.table === 'orders');
 *
 * // Get metric by ID
 * const revenueMetric = metrics?.find(m => m.id === 'revenue');
 * ```
 */
export function useAvailableMetrics(options: UseAvailableMetricsOptions = {}) {
  const { enabled = true } = options;

  return useQuery({
    queryKey: queryKeys.reports.metrics.available(),
    queryFn: async () => {
      const result = await getAllMetrics();
      if (result == null) throw new Error('Available metrics returned no data');
      return result;
    },
    enabled,
    staleTime: Infinity, // Metric definitions don't change at runtime
    gcTime: 24 * 60 * 60 * 1000, // Keep in cache for 24 hours
  });
}

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type { MetricId, MetricDefinition } from '@/lib/metrics/registry';
