/**
 * Warranty Analytics TanStack Query Hook
 *
 * Provides data fetching for warranty analytics dashboard with
 * claims breakdown, SLA compliance, trend analysis, and export.
 *
 * @see src/server/functions/warranty-analytics.ts
 * @see _Initiation/_prd/2-domains/warranty/warranty.prd.json - DOM-WAR-008
 */

import { useQuery, useMutation } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import {
  getWarrantyAnalyticsSummary,
  getClaimsByProduct,
  getClaimsTrend,
  getClaimsByType,
  getSlaComplianceMetrics,
  getCycleCountAtClaim,
  getExtensionVsResolution,
  exportWarrantyAnalytics,
  getWarrantyAnalyticsFilterOptions,
} from '@/server/functions/warranty/analytics/warranty-analytics';
import type {
  WarrantyAnalyticsFilter,
  WarrantyAnalyticsSummary,
  ClaimsByProductResult,
  ClaimsTrendResult,
  ClaimsByTypeResult,
  SlaComplianceMetrics,
  CycleCountAtClaimResult,
  ExtensionVsResolutionResult,
  ExportWarrantyAnalyticsResult,
  WarrantyAnalyticsFilterOptions,
  GetClaimsTrendInput,
  ExportWarrantyAnalyticsInput,
} from '@/lib/schemas/warranty/analytics';

// ============================================================================
// QUERY KEYS
// ============================================================================

// Query keys are now centralized in @/lib/query-keys.ts

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type {
  WarrantyAnalyticsFilter,
  WarrantyAnalyticsSummary,
  ClaimsByProductResult,
  ClaimsTrendResult,
  ClaimsByTypeResult,
  SlaComplianceMetrics,
  CycleCountAtClaimResult,
  ExtensionVsResolutionResult,
  ExportWarrantyAnalyticsResult,
  WarrantyAnalyticsFilterOptions,
};

// ============================================================================
// STALE TIME CONFIGURATION (Analytics can be stale for 2-5 minutes)
// ============================================================================

const ANALYTICS_STALE_TIME = 2 * 60 * 1000; // 2 minutes
const FILTER_OPTIONS_STALE_TIME = 5 * 60 * 1000; // 5 minutes

// ============================================================================
// SUMMARY HOOK
// ============================================================================

export interface UseWarrantyAnalyticsSummaryOptions {
  startDate?: string;
  endDate?: string;
  warrantyType?: WarrantyAnalyticsFilter['warrantyType'];
  claimType?: WarrantyAnalyticsFilter['claimType'];
  enabled?: boolean;
}

/**
 * Fetch warranty analytics summary metrics.
 */
export function useWarrantyAnalyticsSummary(options: UseWarrantyAnalyticsSummaryOptions = {}) {
  const { startDate, endDate, warrantyType = 'all', claimType = 'all', enabled = true } = options;

  const filters: WarrantyAnalyticsFilter = {
    startDate,
    endDate,
    warrantyType,
    claimType,
  };

  return useQuery({
    queryKey: queryKeys.warrantyAnalytics.summary(filters),
    queryFn: () => getWarrantyAnalyticsSummary({ data: filters }),
    staleTime: ANALYTICS_STALE_TIME,
    enabled,
  });
}

// ============================================================================
// CLAIMS BY PRODUCT HOOK
// ============================================================================

export interface UseClaimsByProductOptions {
  startDate?: string;
  endDate?: string;
  warrantyType?: WarrantyAnalyticsFilter['warrantyType'];
  claimType?: WarrantyAnalyticsFilter['claimType'];
  enabled?: boolean;
}

/**
 * Fetch claims breakdown by product/battery model.
 */
export function useClaimsByProduct(options: UseClaimsByProductOptions = {}) {
  const { startDate, endDate, warrantyType = 'all', claimType = 'all', enabled = true } = options;

  const filters: WarrantyAnalyticsFilter = {
    startDate,
    endDate,
    warrantyType,
    claimType,
  };

  return useQuery({
    queryKey: queryKeys.warrantyAnalytics.claimsByProduct(filters),
    queryFn: () => getClaimsByProduct({ data: filters }),
    staleTime: ANALYTICS_STALE_TIME,
    enabled,
  });
}

// ============================================================================
// CLAIMS TREND HOOK
// ============================================================================

export interface UseClaimsTrendOptions {
  months?: number;
  warrantyType?: WarrantyAnalyticsFilter['warrantyType'];
  claimType?: WarrantyAnalyticsFilter['claimType'];
  enabled?: boolean;
}

/**
 * Fetch monthly claims trend for line chart.
 */
