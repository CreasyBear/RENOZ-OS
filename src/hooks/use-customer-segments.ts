/**
 * Customer Segments Hooks
 *
 * TanStack Query hooks for segment management with statistics.
 */

import { useQuery } from '@tanstack/react-query'
import { useServerFn } from '@tanstack/react-start'
import {
  getSegmentsWithStats,
  getSegmentAnalytics,
  type SegmentWithStats,
  type SegmentAnalyticsData,
} from '@/server/functions/customer-segments'

// ============================================================================
// QUERY KEYS
// ============================================================================

export const segmentKeys = {
  all: ['customer-segments'] as const,
  list: (opts?: { includeEmpty?: boolean }) =>
    [...segmentKeys.all, 'list', opts ?? {}] as const,
  analytics: (segmentId: string) =>
    [...segmentKeys.all, 'analytics', segmentId] as const,
}

// ============================================================================
// SEGMENTS LIST
// ============================================================================

export interface UseSegmentsOptions {
  includeEmpty?: boolean
  enabled?: boolean
}

/**
 * Hook to fetch all segments with statistics.
 */
export function useSegments(options: UseSegmentsOptions = {}) {
  const { includeEmpty = false, enabled = true } = options

  const segmentsFn = useServerFn(getSegmentsWithStats)

  return useQuery({
    queryKey: segmentKeys.list({ includeEmpty }),
    queryFn: async () => {
      const result = await segmentsFn({ data: { includeEmpty } })
      return result
    },
    enabled,
    staleTime: 1000 * 60 * 2, // 2 minutes
  })
}

// ============================================================================
// SEGMENT ANALYTICS
// ============================================================================

export interface UseSegmentDetailOptions {
  segmentId: string
  enabled?: boolean
}

/**
 * Hook to fetch detailed analytics for a specific segment.
 */
export function useSegmentDetail(options: UseSegmentDetailOptions) {
  const { segmentId, enabled = true } = options

  const analyticsFn = useServerFn(getSegmentAnalytics)

  return useQuery({
    queryKey: segmentKeys.analytics(segmentId),
    queryFn: async () => {
      const result = await analyticsFn({ data: { segmentId } })
      return result
    },
    enabled: enabled && !!segmentId,
    staleTime: 1000 * 60 * 2, // 2 minutes
  })
}

// Re-export types
export type { SegmentWithStats, SegmentAnalyticsData }
