/**
 * Inventory Hooks
 *
 * TanStack Query hooks for inventory management:
 * - Inventory list with pagination and filtering
 * - Inventory item details
 * - Inventory movements history
 * - Stock adjustments with optimistic updates
 * - Stock transfers are exported from a dedicated transfer hook
 * - Stock receiving is exported from a dedicated receive hook
 *
 * @see _Initiation/_prd/2-domains/inventory/inventory.prd.json
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import {
  resolveReadResult,
} from '@/lib/read-path-policy';
import { toast } from '../_shared/use-toast';
import { formatInventoryMutationError } from './_mutation-errors';
import { invalidateInventoryStockMutationQueries } from './_stock-mutation-cache';
import {
  listInventory,
  getInventoryItem,
  quickSearchInventory,
  bulkUpdateStatus,
} from '@/server/functions/inventory/inventory';
import { adjustInventory } from '@/server/functions/inventory/adjustments';
import { getInventoryDashboard } from '@/server/functions/inventory/dashboard';
import { listMovements } from '@/server/functions/inventory/movements';
import { getAvailableSerials } from '@/server/functions/inventory/serial-availability';
import { getLocationUtilization } from '@/server/functions/inventory/locations';
import type {
  InventoryListQuery,
  Inventory,
  MovementListQuery,
  StockAdjustment,
} from '@/lib/schemas/inventory';

export { useReceiveInventory } from './use-receive-inventory';
export { useTransferInventory } from './use-transfer-inventory';

// ============================================================================
// LIST HOOKS
// ============================================================================

export interface UseInventoryListOptions extends Partial<InventoryListQuery> {
  enabled?: boolean;
}

type InventoryListResult = Awaited<ReturnType<typeof listInventory>>;
type InventoryDetailResult = Awaited<ReturnType<typeof getInventoryItem>>;

export interface BulkUpdateInventoryStatusInput {
  inventoryIds: string[];
  status: Inventory['status'];
  reason: string;
}

/**
 * Fetch inventory list with pagination and filtering
 */
export function useInventory(options: UseInventoryListOptions = {}) {
  const { enabled = true, ...filters } = options;

  return useQuery({
    queryKey: queryKeys.inventory.list(filters),
    queryFn: () =>
      resolveReadResult(() => listInventory({ data: filters }), {
        message: 'Inventory list returned no data',
        contractType: 'always-shaped',
        fallbackMessage: 'Inventory is temporarily unavailable. Please refresh and try again.',
      }),
    enabled,
    staleTime: 30 * 1000, // 30 seconds
  });
}

/**
 * Quick search inventory items by product name, SKU, lot, or serial number.
 * Optimized for autocomplete/typeahead use cases.
 */
export function useInventorySearch(
  query: string,
  options: { limit?: number } = {},
  enabled = true
) {
  return useQuery({
    queryKey: queryKeys.inventory.search(query, options),
    queryFn: () =>
      resolveReadResult(
        () => quickSearchInventory({ data: { q: query, limit: options.limit ?? 10 } }),
        {
          message: 'Inventory search returned no data',
          contractType: 'always-shaped',
          fallbackMessage:
            'Inventory search is temporarily unavailable. Please refresh and try again.',
        }
      ),
    enabled: enabled && query.length >= 2,
    staleTime: 30 * 1000,
  });
}

/**
 * Fetch inventory item details
 */
export function useInventoryItem(inventoryId: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.inventory.detail(inventoryId),
    queryFn: () =>
      resolveReadResult(() => getInventoryItem({ data: { id: inventoryId } }), {
        message: 'Inventory item not found',
        contractType: 'detail-not-found',
        fallbackMessage:
          'Inventory item details are temporarily unavailable. Please refresh and try again.',
        notFoundMessage: 'The requested inventory item could not be found.',
      }),
    enabled: enabled && !!inventoryId,
    staleTime: 60 * 1000, // 1 minute
  });
}

/**
 * Fetch inventory movements for an item
 */
