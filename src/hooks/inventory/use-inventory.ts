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
import { toast } from '../_shared/use-toast';
import {
  listInventory,
  getInventoryItem,
  adjustInventory,
  transferInventory,
  receiveInventory,
  listMovements,
  getInventoryDashboard,
  quickSearchInventory,
  getAvailableSerials,
} from '@/server/functions/inventory/inventory';
import { getLocationUtilization } from '@/server/functions/inventory/locations';
import type {
  InventoryListQuery,
  MovementListQuery,
  StockAdjustment,
  StockTransfer,
} from '@/lib/schemas/inventory';

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null;
}

function getValueAtPath(source: unknown, path: string[]): unknown {
  let cursor: unknown = source;
  for (const segment of path) {
    if (!isRecord(cursor)) return undefined;
    cursor = cursor[segment];
  }
  return cursor;
}

function extractFirstString(value: unknown): string | null {
  if (typeof value === 'string' && value.trim().length > 0) return value;
  if (Array.isArray(value)) {
    for (const entry of value) {
      if (typeof entry === 'string' && entry.trim().length > 0) {
        return entry;
      }
    }
  }
  return null;
}

function extractValidationCode(error: unknown): string | null {
  const codePaths = [
    ['errors', 'code'],
    ['data', 'errors', 'code'],
    ['cause', 'errors', 'code'],
    ['cause', 'data', 'errors', 'code'],
    ['response', 'data', 'errors', 'code'],
  ];

  for (const path of codePaths) {
    const code = extractFirstString(getValueAtPath(error, path));
    if (code) return code;
  }
  return null;
}

function extractFieldErrorMessage(error: unknown): string | null {
  const errorPaths = [
    ['errors'],
    ['data', 'errors'],
    ['cause', 'errors'],
    ['cause', 'data', 'errors'],
    ['response', 'data', 'errors'],
  ];

  for (const path of errorPaths) {
    const fieldErrors = getValueAtPath(error, path);
    if (!isRecord(fieldErrors)) continue;
    for (const [field, messages] of Object.entries(fieldErrors)) {
      if (field === 'code') continue;
      const first = extractFirstString(messages);
      if (first) return first;
    }
  }
  return null;
}

function formatInventoryMutationError(error: unknown, fallback: string): string {
  const code = extractValidationCode(error);
  const fieldMessage = extractFieldErrorMessage(error);
  const errorMessage =
    error instanceof Error && error.message.trim().length > 0 ? error.message : null;

  if (code === 'insufficient_cost_layers') {
    return fieldMessage ?? 'Cost layers are incomplete for this item. Reconcile layers and retry.';
  }
  if (code === 'layer_transfer_mismatch') {
    return fieldMessage ?? 'Cost-layer transfer mismatch detected. Refresh and retry.';
  }
  if (code === 'serialized_unit_violation') {
    return fieldMessage ?? 'Serialized item integrity failed (unit must remain 0 or 1). Refresh and retry.';
  }
  if (code === 'inventory_value_drift_detected') {
    return fieldMessage ?? 'Inventory valuation drift detected. Reconcile valuation and retry.';
  }
  if (code === 'landed_cost_allocation_conflict') {
    return fieldMessage ?? 'Landed-cost allocation conflict detected. Review receipt costs and retry.';
  }

  return fieldMessage ?? errorMessage ?? fallback;
}

// ============================================================================
// LIST HOOKS
// ============================================================================

export interface UseInventoryListOptions extends Partial<InventoryListQuery> {
  enabled?: boolean;
}

type InventoryListResult = Awaited<ReturnType<typeof listInventory>>;
type InventoryDetailResult = Awaited<ReturnType<typeof getInventoryItem>>;

interface ReceiveInventoryInput {
  productId: string;
  quantity: number;
  unitCost: number;
  locationId: string;
  serialNumber?: string;
  batchNumber?: string;
  lotNumber?: string;
  expiryDate?: string;
  referenceId?: string;
  referenceType?: string;
  notes?: string;
}

/**
 * Fetch inventory list with pagination and filtering
 */
