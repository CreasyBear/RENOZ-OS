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
    queryFn: async () => {
      const result = await getCustomerKpis({ data: { range } });
      if (result == null) {
        throw new Error('Customer KPIs returned no data');
      }
      return result;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Fetch health score distribution
 */
export function useHealthDistribution() {
  return useQuery({
    queryKey: queryKeys.customerAnalytics.healthDistribution(),
    queryFn: async () => {
      const result = await getHealthDistribution({ data: {} });
      if (result == null) throw new Error('Health distribution returned no data');
      return result;
    },
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Fetch customer trends over time
 */
export function useCustomerTrends(range: '7d' | '30d' | '90d' | '365d' | 'all' = '30d') {
  return useQuery({
    queryKey: queryKeys.customerAnalytics.trends({ period: range }),
    queryFn: async () => {
      const result = await getCustomerTrends({ data: { range } });
      if (result == null) throw new Error('Customer trends returned no data');
      return result;
    },
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
    queryFn: async () => {
      const result = await getSegmentPerformance({ data: {} });
      if (result == null) throw new Error('Segment performance returned no data');
      return result;
    },
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Fetch analytics for a specific segment
 */
export function useSegmentAnalytics(tagId: string | null) {
  return useQuery({
    queryKey: queryKeys.customerAnalytics.segmentAnalytics(tagId ?? ''),
    queryFn: async () => {
      const result = await getSegmentAnalytics({ data: { tagId: tagId! } });
      if (result == null) throw new Error('Segment analytics returned no data');
      return result;
    },
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
    queryFn: async () => {
      const result = await getLifecycleStages({ data: {} });
      if (result == null) throw new Error('Lifecycle stages returned no data');
      return result;
    },
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Fetch lifecycle cohort retention metrics
 */
export function useLifecycleCohorts(range: '3m' | '6m' | '1y' = '6m') {
  return useQuery({
    queryKey: queryKeys.customerAnalytics.lifecycleCohorts({ range }),
    queryFn: async () => {
      const result = await getLifecycleCohorts({ data: { range } });
      if (result == null) throw new Error('Lifecycle cohorts returned no data');
      return result;
    },
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Fetch churn metrics
 */
export function useChurnMetrics(range: '3m' | '6m' | '1y' = '6m') {
  return useQuery({
    queryKey: queryKeys.customerAnalytics.churnMetrics({ range }),
    queryFn: async () => {
      const result = await getChurnMetrics({ data: { range } });
      if (result == null) throw new Error('Churn metrics returned no data');
      return result;
    },
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Fetch conversion funnel metrics
 */
export function useConversionFunnel(range: '3m' | '6m' | '1y' = '6m') {
  return useQuery({
    queryKey: queryKeys.customerAnalytics.conversionFunnel({ range }),
    queryFn: async () => {
      const result = await getConversionFunnel({ data: { range } });
      if (result == null) throw new Error('Conversion funnel returned no data');
      return result;
    },
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Fetch acquisition metrics
 */
export function useAcquisitionMetrics(range: '3m' | '6m' | '1y' = '6m') {
  return useQuery({
    queryKey: queryKeys.customerAnalytics.acquisitionMetrics({ range }),
    queryFn: async () => {
      const result = await getAcquisitionMetrics({ data: { range } });
      if (result == null) throw new Error('Acquisition metrics returned no data');
      return result;
    },
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Fetch quick stats for the customer dashboard
 */
export function useQuickStats(range: '7d' | '30d' | '90d' | '365d' | 'all' = '30d') {
  return useQuery({
    queryKey: queryKeys.customerAnalytics.quickStats({ range }),
    queryFn: async () => {
      const result = await getQuickStats({ data: { range } });
      if (result == null) throw new Error('Quick stats returned no data');
      return result;
    },
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Fetch value tier distribution
 */
export function useValueTiers() {
  return useQuery({
    queryKey: queryKeys.customerAnalytics.valueTiers(),
    queryFn: async () => {
      const result = await getValueTiers({ data: {} });
      if (result == null) throw new Error('Value tiers returned no data');
      return result;
    },
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Fetch value KPIs for value analysis
 */
export function useValueKpis(range: '3m' | '6m' | '1y' = '6m') {
  return useQuery({
    queryKey: queryKeys.customerAnalytics.valueKpis({ range }),
    queryFn: async () => {
      const result = await getValueKpis({ data: { range } });
      if (result == null) throw new Error('Value KPIs returned no data');
      return result;
    },
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Fetch profitability segments (revenue-based)
 */
export function useProfitabilitySegments(range: '3m' | '6m' | '1y' = '6m') {
  return useQuery({
    queryKey: queryKeys.customerAnalytics.profitabilitySegments({ range }),
    queryFn: async () => {
      const result = await getProfitabilitySegments({ data: { range } });
      if (result == null) throw new Error('Profitability segments returned no data');
      return result;
    },
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Fetch top customers by LTV
 */
export function useTopCustomers(limit: number = 10) {
  return useQuery({
    queryKey: queryKeys.customerAnalytics.topCustomers({ limit }),
    queryFn: async () => {
      const result = await getTopCustomers({ data: { limit } });
      if (result == null) throw new Error('Top customers returned no data');
      return result;
    },
    staleTime: 5 * 60 * 1000,
  });
}

// ============================================================================
// COMBINED HOOK FOR DASHBOARD
// ============================================================================

/**
 * Fetch all dashboard analytics data in parallel
 * Returns flattened structure to avoid double nesting (e.g., kpis.kpis)
 */
export function useDashboardAnalytics(range: '7d' | '30d' | '90d' | '365d' | 'all' = '30d') {
  const kpis = useCustomerKpis(range);
  const health = useHealthDistribution();
  const trends = useCustomerTrends(range);
  const segments = useSegmentPerformance();

  return {
    kpis: kpis.data?.kpis, // Flatten: extract kpis array from { kpis: { kpis: [...] } }
    health: health.data?.distribution, // Flatten: extract distribution from { distribution: {...} }
    trends: trends.data, // Already flat: { customerTrend: [...], revenueTrend: [...] }
    segments: segments.data?.segments, // Flatten: extract segments array from { segments: [...] }
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
 * Returns flattened structure to avoid double nesting (e.g., tiers.tiers)
 */
export function useValueAnalytics() {
  const tiers = useValueTiers();
  const topCustomers = useTopCustomers(10);

  return {
    tiers: tiers.data?.tiers, // Flatten: extract tiers array from { tiers: [...] }
    topCustomers: topCustomers.data?.customers, // Flatten: extract customers array from { customers: [...] }
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
 * Returns flattened structure to avoid double nesting (e.g., stages.stages, cohorts.cohorts)
 */
export function useLifecycleAnalytics(range: '3m' | '6m' | '1y' = '6m') {
  const stages = useLifecycleStages();
  const cohorts = useLifecycleCohorts(range);
  const churn = useChurnMetrics(range);
  const conversion = useConversionFunnel(range);
  const acquisition = useAcquisitionMetrics(range);

  return {
    stages: stages.data?.stages, // Flatten: extract stages array from { stages: [...] }
    cohorts: cohorts.data?.cohorts, // Flatten: extract cohorts array from { cohorts: [...] }
    churn: churn.data, // Already flat
    conversion: conversion.data, // Already flat
    acquisition: acquisition.data, // Already flat
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
