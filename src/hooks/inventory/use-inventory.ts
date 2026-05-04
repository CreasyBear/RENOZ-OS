/**
 * Inventory Hooks
 *
 * TanStack Query hooks for inventory management:
 * - Inventory list with pagination and filtering
 * - Inventory item details
 * - Inventory movements history
 * - Stock adjustments with optimistic updates
 * - Stock transfers with optimistic updates
 * - Stock receiving with optimistic updates
 *
 * @see _Initiation/_prd/2-domains/inventory/inventory.prd.json
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import { normalizeSerial } from '@/lib/serials';
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
} from '@/server/functions/inventory/inventory';
import { adjustInventory } from '@/server/functions/inventory/adjustments';
import { getInventoryDashboard } from '@/server/functions/inventory/dashboard';
import { listMovements } from '@/server/functions/inventory/movements';
import { receiveInventory } from '@/server/functions/inventory/receiving';
import { getAvailableSerials } from '@/server/functions/inventory/serial-availability';
import { transferInventory } from '@/server/functions/inventory/transfers';
import { getLocationUtilization } from '@/server/functions/inventory/locations';
import type {
  InventoryListQuery,
  MovementListQuery,
  ReceiveInventoryInput,
  StockAdjustment,
  StockTransfer,
} from '@/lib/schemas/inventory';

// ============================================================================
// LIST HOOKS
// ============================================================================

export interface UseInventoryListOptions extends Partial<InventoryListQuery> {
  enabled?: boolean;
}

type InventoryListResult = Awaited<ReturnType<typeof listInventory>>;
type InventoryDetailResult = Awaited<ReturnType<typeof getInventoryItem>>;

interface ReceivePatchCandidate {
  productId: string;
  locationId: string;
  lotNumber?: string | null;
  serialNumber?: string | null;
}

function normalizeReceiveScopeValue(value?: string | null): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function normalizeReceiveScopeSerial(value?: string | null): string | null {
  const normalized = normalizeReceiveScopeValue(value);
  return normalized ? normalizeSerial(normalized) : null;
}

function matchesReceiveInventoryScope(
  item: ReceivePatchCandidate,
  variables: ReceiveInventoryInput
): boolean {
  if (
    item.productId !== variables.productId ||
    item.locationId !== variables.locationId
  ) {
    return false;
  }

  const itemSerial = normalizeReceiveScopeSerial(item.serialNumber);
  const receiveSerial = normalizeReceiveScopeSerial(variables.serialNumber);
  if (itemSerial !== receiveSerial) {
    return false;
  }

  const itemLot = normalizeReceiveScopeValue(item.lotNumber);
  const receiveLot = normalizeReceiveScopeValue(variables.lotNumber);
  return itemLot === receiveLot;
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

      // Adjustment writes are row-scoped on the server. Product/location-only
      // payloads still mutate one locked row, so aggregate optimistic math can
      // overpatch sibling lot/serial rows. Let refetch reconcile exact rows.
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
 * Transfer inventory between locations
 */
