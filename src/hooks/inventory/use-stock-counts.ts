/**
 * Stock Counting Hooks
 *
 * TanStack Query hooks for cycle counting and stock count management:
 * - Stock count CRUD
 * - Count lifecycle (start, update, complete, cancel)
 * - Count item management
 * - Variance analysis
 *
 * @see src/server/functions/inventory/stock-counts.ts
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import { toast } from '../_shared/use-toast';
import {
  listStockCounts,
  getStockCount,
  createStockCount,
  updateStockCount,
  startStockCount,
  updateStockCountItem,
  bulkUpdateCountItems,
  completeStockCount,
  cancelStockCount,
  getCountVarianceAnalysis,
  getCountHistory,
} from '@/server/functions/inventory';
import type { StockCount } from '@/lib/schemas/inventory';

// ============================================================================
// TYPES
// ============================================================================

export interface StockCountFilters {
  status?: 'draft' | 'in_progress' | 'completed' | 'cancelled';
  countType?: 'full' | 'cycle' | 'spot' | 'annual';
  locationId?: string;
  assignedTo?: string;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface UseStockCountsOptions extends StockCountFilters {
  enabled?: boolean;
}

// ============================================================================
// QUERY HOOKS
// ============================================================================

/**
 * Fetch stock counts with filtering
 */
export function useStockCounts(options: UseStockCountsOptions = {}) {
  const { enabled = true, ...filters } = options;

  return useQuery({
    queryKey: queryKeys.inventory.stockCounts(filters),
    queryFn: async () => {
      const result = await listStockCounts({ data: filters });
      if (result == null) throw new Error('Query returned no data');
      return result;
    },
    enabled,
    staleTime: 30 * 1000,
  });
}

/**
 * Fetch single stock count with items and progress
 */
export function useStockCount(countId: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.inventory.stockCount(countId),
    queryFn: async () => {
      const result = await getStockCount({
        data: { id: countId } 
      });
      if (result == null) throw new Error('Query returned no data');
      return result;
    },
    enabled: enabled && !!countId,
    staleTime: 30 * 1000,
    refetchInterval: (query) => {
      // Auto-refresh in-progress counts every 30 seconds
      const data = query.state.data as { count?: Pick<StockCount, 'status'> } | undefined;
      return data?.count?.status === 'in_progress' ? 30 * 1000 : false;
    },
  });
}

/**
 * Fetch stock count items
 */
export function useStockCountItems(countId: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.inventory.stockCountItems(countId),
    queryFn: async () => {
      const result = await getStockCount({ data: { id: countId } });
      return result.count.items;
    },
    enabled: enabled && !!countId,
    staleTime: 15 * 1000,
  });
}

/**
 * Fetch variance analysis for a count
 */
export function useCountVarianceAnalysis(countId: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.inventory.stockCountVariances(countId),
    queryFn: async () => {
      const result = await getCountVarianceAnalysis({
        data: { id: countId } 
      });
      if (result == null) throw new Error('Query returned no data');
      return result;
    },
    enabled: enabled && !!countId,
    staleTime: 60 * 1000,
  });
}

/**
 * Fetch count history for trending
 */
export function useCountHistory(
  options: {
    locationId?: string;
    dateFrom?: Date;
    dateTo?: Date;
    limit?: number;
  } = {},
  enabled = true
) {
  return useQuery({
    queryKey: queryKeys.inventory.stockCountsHistory(options),
    queryFn: async () => {
      const result = await getCountHistory({ data: options });
      if (result == null) throw new Error('Query returned no data');
      return result;
    },
    enabled,
    staleTime: 5 * 60 * 1000,
  });
}

// ============================================================================
// MUTATION HOOKS
// ============================================================================

/**
 * Create a new stock count
 */
export function useCreateStockCount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Parameters<typeof createStockCount>[0]['data']) =>
      createStockCount({ data }),
    onSuccess: () => {
      toast.success('Stock count created');
      queryClient.invalidateQueries({ queryKey: queryKeys.inventory.stockCountsAll() });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create stock count');
    },
  });
}

/**
 * Update a stock count
 */
export function useUpdateStockCount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof updateStockCount>[0]['data']['data'] }) =>
      updateStockCount({ data: { id, data } }),
    onSuccess: (_, variables) => {
      toast.success('Stock count updated');
      queryClient.invalidateQueries({ queryKey: queryKeys.inventory.stockCountsAll() });
      queryClient.invalidateQueries({ queryKey: queryKeys.inventory.stockCount(variables.id) });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update stock count');
    },
  });
}

/**
 * Start a stock count (generate count sheet)
 */
export function useStartStockCount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (countId: string) => startStockCount({ data: { id: countId } }),
    onSuccess: (_, countId) => {
      toast.success('Stock count started');
      queryClient.invalidateQueries({ queryKey: queryKeys.inventory.stockCountsAll() });
      queryClient.invalidateQueries({ queryKey: queryKeys.inventory.stockCount(countId) });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to start stock count');
    },
  });
}

/**
 * Update a count item with counted quantity
 */
export function useUpdateStockCountItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      countId,
      itemId,
      data,
    }: {
      countId: string;
      itemId: string;
      data: Parameters<typeof updateStockCountItem>[0]['data']['data'];
    }) => updateStockCountItem({ data: { countId, itemId, data } }),
    onSuccess: (_, variables) => {
      // Silently update - no toast for individual items
      queryClient.invalidateQueries({ queryKey: queryKeys.inventory.stockCount(variables.countId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.inventory.stockCountItems(variables.countId) });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update count item');
    },
  });
}

/**
 * Bulk update count items (for barcode scanning)
 */
export function useBulkUpdateCountItems() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      countId,
      items,
    }: {
      countId: string;
      items: Array<{ itemId: string; countedQuantity: number; varianceReason?: string }>;
    }) => bulkUpdateCountItems({ data: { countId, items } }),
    onSuccess: (result, variables) => {
      toast.success(`Updated ${result.updatedCount} items`);
      queryClient.invalidateQueries({ queryKey: queryKeys.inventory.stockCount(variables.countId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.inventory.stockCountItems(variables.countId) });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update count items');
    },
  });
}

/**
 * Complete a stock count and apply adjustments
 */
export function useCompleteStockCount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      notes,
      applyAdjustments = true,
    }: {
      id: string;
      notes?: string;
      applyAdjustments?: boolean;
    }) => completeStockCount({ data: { id, notes, applyAdjustments } }),
    onSuccess: (result, variables) => {
      toast.success('Stock count completed', {
        description: `${result.adjustments.length} adjustments applied`,
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.inventory.stockCountsAll() });
      queryClient.invalidateQueries({ queryKey: queryKeys.inventory.stockCount(variables.id) });
      // Also invalidate inventory lists since quantities may have changed
      queryClient.invalidateQueries({ queryKey: queryKeys.inventory.lists() });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to complete stock count');
    },
  });
}

/**
 * Cancel a stock count
 */
export function useCancelStockCount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (countId: string) => cancelStockCount({ data: { id: countId } }),
    onSuccess: (_, countId) => {
      toast.success('Stock count cancelled');
      queryClient.invalidateQueries({ queryKey: queryKeys.inventory.stockCountsAll() });
      queryClient.invalidateQueries({ queryKey: queryKeys.inventory.stockCount(countId) });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to cancel stock count');
    },
  });
}
