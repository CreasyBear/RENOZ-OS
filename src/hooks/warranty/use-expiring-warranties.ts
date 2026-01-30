/**
 * Expiring Warranties TanStack Query Hook
 *
 * Provides data fetching for warranties approaching expiry.
 * Used by dashboard widget (DOM-WAR-003b) and reports.
 *
 * @see src/server/functions/warranties.ts
 * @see _Initiation/_prd/2-domains/warranty/warranty.prd.json - DOM-WAR-003b
 */

import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import {
  getExpiringWarranties,
  getExpiringWarrantiesReport,
  getExpiringWarrantiesFilterOptions,
  type GetExpiringWarrantiesResult,
  type ExpiringWarrantiesReportResult,
} from '@/server/functions/warranty/warranties';

// ============================================================================
// QUERY KEYS
// ============================================================================

// Query keys are now centralized in @/lib/query-keys.ts

// ============================================================================
// HOOK
// ============================================================================

export interface UseExpiringWarrantiesOptions {
  /** Number of days to look ahead (default: 30) */
  days?: number;
  /** Maximum number of results (default: 10) */
  limit?: number;
  /** Sort by expiry date (default: 'asc' - soonest first) */
  sortOrder?: 'asc' | 'desc';
  /** Enable/disable the query */
  enabled?: boolean;
}

/**
 * Hook for fetching warranties expiring within a time window.
 *
 * @example
 * ```tsx
 * // Dashboard widget (5 items, 30 days)
 * const { data, isLoading, error } = useExpiringWarranties({ limit: 5 })
 *
 * // Report page (50 items, 90 days)
 * const { data } = useExpiringWarranties({ days: 90, limit: 50 })
 * ```
 */
export function useExpiringWarranties(options?: UseExpiringWarrantiesOptions) {
  const { days = 30, limit = 10, sortOrder = 'asc', enabled = true } = options ?? {};

  return useQuery<GetExpiringWarrantiesResult>({
    queryKey: queryKeys.expiringWarranties.list({ days, limit, sortOrder }),
    queryFn: () => getExpiringWarranties({ data: { days, limit, sortOrder } }),
    enabled,
    // Stale after 5 minutes since warranty expiry changes slowly
    staleTime: 5 * 60 * 1000,
  });
}

// ============================================================================
// REPORT HOOK (DOM-WAR-003c)
// ============================================================================

// Query keys are now centralized in @/lib/query-keys.ts

export interface UseExpiringWarrantiesReportOptions {
  days?: number;
  customerId?: string;
  productId?: string;
  status?: 'active' | 'expired' | 'all';
  sortBy?: 'expiry_asc' | 'expiry_desc' | 'customer' | 'product';
  page?: number;
  limit?: number;
  enabled?: boolean;
}

/**
 * Hook for fetching expiring warranties report data with filters and pagination.
 */
export function useExpiringWarrantiesReport(options?: UseExpiringWarrantiesReportOptions) {
  const {
    days = 30,
    customerId,
    productId,
    status = 'active',
    sortBy = 'expiry_asc',
    page = 1,
    limit = 20,
    enabled = true,
  } = options ?? {};

  return useQuery<ExpiringWarrantiesReportResult>({
    queryKey: queryKeys.expiringWarrantiesReport.list({
      days,
      customerId,
      productId,
      status,
      sortBy,
      page,
      limit,
    }),
    queryFn: () =>
      getExpiringWarrantiesReport({
        data: { days, customerId, productId, status, sortBy, page, limit },
      }),
    enabled,
    staleTime: 2 * 60 * 1000, // 2 minutes for report data
  });
}

/**
 * Hook for fetching filter options (customers and products with warranties).
 */
export function useExpiringWarrantiesFilterOptions() {
  return useQuery({
    queryKey: queryKeys.expiringWarrantiesReport.filterOptions,
    queryFn: () => getExpiringWarrantiesFilterOptions(),
    staleTime: 10 * 60 * 1000, // 10 minutes for filter options
  });
}

// ============================================================================
// TYPES RE-EXPORT
// ============================================================================

export type {
  GetExpiringWarrantiesResult,
  ExpiringWarrantiesReportResult,
  ExpiringWarrantyItem,
} from '@/server/functions/warranty/warranties';