export function useTransferInventory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: StockTransfer) => transferInventory({ data: params }),
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.inventory.lists() });
      await queryClient.cancelQueries({ queryKey: queryKeys.inventory.details() });

      const previousLists = queryClient.getQueriesData<InventoryListResult>({
        queryKey: queryKeys.inventory.lists(),
      });
      const previousDetails = queryClient.getQueriesData<InventoryDetailResult>({
        queryKey: queryKeys.inventory.details(),
      });

      // Row/serial-scoped transfers are not safely represented by aggregate
      // product/location optimistic math. Let refetch reconcile exact rows.
      if (variables.inventoryId || (variables.serialNumbers?.length ?? 0) > 0) {
        return { previousLists, previousDetails };
      }

      queryClient.setQueriesData<InventoryListResult>(
        { queryKey: queryKeys.inventory.lists() },
        (old) => {
          if (!old) return old;
          const items = old.items.map((item) => {
            if (item.productId !== variables.productId) return item;
            if (item.locationId === variables.fromLocationId) {
              const quantityOnHand = (item.quantityOnHand ?? 0) - variables.quantity;
              const quantityAvailable = (item.quantityAvailable ?? 0) - variables.quantity;
              const totalValue =
                item.unitCost !== null && item.unitCost !== undefined
                  ? quantityOnHand * Number(item.unitCost)
                  : item.totalValue;
              return { ...item, quantityOnHand, quantityAvailable, totalValue };
            }
            if (item.locationId === variables.toLocationId) {
              const quantityOnHand = (item.quantityOnHand ?? 0) + variables.quantity;
              const quantityAvailable = (item.quantityAvailable ?? 0) + variables.quantity;
              const totalValue =
                item.unitCost !== null && item.unitCost !== undefined
                  ? quantityOnHand * Number(item.unitCost)
                  : item.totalValue;
              return { ...item, quantityOnHand, quantityAvailable, totalValue };
            }
            return item;
          });
          return { ...old, items };
        }
      );

      queryClient.setQueriesData<InventoryDetailResult>(
        { queryKey: queryKeys.inventory.details() },
        (old) => {
          if (!old?.item) return old;
          if (old.item.productId !== variables.productId) return old;
          if (old.item.locationId !== variables.fromLocationId) return old;
          const quantityOnHand = (old.item.quantityOnHand ?? 0) - variables.quantity;
          const quantityAvailable = (old.item.quantityAvailable ?? 0) - variables.quantity;
          const totalValue =
            old.item.unitCost !== null && old.item.unitCost !== undefined
              ? quantityOnHand * Number(old.item.unitCost)
              : old.item.totalValue;
          return {
            ...old,
            item: { ...old.item, quantityOnHand, quantityAvailable, totalValue },
          };
        }
      );

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
      toast.error(formatInventoryMutationError(error, 'Failed to transfer inventory'));
    },
    onSuccess: (data, variables) => {
      toast.success('Inventory transferred successfully');

      invalidateInventoryStockMutationQueries(queryClient, {
        productId: variables.productId,
        result: data,
        touchesSerializedInventory: (variables.serialNumbers?.length ?? 0) > 0,
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.inventory.movementsAll() });
    },
  });
}

/**
 * Receive new inventory stock
 */
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

export function useReceiveInventory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: ReceiveInventoryInput) => receiveInventory({ data: params }),
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.inventory.lists() });
      await queryClient.cancelQueries({ queryKey: queryKeys.inventory.details() });

      const previousLists = queryClient.getQueriesData<InventoryListResult>({
        queryKey: queryKeys.inventory.lists(),
      });
      const previousDetails = queryClient.getQueriesData<InventoryDetailResult>({
        queryKey: queryKeys.inventory.details(),
      });

      queryClient.setQueriesData<InventoryListResult>(
        { queryKey: queryKeys.inventory.lists() },
        (old) => {
          if (!old) return old;
          const items = old.items.map((item) => {
            if (!matchesReceiveInventoryScope(item, variables)) {
              return item;
            }
            const quantityOnHand = (item.quantityOnHand ?? 0) + variables.quantity;
            const quantityAvailable = (item.quantityAvailable ?? 0) + variables.quantity;
            const totalValue =
              item.unitCost !== null && item.unitCost !== undefined
                ? quantityOnHand * Number(item.unitCost)
                : item.totalValue;
            return { ...item, quantityOnHand, quantityAvailable, totalValue };
          });
          return { ...old, items };
        }
      );

      queryClient.setQueriesData<InventoryDetailResult>(
        { queryKey: queryKeys.inventory.details() },
        (old) => {
          if (!old?.item) return old;
          if (!matchesReceiveInventoryScope(old.item, variables)) {
            return old;
          }
          const quantityOnHand = (old.item.quantityOnHand ?? 0) + variables.quantity;
          const quantityAvailable = (old.item.quantityAvailable ?? 0) + variables.quantity;
          const totalValue =
            old.item.unitCost !== null && old.item.unitCost !== undefined
              ? quantityOnHand * Number(old.item.unitCost)
              : old.item.totalValue;
          return {
            ...old,
            item: { ...old.item, quantityOnHand, quantityAvailable, totalValue },
          };
        }
      );

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
      toast.error(formatInventoryMutationError(error, 'Failed to receive inventory'));
    },
    onSuccess: () => {
      toast.success('Inventory received successfully');
    },
    onSettled: (data, _error, variables) => {
      invalidateInventoryStockMutationQueries(queryClient, {
        productId: variables.productId,
        result: data,
        touchesSerializedInventory: Boolean(variables.serialNumber),
        includeMovements: true,
      });
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
