/**
 * Customer Analytics Hooks
 *
 * TanStack Query hooks for customer analytics data fetching.
 * Routes use these hooks and pass data to presentational components.
 */

import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import {
  getCustomerKpis,
  getHealthDistribution,
  getCustomerTrends,
  getSegmentPerformance,
  getSegmentAnalytics,
  getLifecycleStages,
  getValueTiers,
  getTopCustomers,
  getQuickStats,
  getValueKpis,
  getLifecycleCohorts,
  getChurnMetrics,
  getConversionFunnel,
  getAcquisitionMetrics,
  getProfitabilitySegments,
} from '@/server/functions/customers/customer-analytics';

// ============================================================================
// DASHBOARD HOOKS
// ============================================================================

/**
 * Fetch customer KPIs for dashboard
 */
export function useCustomerKpis(range: '7d' | '30d' | '90d' | '365d' | 'all' = '30d') {
  return useQuery({
    queryKey: queryKeys.customerAnalytics.kpis({ period: range }),
    queryFn: () => getCustomerKpis({ data: { range } }),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Fetch health score distribution
 */
export function useHealthDistribution() {
  return useQuery({
    queryKey: queryKeys.customerAnalytics.healthDistribution(),
    queryFn: () => getHealthDistribution({ data: {} }),
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Fetch customer trends over time
 */
export function useCustomerTrends(range: '7d' | '30d' | '90d' | '365d' | 'all' = '30d') {
  return useQuery({
    queryKey: queryKeys.customerAnalytics.trends({ period: range }),
    queryFn: () => getCustomerTrends({ data: { range } }),
    staleTime: 5 * 60 * 1000,
  });
}

// ============================================================================
// SEGMENT HOOKS
// ============================================================================

/**
 * Fetch segment (tag) performance metrics
 */
export function useSegmentPerformance() {
  return useQuery({
    queryKey: queryKeys.customerAnalytics.segments(),
    queryFn: () => getSegmentPerformance({ data: {} }),
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Fetch analytics for a specific segment
 */
export function useSegmentAnalytics(tagId: string | null) {
  return useQuery({
    queryKey: queryKeys.customerAnalytics.segmentAnalytics(tagId ?? ''),
    queryFn: () => getSegmentAnalytics({ data: { tagId: tagId! } }),
    enabled: !!tagId,
    staleTime: 5 * 60 * 1000,
  });
}

// ============================================================================
// LIFECYCLE & VALUE HOOKS
// ============================================================================

/**
 * Fetch customer lifecycle stage distribution
 */
export function useLifecycleStages() {
  return useQuery({
    queryKey: queryKeys.customerAnalytics.lifecycleStages(),
    queryFn: () => getLifecycleStages({ data: {} }),
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Fetch lifecycle cohort retention metrics
 */
export function useLifecycleCohorts(range: '3m' | '6m' | '1y' = '6m') {
  return useQuery({
    queryKey: queryKeys.customerAnalytics.lifecycleCohorts({ range }),
    queryFn: () => getLifecycleCohorts({ data: { range } }),
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Fetch churn metrics
 */
export function useChurnMetrics(range: '3m' | '6m' | '1y' = '6m') {
  return useQuery({
    queryKey: queryKeys.customerAnalytics.churnMetrics({ range }),
    queryFn: () => getChurnMetrics({ data: { range } }),
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Fetch conversion funnel metrics
 */
export function useConversionFunnel(range: '3m' | '6m' | '1y' = '6m') {
  return useQuery({
    queryKey: queryKeys.customerAnalytics.conversionFunnel({ range }),
    queryFn: () => getConversionFunnel({ data: { range } }),
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Fetch acquisition metrics
 */
export function useAcquisitionMetrics(range: '3m' | '6m' | '1y' = '6m') {
  return useQuery({
    queryKey: queryKeys.customerAnalytics.acquisitionMetrics({ range }),
    queryFn: () => getAcquisitionMetrics({ data: { range } }),
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Fetch quick stats for the customer dashboard
 */
export function useQuickStats(range: '7d' | '30d' | '90d' | '365d' | 'all' = '30d') {
  return useQuery({
    queryKey: queryKeys.customerAnalytics.quickStats({ range }),
    queryFn: () => getQuickStats({ data: { range } }),
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Fetch value tier distribution
 */
export function useValueTiers() {
  return useQuery({
    queryKey: queryKeys.customerAnalytics.valueTiers(),
    queryFn: () => getValueTiers({ data: {} }),
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Fetch value KPIs for value analysis
 */
export function useValueKpis(range: '3m' | '6m' | '1y' = '6m') {
  return useQuery({
    queryKey: queryKeys.customerAnalytics.valueKpis({ range }),
    queryFn: () => getValueKpis({ data: { range } }),
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Fetch profitability segments (revenue-based)
 */
export function useProfitabilitySegments(range: '3m' | '6m' | '1y' = '6m') {
  return useQuery({
    queryKey: queryKeys.customerAnalytics.profitabilitySegments({ range }),
    queryFn: () => getProfitabilitySegments({ data: { range } }),
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Fetch top customers by LTV
 */
export function useTopCustomers(limit: number = 10) {
  return useQuery({
    queryKey: queryKeys.customerAnalytics.topCustomers({ limit }),
    queryFn: () => getTopCustomers({ data: { limit } }),
    staleTime: 5 * 60 * 1000,
  });
}

// ============================================================================
// COMBINED HOOK FOR DASHBOARD
// ============================================================================

/**
 * Fetch all dashboard analytics data in parallel
 */
export function useDashboardAnalytics(range: '7d' | '30d' | '90d' | '365d' | 'all' = '30d') {
  const kpis = useCustomerKpis(range);
  const health = useHealthDistribution();
  const trends = useCustomerTrends(range);
  const segments = useSegmentPerformance();

  return {
    kpis: kpis.data,
    health: health.data,
    trends: trends.data,
    segments: segments.data,
    isLoading: kpis.isLoading || health.isLoading || trends.isLoading || segments.isLoading,
    isError: kpis.isError || health.isError || trends.isError || segments.isError,
    refetch: () => {
      kpis.refetch();
      health.refetch();
      trends.refetch();
      segments.refetch();
    },
  };
}

/**
 * Fetch all value analysis data in parallel
 */
export function useValueAnalytics() {
  const tiers = useValueTiers();
  const topCustomers = useTopCustomers(10);

  return {
    tiers: tiers.data,
    topCustomers: topCustomers.data,
    isLoading: tiers.isLoading || topCustomers.isLoading,
    isError: tiers.isError || topCustomers.isError,
    refetch: () => {
      tiers.refetch();
      topCustomers.refetch();
    },
  };
}

/**
 * Fetch all lifecycle analytics data
 */
export function useLifecycleAnalytics(range: '3m' | '6m' | '1y' = '6m') {
  const stages = useLifecycleStages();
  const cohorts = useLifecycleCohorts(range);
  const churn = useChurnMetrics(range);
  const conversion = useConversionFunnel(range);
  const acquisition = useAcquisitionMetrics(range);

  return {
    stages: stages.data,
    cohorts: cohorts.data,
    churn: churn.data,
    conversion: conversion.data,
    acquisition: acquisition.data,
    isLoading:
      stages.isLoading ||
      cohorts.isLoading ||
      churn.isLoading ||
      conversion.isLoading ||
      acquisition.isLoading,
    isError:
      stages.isError ||
      cohorts.isError ||
      churn.isError ||
      conversion.isError ||
      acquisition.isError,
    refetch: () => {
      stages.refetch();
      cohorts.refetch();
      churn.refetch();
      conversion.refetch();
      acquisition.refetch();
    },
  };
}
