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
} from '@/server/functions/inventory/inventory';
import { getLocationUtilization } from '@/server/functions/inventory/locations';
import type {
  InventoryListQuery,
  MovementListQuery,
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
    queryFn: () => listInventory({ data: filters }),
    enabled,
    staleTime: 30 * 1000, // 30 seconds
  });
}

/**
 * Fetch inventory item details
 */
export function useInventoryItem(inventoryId: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.inventory.detail(inventoryId),
    queryFn: () => getInventoryItem({ data: { id: inventoryId } }),
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
      listMovements({
        data: { inventoryId, page: 1, pageSize: 50, sortOrder: 'desc' } satisfies MovementListQuery,
      }),
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
      listInventory({
        data: {
          lowStock: true,
          page: 1,
          pageSize: 100,
        },
      }),
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
    onError: (_error, _variables, context) => {
      if (!context) return;
      context.previousLists.forEach(([key, data]) => {
        queryClient.setQueryData(key, data);
      });
      context.previousDetails.forEach(([key, data]) => {
        queryClient.setQueryData(key, data);
      });
      toast.error('Failed to adjust inventory');
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
    onError: (_error, _variables, context) => {
      if (!context) return;
      context.previousLists.forEach(([key, data]) => {
        queryClient.setQueryData(key, data);
      });
      context.previousDetails.forEach(([key, data]) => {
        queryClient.setQueryData(key, data);
      });
      toast.error('Failed to transfer inventory');
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
    queryFn: () => listMovements({ data: queryFilters }),
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
    queryFn: () => listMovements({ data: queryFilters }),
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
export function useInventoryDashboard(enabled = true) {
  return useQuery({
    queryKey: queryKeys.inventory.dashboard(),
    queryFn: () => getInventoryDashboard(),
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
    queryFn: () => getLocationUtilization({}),
    enabled,
    staleTime: 60 * 1000,
    refetchInterval: 60 * 1000, // Auto-refresh every 60 seconds
  });
}
