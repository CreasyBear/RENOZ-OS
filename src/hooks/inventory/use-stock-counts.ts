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

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null;
}

function getErrorCode(error: unknown): string | null {
  const candidates = [
    (error as { errors?: { code?: string[] } })?.errors?.code?.[0],
    (error as { data?: { errors?: { code?: string[] } } })?.data?.errors?.code?.[0],
    (error as { cause?: { errors?: { code?: string[] } } })?.cause?.errors?.code?.[0],
  ];
  return candidates.find((value): value is string => typeof value === 'string') ?? null;
}

function getFieldError(error: unknown): string | null {
  const buckets = [
    (error as { errors?: Record<string, unknown> })?.errors,
    (error as { data?: { errors?: Record<string, unknown> } })?.data?.errors,
    (error as { cause?: { errors?: Record<string, unknown> } })?.cause?.errors,
  ];
  for (const bucket of buckets) {
    if (!isRecord(bucket)) continue;
    for (const [field, value] of Object.entries(bucket)) {
      if (field === 'code') continue;
      if (Array.isArray(value)) {
        const first = value.find((entry) => typeof entry === 'string');
        if (typeof first === 'string' && first.trim().length > 0) return first;
      }
      if (typeof value === 'string' && value.trim().length > 0) return value;
    }
  }
  return null;
}

function mapStockCountError(error: Error): string {
  const code = getErrorCode(error);
  const fieldError = getFieldError(error);

  if (code === 'insufficient_cost_layers') {
    return fieldError ?? 'Count cannot complete because some rows have missing cost layers.';
  }
  if (code === 'serialized_unit_violation') {
    return fieldError ?? 'Count cannot complete because serialized unit bounds were violated.';
  }

  return (fieldError ?? error.message) || 'Failed to complete stock count';
}

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
      const valuationDelta =
        (result.financeMetadata?.valuationAfter ?? 0) -
        (result.financeMetadata?.valuationBefore ?? 0);
      const hasFiniteDelta = Number.isFinite(valuationDelta);
      const valueDeltaSuffix = hasFiniteDelta
        ? `, value delta ${valuationDelta >= 0 ? '+' : ''}$${valuationDelta.toFixed(2)}`
        : '';
      toast.success('Stock count completed', {
        description:
          result.adjustments.length > 0
            ? `${result.adjustments.length} adjustments applied${valueDeltaSuffix}`
            : 'No adjustments required',
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.inventory.stockCountsAll() });
      queryClient.invalidateQueries({ queryKey: queryKeys.inventory.stockCount(variables.id) });
      // Also invalidate inventory lists since quantities may have changed
      queryClient.invalidateQueries({ queryKey: queryKeys.inventory.lists() });
    },
    onError: (error: Error) => {
      toast.error(mapStockCountError(error));
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
