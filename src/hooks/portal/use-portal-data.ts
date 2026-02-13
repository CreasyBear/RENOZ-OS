/**
 * Portal Data Hooks
 *
 * TanStack Query hooks for the customer/subcontractor portal:
 * - Portal orders list
 * - Portal jobs list
 * - Portal quotes list
 */
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import {
  listPortalOrders,
  listPortalJobs,
  listPortalQuotes,
} from '@/server/functions/portal/portal-read';
import type { PortalListParams } from '@/lib/schemas/portal';

// ============================================================================
// TYPES
// ============================================================================

type PortalOrdersResult = Awaited<ReturnType<typeof listPortalOrders>>;
type PortalJobsResult = Awaited<ReturnType<typeof listPortalJobs>>;
type PortalQuotesResult = Awaited<ReturnType<typeof listPortalQuotes>>;

export interface UsePortalListOptions {
  page?: number;
  pageSize?: number;
  enabled?: boolean;
}

// ============================================================================
// LIST HOOKS
// ============================================================================

/**
 * Fetches portal orders for the current portal identity.
 */
export function usePortalOrders(options: UsePortalListOptions = {}) {
  const { page = 1, pageSize = 10, enabled = true } = options;
  const params: PortalListParams = { page, pageSize };

  return useQuery<PortalOrdersResult>({
    queryKey: queryKeys.portal.orders.list(params),
    queryFn: async () => {
      const result = await listPortalOrders({ data: params });
      if (result == null) throw new Error('Query returned no data');
      return result;
    },
    enabled,
    staleTime: 30 * 1000,
  });
}

/**
 * Fetches portal jobs for the current portal identity.
 */
export function usePortalJobs(options: UsePortalListOptions = {}) {
  const { page = 1, pageSize = 10, enabled = true } = options;
  const params: PortalListParams = { page, pageSize };

  return useQuery<PortalJobsResult>({
    queryKey: queryKeys.portal.jobs.list(params),
    queryFn: async () => {
      const result = await listPortalJobs({ data: params });
      if (result == null) throw new Error('Query returned no data');
      return result;
    },
    enabled,
    staleTime: 30 * 1000,
  });
}

/**
 * Fetches portal quotes for the current portal identity.
 */
export function usePortalQuotes(options: UsePortalListOptions = {}) {
  const { page = 1, pageSize = 10, enabled = true } = options;
  const params: PortalListParams = { page, pageSize };

  return useQuery<PortalQuotesResult>({
    queryKey: queryKeys.portal.quotes.list(params),
    queryFn: async () => {
      const result = await listPortalQuotes({ data: params });
      if (result == null) throw new Error('Query returned no data');
      return result;
    },
    enabled,
    staleTime: 30 * 1000,
  });
}
