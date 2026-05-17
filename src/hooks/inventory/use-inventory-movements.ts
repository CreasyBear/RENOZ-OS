/**
 * Inventory Movement Read Hooks
 *
 * Movement history is the audit trail for inventory receiving, adjustment,
 * transfer, status, count, fulfillment, and RMA activity.
 */
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import { resolveReadResult } from '@/lib/read-path-policy';
import { listMovements } from '@/server/functions/inventory/movements';
import type { MovementListQuery } from '@/lib/schemas/inventory';

/**
 * Fetch inventory movements for an item.
 */
export function useInventoryMovements(inventoryId: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.inventory.movements({ inventoryId, page: 1, pageSize: 50 }),
    queryFn: () =>
      resolveReadResult(
        () =>
          listMovements({
            data: {
              inventoryId,
              page: 1,
              pageSize: 50,
              sortOrder: 'desc',
            } satisfies MovementListQuery,
          }),
        {
          message: 'Inventory movements returned no data',
          contractType: 'always-shaped',
          fallbackMessage:
            'Inventory movements are temporarily unavailable. Please refresh and try again.',
        }
      ),
    enabled: enabled && !!inventoryId,
    staleTime: 30 * 1000,
  });
}

/**
 * Fetch inventory movements with filtering.
 */
export function useMovements(
  filters: Partial<MovementListQuery> & {
    page?: number;
    pageSize?: number;
    sortOrder?: 'asc' | 'desc';
  } = {},
  enabled = true
) {
  const queryFilters: MovementListQuery = {
    page: filters.page ?? 1,
    pageSize: filters.pageSize ?? 50,
    sortOrder: filters.sortOrder ?? 'desc',
    ...filters,
  };

  return useQuery({
    queryKey: queryKeys.inventory.movements(queryFilters),
    queryFn: () =>
      resolveReadResult(() => listMovements({ data: queryFilters }), {
        message: 'Inventory movements returned no data',
        contractType: 'always-shaped',
        fallbackMessage:
          'Inventory movements are temporarily unavailable. Please refresh and try again.',
      }),
    enabled,
    staleTime: 30 * 1000,
  });
}

/**
 * Fetch inventory movements with auto-refresh for dashboard surfaces.
 */
export function useMovementsDashboard(
  filters: Partial<MovementListQuery> & {
    page?: number;
    pageSize?: number;
    sortOrder?: 'asc' | 'desc';
  } = {},
  enabled = true
) {
  const queryFilters: MovementListQuery = {
    page: filters.page ?? 1,
    pageSize: filters.pageSize ?? 50,
    sortOrder: filters.sortOrder ?? 'desc',
    ...filters,
  };

  return useQuery({
    queryKey: queryKeys.inventory.movements({ ...queryFilters, dashboard: true }),
    queryFn: () =>
      resolveReadResult(() => listMovements({ data: queryFilters }), {
        message: 'Inventory dashboard movements returned no data',
        contractType: 'always-shaped',
        fallbackMessage:
          'Inventory dashboard movements are temporarily unavailable. Please refresh and try again.',
      }),
    enabled,
    staleTime: 15 * 1000,
    refetchInterval: 30 * 1000,
  });
}
