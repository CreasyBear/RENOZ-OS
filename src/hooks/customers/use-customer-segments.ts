/**
 * Customer Segments Hooks
 *
 * TanStack Query hooks for segment management with statistics.
 */

import { useQuery } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { queryKeys } from '@/lib/query-keys';
import {
  getSegmentsWithStats,
  getSegmentAnalytics,
  type SegmentWithStats,
  type SegmentAnalyticsData,
} from '@/server/functions/customers/customer-segments';

// ============================================================================
// SEGMENTS LIST
// ============================================================================

export interface UseSegmentsOptions {
  includeEmpty?: boolean;
  enabled?: boolean;
}

/**
 * Hook to fetch all segments with statistics.
 */
export function useSegments(options: UseSegmentsOptions = {}) {
  const { includeEmpty = false, enabled = true } = options;

  const segmentsFn = useServerFn(getSegmentsWithStats);

  return useQuery({
    queryKey: queryKeys.customers.segments.list({ includeEmpty }),
    queryFn: async () => {
      const result = await segmentsFn({ data: { includeEmpty } });
      if (result == null) throw new Error('Customer segments returned no data');
      return result;
    },
    enabled,
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
}

// ============================================================================
// SEGMENT ANALYTICS
// ============================================================================

export interface UseSegmentDetailOptions {
  segmentId: string;
  enabled?: boolean;
}

/**
 * Hook to fetch detailed analytics for a specific segment.
 */
export function useSegmentDetail(options: UseSegmentDetailOptions) {
  const { segmentId, enabled = true } = options;

  const analyticsFn = useServerFn(getSegmentAnalytics);

  return useQuery({
    queryKey: queryKeys.customers.segments.analytics(segmentId),
    queryFn: async () => {
      const result = await analyticsFn({ data: { segmentId } });
      if (result == null) throw new Error('Segment analytics returned no data');
      return result;
    },
    enabled: enabled && !!segmentId,
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
}

// Re-export types
export type { SegmentWithStats, SegmentAnalyticsData };
