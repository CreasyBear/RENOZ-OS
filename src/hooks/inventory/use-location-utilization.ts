/**
 * Location Utilization Read Hook
 *
 * Provides warehouse capacity and stock-utilization visibility.
 */
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import { resolveReadResult } from '@/lib/read-path-policy';
import { getLocationUtilization } from '@/server/functions/inventory/locations';

/**
 * Fetch location utilization data.
 */
export function useLocationUtilization(enabled = true) {
  return useQuery({
    queryKey: queryKeys.locations.utilization(),
    queryFn: () =>
      resolveReadResult(() => getLocationUtilization({}), {
        message: 'Location utilization returned no data',
        contractType: 'always-shaped',
        fallbackMessage:
          'Location utilization is temporarily unavailable. Please refresh and try again.',
      }),
    enabled,
    staleTime: 60 * 1000,
    refetchInterval: 60 * 1000,
  });
}
