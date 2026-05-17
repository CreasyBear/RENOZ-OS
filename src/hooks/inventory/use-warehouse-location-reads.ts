/**
 * Warehouse Location Read Hooks
 *
 * Owns focused warehouse location hierarchy and detail read contracts.
 */
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import {
  getWarehouseLocationHierarchy,
  getLocation as getLocationDetail,
} from '@/server/functions/inventory/locations';

/**
 * Fetch warehouse location hierarchy.
 */
export function useLocationHierarchy(rootId?: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.locations.hierarchy(rootId),
    queryFn: async () => {
      const data = await getWarehouseLocationHierarchy({ data: { id: rootId } });
      return data?.hierarchy ?? [];
    },
    enabled,
    staleTime: 60 * 1000,
  });
}

/**
 * Fetch location detail with contents.
 */
export function useLocationDetail(locationId: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.locations.detail(locationId),
    queryFn: async () => {
      const data = await getLocationDetail({ data: { id: locationId } });
      return data ?? null;
    },
    enabled: enabled && !!locationId,
    staleTime: 30 * 1000,
  });
}