export function useClaimsTrend(options: UseClaimsTrendOptions = {}) {
  const { months = 6, warrantyType = 'all', claimType = 'all', enabled = true } = options;

  const input: GetClaimsTrendInput = {
    months,
    warrantyType,
    claimType,
  };

  return useQuery({
    queryKey: queryKeys.warrantyAnalytics.claimsTrend(input),
    queryFn: () => getClaimsTrend({ data: input }),
    staleTime: ANALYTICS_STALE_TIME,
    enabled,
  });
}

// ============================================================================
// CLAIMS BY TYPE HOOK
// ============================================================================

export interface UseClaimsByTypeOptions {
  startDate?: string;
  endDate?: string;
  warrantyType?: WarrantyAnalyticsFilter['warrantyType'];
  enabled?: boolean;
}

/**
 * Fetch claims breakdown by claim type for pie/donut chart.
 */
export function useClaimsByType(options: UseClaimsByTypeOptions = {}) {
  const { startDate, endDate, warrantyType = 'all', enabled = true } = options;

  const filters: WarrantyAnalyticsFilter = {
    startDate,
    endDate,
    warrantyType,
    claimType: 'all', // Not filtered here since we're grouping by type
  };

  return useQuery({
    queryKey: queryKeys.warrantyAnalytics.claimsByType(filters),
    queryFn: () => getClaimsByType({ data: filters }),
    staleTime: ANALYTICS_STALE_TIME,
    enabled,
  });
}

// ============================================================================
// SLA COMPLIANCE HOOK
// ============================================================================

export interface UseSlaComplianceMetricsOptions {
  startDate?: string;
  endDate?: string;
  warrantyType?: WarrantyAnalyticsFilter['warrantyType'];
  claimType?: WarrantyAnalyticsFilter['claimType'];
  enabled?: boolean;
}

/**
 * Fetch SLA compliance metrics for claims.
 */
export function useSlaComplianceMetrics(options: UseSlaComplianceMetricsOptions = {}) {
  const { startDate, endDate, warrantyType = 'all', claimType = 'all', enabled = true } = options;

  const filters: WarrantyAnalyticsFilter = {
    startDate,
    endDate,
    warrantyType,
    claimType,
  };

  return useQuery({
    queryKey: queryKeys.warrantyAnalytics.slaCompliance(filters),
    queryFn: () => getSlaComplianceMetrics({ data: filters }),
    staleTime: ANALYTICS_STALE_TIME,
    enabled,
  });
}

// ============================================================================
// CYCLE COUNT HOOK
// ============================================================================

export interface UseCycleCountAtClaimOptions {
  startDate?: string;
  endDate?: string;
  warrantyType?: WarrantyAnalyticsFilter['warrantyType'];
  claimType?: WarrantyAnalyticsFilter['claimType'];
  enabled?: boolean;
}

/**
 * Fetch average cycle count when claims are filed.
 */
export function useCycleCountAtClaim(options: UseCycleCountAtClaimOptions = {}) {
  const { startDate, endDate, warrantyType = 'all', claimType = 'all', enabled = true } = options;

  const filters: WarrantyAnalyticsFilter = {
    startDate,
    endDate,
    warrantyType,
    claimType,
  };

  return useQuery({
    queryKey: queryKeys.warrantyAnalytics.cycleCount(filters),
    queryFn: () => getCycleCountAtClaim({ data: filters }),
    staleTime: ANALYTICS_STALE_TIME,
    enabled,
  });
}

// ============================================================================
// EXTENSION VS RESOLUTION HOOK
// ============================================================================

export interface UseExtensionVsResolutionOptions {
  startDate?: string;
  endDate?: string;
  enabled?: boolean;
}

/**
 * Fetch extension type vs resolution type breakdown.
 */
export function useExtensionVsResolution(options: UseExtensionVsResolutionOptions = {}) {
  const { startDate, endDate, enabled = true } = options;

  const filters: WarrantyAnalyticsFilter = {
    startDate,
    endDate,
    warrantyType: 'all',
    claimType: 'all',
  };

  return useQuery({
    queryKey: queryKeys.warrantyAnalytics.extensionVsResolution(filters),
    queryFn: () => getExtensionVsResolution({ data: filters }),
    staleTime: ANALYTICS_STALE_TIME,
    enabled,
  });
}

// ============================================================================
// FILTER OPTIONS HOOK
// ============================================================================

/**
 * Fetch filter options for the analytics UI.
 */