export function useInventoryMovements(inventoryId: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.inventory.movements({ inventoryId, page: 1, pageSize: 50 }),
    queryFn: () =>
      resolveReadResult(
        () =>
          listMovements({
            data: { inventoryId, page: 1, pageSize: 50, sortOrder: 'desc' } satisfies MovementListQuery,
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
 * Fetch low stock inventory items
 */
export function useInventoryLowStock(enabled = true) {
  return useQuery({
    queryKey: queryKeys.inventory.lowStock(),
    queryFn: () =>
      resolveReadResult(
        () =>
          listInventory({
            data: { lowStock: true, page: 1, pageSize: 100 },
          }),
        {
          message: 'Low stock inventory returned no data',
          contractType: 'always-shaped',
          fallbackMessage:
            'Low-stock inventory is temporarily unavailable. Please refresh and try again.',
        }
      ),
    enabled,
    staleTime: 60 * 1000, // 1 minute
  });
}

// ============================================================================
// MUTATION HOOKS
// ============================================================================

/**
 * Adjust inventory stock levels
 */
export function useAdjustInventory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: StockAdjustment) => adjustInventory({ data: params }),
    onMutate: async (_variables) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.inventory.lists() });
      await queryClient.cancelQueries({ queryKey: queryKeys.inventory.details() });

      const previousLists = queryClient.getQueriesData<InventoryListResult>({
        queryKey: queryKeys.inventory.lists(),
      });
      const previousDetails = queryClient.getQueriesData<InventoryDetailResult>({
        queryKey: queryKeys.inventory.details(),
      });

      // Adjustment writes are row-scoped or single-row product/location scoped
      // on the server. Let refetch reconcile exact rows instead of patching
      // aggregates across lots, dispositions, or serialized units.
      return { previousLists, previousDetails };
    },
    onError: (error, _variables, context) => {
      if (!context) return;
      context.previousLists.forEach(([key, data]) => {
        queryClient.setQueryData(key, data);
      });
      context.previousDetails.forEach(([key, data]) => {
        queryClient.setQueryData(key, data);
      });
      toast.error(formatInventoryMutationError(error, 'Failed to adjust inventory'));
    },
    onSuccess: (data, variables) => {
      toast.success('Inventory adjusted successfully');

      invalidateInventoryStockMutationQueries(queryClient, {
        productId: variables.productId,
        result: data,
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.inventory.movementsAll() });
    },
  });
}

/**
 * Fetch inventory movements with filtering (general query, not tied to specific inventory item)
 */
export function useMovements(
  filters: Partial<MovementListQuery> & { page?: number; pageSize?: number; sortOrder?: 'asc' | 'desc' } = {},
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
 * Fetch inventory movements with auto-refresh for dashboard
 */
export function useMovementsDashboard(
  filters: Partial<MovementListQuery> & { page?: number; pageSize?: number; sortOrder?: 'asc' | 'desc' } = {},
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

/**
 * Bulk update inventory disposition status.
 *
 * This path does not optimistically patch status. Status changes can affect
 * serialized lineage, available serials, movements, and product stock summaries,
 * so the cache contract is refetch-first after the server transaction commits.
 */
export function useBulkUpdateInventoryStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: BulkUpdateInventoryStatusInput) => bulkUpdateStatus({ data: params }),
    onSuccess: (data, variables) => {
      const updatedCount = data.updatedCount ?? variables.inventoryIds.length;
      toast.success(
        updatedCount === 1
          ? 'Inventory status updated'
          : `${updatedCount} inventory statuses updated`
      );

      invalidateInventoryStockMutationQueries(queryClient, {
        result: data,
        includeMovements: true,
      });
    },
    onError: (error) => {
      toast.error(
        formatInventoryMutationError(error, 'Unable to update inventory statuses', {
          codeMessages: {
            allocated_inventory_status_change:
              'Release allocations before changing inventory status.',
            workflow_owned_inventory_status:
              'Use allocation or fulfillment workflows for allocated or sold inventory.',
          },
        })
      );
    },
  });
}

// ============================================================================
// DASHBOARD HOOKS
// ============================================================================

/**
 * Fetch inventory dashboard metrics and top movers.
 */
export function useInventoryDashboard(enabled = true) {
  return useQuery({
    queryKey: queryKeys.inventory.dashboard(),
    queryFn: async () => {
      return resolveReadResult(async () => {
        return getInventoryDashboard();
      }, {
        message: 'Inventory dashboard returned no data',
        contractType: 'always-shaped',
        fallbackMessage:
          'Inventory dashboard metrics are temporarily unavailable. Please refresh and try again.',
      });
    },
    enabled,
    staleTime: 30 * 1000,
    refetchInterval: 30 * 1000, // Auto-refresh every 30 seconds
  });
}

/**
 * Fetch location utilization data
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
    refetchInterval: 60 * 1000, // Auto-refresh every 60 seconds
  });
}

// ============================================================================
// SERIAL NUMBER HOOKS
// ============================================================================

export interface UseAvailableSerialsOptions {
  productId: string;
  locationId?: string;
  enabled?: boolean;
}

/**
 * Fetch available serial numbers for a product.
 *
 * Used by the picking workflow to populate serial number selectors
 * for serialized products. Returns serials that are in inventory
 * and not already allocated to another order.
 */
export function useAvailableSerials(options: UseAvailableSerialsOptions) {
  const { productId, locationId, enabled = true } = options;

  return useQuery({
    queryKey: queryKeys.inventory.availableSerials(productId, locationId),
    queryFn: () =>
      resolveReadResult(() => getAvailableSerials({ data: { productId, locationId } }), {
        message: 'Available serials returned no data',
        contractType: 'always-shaped',
        fallbackMessage:
          'Available serials are temporarily unavailable. Please refresh and try again.',
      }),
    enabled: enabled && !!productId,
    staleTime: 10 * 1000, // 10 seconds - serials can change frequently during picking
  });
}
