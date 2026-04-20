/**
 * Recent Items Hooks
 *
 * TanStack Query hooks for dashboard popover data.
 * Each hook returns { items, total, isLoading } for MetricCardPopover.
 *
 * PATTERN: Hooks are lightweight and only fetch when enabled.
 * Use `enabled` prop to defer fetching until popover is shown.
 *
 * @see src/server/functions/dashboard/recent-items.ts for server functions
 * @see src/components/shared/metric-card-popover.tsx for UI component
 */

import { useQuery } from '@tanstack/react-query';
import { normalizeReadQueryError } from '@/lib/read-path-policy';
import { queryKeys } from '@/lib/query-keys';
import {
  getRecentOutstandingInvoices,
  getRecentOverdueInvoices,
  getRecentOpportunities,
  getRecentOrdersToShip,
  type RecentItemsResponse,
} from '@/server/functions/dashboard/recent-items';

// ============================================================================
// SHARED OPTIONS
// ============================================================================

interface UseRecentItemsOptions {
  /** Number of items to fetch (default 5, max 10) */
  limit?: number;
  /** Enable/disable the query */
  enabled?: boolean;
}

// ============================================================================
// FINANCIAL HOOKS
// ============================================================================

/**
 * Fetch recent outstanding invoices for AR Balance popover
 */
export function useRecentOutstandingInvoices({
  limit = 5,
  enabled = true,
}: UseRecentItemsOptions = {}) {
  return useQuery<RecentItemsResponse>({
    queryKey: queryKeys.dashboard.recentOutstanding(limit),
    queryFn: async () => {
      try {
        return await getRecentOutstandingInvoices({
          data: { limit }
        });
      } catch (error) {
        throw normalizeReadQueryError(error, {
          contractType: 'always-shaped',
          fallbackMessage: 'Outstanding invoice details are temporarily unavailable. Please refresh and try again.',
        });
      }
    },
    enabled,
    staleTime: 60 * 1000, // 1 minute
  });
}

/**
 * Fetch recent overdue invoices for Overdue AR popover
 */
export function useRecentOverdueInvoices({
  limit = 5,
  enabled = true,
}: UseRecentItemsOptions = {}) {
  return useQuery<RecentItemsResponse>({
    queryKey: queryKeys.dashboard.recentOverdue(limit),
    queryFn: async () => {
      try {
        return await getRecentOverdueInvoices({
          data: { limit }
        });
      } catch (error) {
        throw normalizeReadQueryError(error, {
          contractType: 'always-shaped',
          fallbackMessage: 'Overdue invoice details are temporarily unavailable. Please refresh and try again.',
        });
      }
    },
    enabled,
    staleTime: 60 * 1000,
  });
}

// ============================================================================
// PIPELINE HOOKS
// ============================================================================

/**
 * Fetch top opportunities for Pipeline Value popover
 */
export function useRecentOpportunities({
  limit = 5,
  enabled = true,
}: UseRecentItemsOptions = {}) {
  return useQuery<RecentItemsResponse>({
    queryKey: queryKeys.dashboard.recentOpportunities(limit),
    queryFn: async () => {
      try {
        return await getRecentOpportunities({
          data: { limit }
        });
      } catch (error) {
        throw normalizeReadQueryError(error, {
          contractType: 'always-shaped',
          fallbackMessage: 'Recent opportunities are temporarily unavailable. Please refresh and try again.',
        });
      }
    },
    enabled,
    staleTime: 60 * 1000,
  });
}

// ============================================================================
// OPERATIONS HOOKS
// ============================================================================

/**
 * Fetch orders ready to ship for Operations popover
 */
export function useRecentOrdersToShip({
  limit = 5,
  enabled = true,
}: UseRecentItemsOptions = {}) {
  return useQuery<RecentItemsResponse>({
    queryKey: queryKeys.dashboard.recentOrdersToShip(limit),
    queryFn: async () => {
      try {
        return await getRecentOrdersToShip({
          data: { limit }
        });
      } catch (error) {
        throw normalizeReadQueryError(error, {
          contractType: 'always-shaped',
          fallbackMessage: 'Orders to fulfill are temporarily unavailable. Please refresh and try again.',
        });
      }
    },
    enabled,
    staleTime: 60 * 1000,
  });
}