export function useWarrantyAnalyticsFilterOptions() {
  return useQuery({
    queryKey: queryKeys.warrantyAnalytics.filterOptions(),
    queryFn: () => getWarrantyAnalyticsFilterOptions(),
    staleTime: FILTER_OPTIONS_STALE_TIME,
  });
}

// ============================================================================
// EXPORT HOOK
// ============================================================================

export interface UseExportWarrantyAnalyticsOptions {
  onSuccess?: (result: ExportWarrantyAnalyticsResult) => void;
  onError?: (error: Error) => void;
}

/**
 * Export warranty analytics data to CSV or JSON.
 */
export function useExportWarrantyAnalytics(options: UseExportWarrantyAnalyticsOptions = {}) {
  const { onSuccess, onError } = options;

  return useMutation({
    mutationFn: (input: ExportWarrantyAnalyticsInput) => exportWarrantyAnalytics({ data: input }),
    onSuccess: (result) => {
      // Trigger download
      const blob = new Blob([result.data], { type: result.mimeType });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = result.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      onSuccess?.(result);
    },
    onError: (error: Error) => {
      onError?.(error);
    },
  });
}

// ============================================================================
// COMBINED DASHBOARD HOOK
// ============================================================================

export interface UseWarrantyAnalyticsDashboardOptions {
  startDate?: string;
  endDate?: string;
  warrantyType?: WarrantyAnalyticsFilter['warrantyType'];
  claimType?: WarrantyAnalyticsFilter['claimType'];
  trendMonths?: number;
  enabled?: boolean;
}

/**
 * Combined hook for warranty analytics dashboard.
 * Fetches all analytics data in parallel.
 */
export function useWarrantyAnalyticsDashboard(options: UseWarrantyAnalyticsDashboardOptions = {}) {
  const {
    startDate,
    endDate,
    warrantyType = 'all',
    claimType = 'all',
    trendMonths = 6,
    enabled = true,
  } = options;

  const summaryQuery = useWarrantyAnalyticsSummary({
    startDate,
    endDate,
    warrantyType,
    claimType,
    enabled,
  });

  const claimsByProductQuery = useClaimsByProduct({
    startDate,
    endDate,
    warrantyType,
    claimType,
    enabled,
  });

  const claimsTrendQuery = useClaimsTrend({
    months: trendMonths,
    warrantyType,
    claimType,
    enabled,
  });

  const claimsByTypeQuery = useClaimsByType({
    startDate,
    endDate,
    warrantyType,
    enabled,
  });

  const slaComplianceQuery = useSlaComplianceMetrics({
    startDate,
    endDate,
    warrantyType,
    claimType,
    enabled,
  });

  const cycleCountQuery = useCycleCountAtClaim({
    startDate,
    endDate,
    warrantyType,
    claimType,
    enabled,
  });

  const extensionVsResolutionQuery = useExtensionVsResolution({
    startDate,
    endDate,
    enabled,
  });

  const isLoading =
    summaryQuery.isLoading ||
    claimsByProductQuery.isLoading ||
    claimsTrendQuery.isLoading ||
    claimsByTypeQuery.isLoading ||
    slaComplianceQuery.isLoading ||
    cycleCountQuery.isLoading ||
    extensionVsResolutionQuery.isLoading;

  const isError =
    summaryQuery.isError ||
    claimsByProductQuery.isError ||
    claimsTrendQuery.isError ||
    claimsByTypeQuery.isError ||
    slaComplianceQuery.isError ||
    cycleCountQuery.isError ||
    extensionVsResolutionQuery.isError;

  const refetchAll = async () => {
    await Promise.all([
      summaryQuery.refetch(),
      claimsByProductQuery.refetch(),
      claimsTrendQuery.refetch(),
      claimsByTypeQuery.refetch(),
      slaComplianceQuery.refetch(),
      cycleCountQuery.refetch(),
      extensionVsResolutionQuery.refetch(),
    ]);
  };

  return {
    summary: summaryQuery.data,
    claimsByProduct: claimsByProductQuery.data,
    claimsTrend: claimsTrendQuery.data,
    claimsByType: claimsByTypeQuery.data,
    slaCompliance: slaComplianceQuery.data,
    cycleCount: cycleCountQuery.data,
    extensionVsResolution: extensionVsResolutionQuery.data,
    isLoading,
    isError,
    refetchAll,
    queries: {
      summary: summaryQuery,
      claimsByProduct: claimsByProductQuery,
      claimsTrend: claimsTrendQuery,
      claimsByType: claimsByTypeQuery,
      slaCompliance: slaComplianceQuery,
      cycleCount: cycleCountQuery,
      extensionVsResolution: extensionVsResolutionQuery,
    },
  };
}