export function useInventory(options: UseInventoryListOptions = {}) {
  const { enabled = true, ...filters } = options;

  return useQuery({
    queryKey: queryKeys.inventory.list(filters),
    queryFn: async () => {
      const result = await listInventory({ data: filters });
      if (result == null) throw new Error('Inventory list returned no data');
      return result;
    },
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
    queryFn: async () => {
      const result = await quickSearchInventory({ data: { q: query, limit: options.limit ?? 10 } });
      if (result == null) throw new Error('Inventory search returned no data');
      return result;
    },
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
    queryFn: async () => {
      const result = await getInventoryItem({ data: { id: inventoryId } });
      if (result == null) throw new Error('Inventory item not found');
      return result;
    },
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
    queryFn: async () => {
      const result = await listMovements({
        data: { inventoryId, page: 1, pageSize: 50, sortOrder: 'desc' } satisfies MovementListQuery,
      });
      if (result == null) throw new Error('Inventory movements returned no data');
      return result;
    },
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
    queryFn: async () => {
      const result = await listInventory({
        data: { lowStock: true, page: 1, pageSize: 100 },
      });
      if (result == null) throw new Error('Low stock inventory returned no data');
      return result;
    },
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
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.inventory.lists() });
      await queryClient.cancelQueries({ queryKey: queryKeys.inventory.details() });

      const previousLists = queryClient.getQueriesData<InventoryListResult>({
        queryKey: queryKeys.inventory.lists(),
      });
      const previousDetails = queryClient.getQueriesData<InventoryDetailResult>({
        queryKey: queryKeys.inventory.details(),
      });

      // Row-scoped adjustments (inventoryId present) can target serialized rows.
      // Skip aggregate optimistic math and let refetch reconcile exact rows.
      if (variables.inventoryId) {
        return { previousLists, previousDetails };
      }

      queryClient.setQueriesData<InventoryListResult>(
        { queryKey: queryKeys.inventory.lists() },
        (old) => {
          if (!old) return old;
          const items = old.items.map((item) => {
            if (
              item.productId !== variables.productId ||
              item.locationId !== variables.locationId
            ) {
              return item;
            }
            const quantityOnHand = (item.quantityOnHand ?? 0) + variables.adjustmentQty;
            const quantityAvailable = (item.quantityAvailable ?? 0) + variables.adjustmentQty;
            const totalValue =
              item.unitCost !== null && item.unitCost !== undefined
                ? quantityOnHand * Number(item.unitCost)
                : item.totalValue;
            return {
              ...item,
              quantityOnHand,
              quantityAvailable,
              totalValue,
            };
          });
          return { ...old, items };
        }
      );

      queryClient.setQueriesData<InventoryDetailResult>(
        { queryKey: queryKeys.inventory.details() },
        (old) => {
          if (!old?.item) return old;
          if (
            old.item.productId !== variables.productId ||
            old.item.locationId !== variables.locationId
          ) {
            return old;
          }
          const quantityOnHand = (old.item.quantityOnHand ?? 0) + variables.adjustmentQty;
          const quantityAvailable = (old.item.quantityAvailable ?? 0) + variables.adjustmentQty;
          const totalValue =
            old.item.unitCost !== null && old.item.unitCost !== undefined
              ? quantityOnHand * Number(old.item.unitCost)
              : old.item.totalValue;
          return {
            ...old,
            item: {
              ...old.item,
              quantityOnHand,
              quantityAvailable,
              totalValue,
            },
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
      toast.error(formatInventoryMutationError(error, 'Failed to adjust inventory'));
    },
    onSuccess: () => {
      toast.success('Inventory adjusted successfully');

      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: queryKeys.inventory.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.inventory.details() });
      queryClient.invalidateQueries({ queryKey: queryKeys.inventory.lowStock() });
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

      // Serialized transfers mutate per-serial rows and are not safely represented
      // by aggregate optimistic math. Let refetch reconcile authoritative state.
      if ((variables.serialNumbers?.length ?? 0) > 0) {
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
    onSuccess: () => {
      toast.success('Inventory transferred successfully');

      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: queryKeys.inventory.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.inventory.details() });
      queryClient.invalidateQueries({ queryKey: queryKeys.inventory.lowStock() });
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
    queryFn: async () => {
      const result = await listMovements({ data: queryFilters });
      if (result == null) throw new Error('Inventory movements returned no data');
      return result;
    },
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
    queryFn: async () => {
      const result = await listMovements({ data: queryFilters });
      if (result == null) throw new Error('Inventory movements returned no data');
      return result;
    },
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
            if (
              item.productId !== variables.productId ||
              item.locationId !== variables.locationId
            ) {
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
          if (
            old.item.productId !== variables.productId ||
            old.item.locationId !== variables.locationId
          ) {
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
    onError: (_error, _variables, context) => {
      if (!context) return;
      context.previousLists.forEach(([key, data]) => {
        queryClient.setQueryData(key, data);
      });
      context.previousDetails.forEach(([key, data]) => {
        queryClient.setQueryData(key, data);
      });
      toast.error('Failed to receive inventory');
    },
    onSuccess: () => {
      toast.success('Inventory received successfully');

      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: queryKeys.inventory.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.inventory.details() });
      queryClient.invalidateQueries({ queryKey: queryKeys.inventory.lowStock() });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.inventory.movementsAll() });
    },
  });
}

// ============================================================================
// DASHBOARD HOOKS
// ============================================================================

/**
 * Fetch inventory dashboard metrics and top movers
 */
/**
 * Fetch inventory dashboard metrics and top movers.
 *
 * Uses direct server function call (no useServerFn) per backup pattern -
 * matches working implementation from renoz-v3 6.
 * Throws on undefined to satisfy React Query (queryFn must not return undefined).
 */
export function useInventoryDashboard(enabled = true) {
  return useQuery({
    queryKey: queryKeys.inventory.dashboard(),
    queryFn: async () => {
      const result = await getInventoryDashboard();
      if (result == null) throw new Error('Inventory dashboard returned no data');
      return result;
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
    queryFn: async () => {
      const result = await getLocationUtilization({});
      if (result == null) throw new Error('Location utilization returned no data');
      return result;
    },
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
    queryFn: async () => {
      const result = await getAvailableSerials({ data: { productId, locationId } });
      if (result == null) throw new Error('Available serials returned no data');
      return result;
    },
    enabled: enabled && !!productId,
    staleTime: 10 * 1000, // 10 seconds - serials can change frequently during picking
  });
}
