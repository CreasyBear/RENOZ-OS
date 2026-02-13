/**
 * My Activity Hooks
 *
 * TanStack Query hooks for the current user's activity/audit logs.
 * Used in security settings to show recent security events.
 *
 * @see src/server/functions/_shared/audit-logs.ts for server functions
 */

import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import { getMyActivity } from '@/server/functions/_shared/audit-logs';

/**
 * Filter options for my activity query.
 */
export interface MyActivityFilters {
  page?: number;
  pageSize?: number;
}

/**
 * Hook to fetch current user's own activity/audit logs.
 *
 * @param filters - Pagination options
 *
 * @example
 * const { data, isLoading } = useMyActivity({ page: 1, pageSize: 10 });
 * const securityEvents = data?.items ?? [];
 */
export function useMyActivity(filters: MyActivityFilters = {}) {
  const { page = 1, pageSize = 10 } = filters;

  return useQuery({
    queryKey: queryKeys.users.myActivity.list({ page, pageSize }),
    queryFn: async () => {
      const result = await getMyActivity({
        data: { page, pageSize } 
      });
      if (result == null) throw new Error('Query returned no data');
      return result;
    },
    staleTime: 30 * 1000, // 30 seconds
  });
}
