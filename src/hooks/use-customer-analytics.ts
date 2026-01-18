/**
 * Customer Analytics Hooks
 *
 * TanStack Query hooks for customer analytics data fetching.
 * Routes use these hooks and pass data to presentational components.
 */

import { useQuery } from '@tanstack/react-query'
import {
  getCustomerKpis,
  getHealthDistribution,
  getCustomerTrends,
  getSegmentPerformance,
  getSegmentAnalytics,
  getLifecycleStages,
  getValueTiers,
  getTopCustomers,
} from '@/server/functions/customer-analytics'

// ============================================================================
// QUERY KEYS
// ============================================================================

export const customerAnalyticsKeys = {
  all: ['customer-analytics'] as const,
  kpis: (range: string) => [...customerAnalyticsKeys.all, 'kpis', range] as const,
  healthDistribution: () => [...customerAnalyticsKeys.all, 'health-distribution'] as const,
  trends: (range: string) => [...customerAnalyticsKeys.all, 'trends', range] as const,
  segments: () => [...customerAnalyticsKeys.all, 'segments'] as const,
  segmentAnalytics: (tagId: string) => [...customerAnalyticsKeys.all, 'segment', tagId] as const,
  lifecycleStages: () => [...customerAnalyticsKeys.all, 'lifecycle'] as const,
  valueTiers: () => [...customerAnalyticsKeys.all, 'value-tiers'] as const,
  topCustomers: (limit: number) => [...customerAnalyticsKeys.all, 'top-customers', limit] as const,
}

// ============================================================================
// DASHBOARD HOOKS
// ============================================================================

/**
 * Fetch customer KPIs for dashboard
 */
export function useCustomerKpis(range: '7d' | '30d' | '90d' | '365d' | 'all' = '30d') {
  return useQuery({
    queryKey: customerAnalyticsKeys.kpis(range),
    queryFn: () => getCustomerKpis({ data: { range } }),
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

/**
 * Fetch health score distribution
 */
export function useHealthDistribution() {
  return useQuery({
    queryKey: customerAnalyticsKeys.healthDistribution(),
    queryFn: () => getHealthDistribution({ data: {} }),
    staleTime: 5 * 60 * 1000,
  })
}

/**
 * Fetch customer trends over time
 */
export function useCustomerTrends(range: '7d' | '30d' | '90d' | '365d' | 'all' = '30d') {
  return useQuery({
    queryKey: customerAnalyticsKeys.trends(range),
    queryFn: () => getCustomerTrends({ data: { range } }),
    staleTime: 5 * 60 * 1000,
  })
}

// ============================================================================
// SEGMENT HOOKS
// ============================================================================

/**
 * Fetch segment (tag) performance metrics
 */
export function useSegmentPerformance() {
  return useQuery({
    queryKey: customerAnalyticsKeys.segments(),
    queryFn: () => getSegmentPerformance({ data: {} }),
    staleTime: 5 * 60 * 1000,
  })
}

/**
 * Fetch analytics for a specific segment
 */
export function useSegmentAnalytics(tagId: string | null) {
  return useQuery({
    queryKey: customerAnalyticsKeys.segmentAnalytics(tagId ?? ''),
    queryFn: () => getSegmentAnalytics({ data: { tagId: tagId! } }),
    enabled: !!tagId,
    staleTime: 5 * 60 * 1000,
  })
}

// ============================================================================
// LIFECYCLE & VALUE HOOKS
// ============================================================================

/**
 * Fetch customer lifecycle stage distribution
 */
export function useLifecycleStages() {
  return useQuery({
    queryKey: customerAnalyticsKeys.lifecycleStages(),
    queryFn: () => getLifecycleStages({ data: {} }),
    staleTime: 5 * 60 * 1000,
  })
}

/**
 * Fetch value tier distribution
 */
export function useValueTiers() {
  return useQuery({
    queryKey: customerAnalyticsKeys.valueTiers(),
    queryFn: () => getValueTiers({ data: {} }),
    staleTime: 5 * 60 * 1000,
  })
}

/**
 * Fetch top customers by LTV
 */
export function useTopCustomers(limit: number = 10) {
  return useQuery({
    queryKey: customerAnalyticsKeys.topCustomers(limit),
    queryFn: () => getTopCustomers({ data: { limit } }),
    staleTime: 5 * 60 * 1000,
  })
}

// ============================================================================
// COMBINED HOOK FOR DASHBOARD
// ============================================================================

/**
 * Fetch all dashboard analytics data in parallel
 */
export function useDashboardAnalytics(range: '7d' | '30d' | '90d' | '365d' | 'all' = '30d') {
  const kpis = useCustomerKpis(range)
  const health = useHealthDistribution()
  const trends = useCustomerTrends(range)
  const segments = useSegmentPerformance()

  return {
    kpis: kpis.data,
    health: health.data,
    trends: trends.data,
    segments: segments.data,
    isLoading: kpis.isLoading || health.isLoading || trends.isLoading || segments.isLoading,
    isError: kpis.isError || health.isError || trends.isError || segments.isError,
    refetch: () => {
      kpis.refetch()
      health.refetch()
      trends.refetch()
      segments.refetch()
    },
  }
}

/**
 * Fetch all value analysis data in parallel
 */
export function useValueAnalytics() {
  const tiers = useValueTiers()
  const topCustomers = useTopCustomers(10)

  return {
    tiers: tiers.data,
    topCustomers: topCustomers.data,
    isLoading: tiers.isLoading || topCustomers.isLoading,
    isError: tiers.isError || topCustomers.isError,
    refetch: () => {
      tiers.refetch()
      topCustomers.refetch()
    },
  }
}

/**
 * Fetch all lifecycle analytics data
 */
export function useLifecycleAnalytics() {
  const stages = useLifecycleStages()

  return {
    stages: stages.data,
    isLoading: stages.isLoading,
    isError: stages.isError,
    refetch: stages.refetch,
  }
}
