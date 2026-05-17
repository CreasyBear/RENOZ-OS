/**
 * Inventory Hooks
 *
 * TanStack Query hooks for inventory management:
 * - Inventory list with pagination and filtering
 * - Inventory item details
 * - Inventory movements history is exported from a dedicated movement hook
 * - Stock adjustments are exported from a dedicated adjustment hook
 * - Bulk status updates are exported from a dedicated status hook
 * - Stock transfers are exported from a dedicated transfer hook
 * - Stock receiving is exported from a dedicated receive hook
 *
 * @see _Initiation/_prd/2-domains/inventory/inventory.prd.json
 */
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import {
  resolveReadResult,
} from '@/lib/read-path-policy';
import {
  listInventory,
  getInventoryItem,
  quickSearchInventory,
} from '@/server/functions/inventory/inventory';
import { getInventoryDashboard } from '@/server/functions/inventory/dashboard';
import { getAvailableSerials } from '@/server/functions/inventory/serial-availability';
import { getLocationUtilization } from '@/server/functions/inventory/locations';
import type { InventoryListQuery } from '@/lib/schemas/inventory';

export { useAdjustInventory } from './use-adjust-inventory';
export {
  useBulkUpdateInventoryStatus,
  type BulkUpdateInventoryStatusInput,
} from './use-bulk-update-inventory-status';
export { useReceiveInventory } from './use-receive-inventory';
export { useTransferInventory } from './use-transfer-inventory';
export {
  useInventoryMovements,
  useMovements,
  useMovementsDashboard,
} from './use-inventory-movements';

// ============================================================================
// LIST HOOKS
// ============================================================================

export interface UseInventoryListOptions extends Partial<InventoryListQuery> {
  enabled?: boolean;
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
