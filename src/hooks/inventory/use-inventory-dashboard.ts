/**
 * Inventory Dashboard Read Hook
 *
 * Provides dashboard metrics and top movers for inventory visibility surfaces.
 */
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import { resolveReadResult } from '@/lib/read-path-policy';
import { getInventoryDashboard } from '@/server/functions/inventory/dashboard';

/**
 * Fetch inventory dashboard metrics and top movers.
 */
export function useInventoryDashboard(enabled = true) {
  return useQuery({
    queryKey: queryKeys.inventory.dashboard(),
    queryFn: () =>
      resolveReadResult(() => getInventoryDashboard(), {
        message: 'Inventory dashboard returned no data',
        contractType: 'always-shaped',
        fallbackMessage:
          'Inventory dashboard metrics are temporarily unavailable. Please refresh and try again.',
      }),
    enabled,
    staleTime: 30 * 1000,
    refetchInterval: 30 * 1000,
  });
}
