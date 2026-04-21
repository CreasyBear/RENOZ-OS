/**
 * Inventory Valuation Hooks
 *
 * TanStack Query hooks for inventory valuation and costing:
 * - Cost layers (FIFO)
 * - Inventory valuation reports
 * - COGS calculation
 * - Aging analysis
 * - Turnover metrics
 *
 * @see src/server/functions/inventory/valuation.ts
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import {
  resolveReadResult,
} from '@/lib/read-path-policy';
import { toast } from '../_shared/use-toast';
import {
  listCostLayers,
  getInventoryCostLayers,
  createCostLayer,
  getInventoryValuation,
  getInventoryFinanceIntegrity,
  reconcileInventoryFinanceIntegrity,
  calculateCOGS,
  getInventoryAging,
  getInventoryTurnover,
} from '@/server/functions/inventory';

// ============================================================================
// TYPES
// ============================================================================

export interface CostLayerFilters {
  inventoryId?: string;
  hasRemaining?: boolean;
  page?: number;
  pageSize?: number;
}

export interface ValuationFilters extends Record<string, unknown> {
  locationId?: string;
  productId?: string;
  valuationMethod?: 'fifo' | 'weighted_average';
}

export interface AgingFilters {
  locationId?: string;
  ageBuckets?: number[];
}

export interface TurnoverFilters extends Record<string, unknown> {
  productId?: string;
  period?: '30d' | '90d' | '365d';
}

export interface FinanceIntegrityFilters extends Record<string, unknown> {
  valueDriftTolerance?: number;
  topDriftLimit?: number;
}

// ============================================================================
// QUERY HOOKS
// ============================================================================

/**
 * Fetch cost layers with filtering
 */
export function useCostLayers(filters: CostLayerFilters = {}, enabled = true) {
  return useQuery({
    queryKey: queryKeys.inventory.costLayers(filters as Record<string, unknown>),
    queryFn: () =>
      resolveReadResult(() => listCostLayers({ data: filters }), {
        message: 'Inventory cost layers returned no data',
        contractType: 'always-shaped',
        fallbackMessage:
          'Inventory cost layers are temporarily unavailable. Please refresh and try again.',
      }),
    enabled,
    staleTime: 30 * 1000,
  });
}

/**
 * Fetch cost layers for a specific inventory item
 */
export function useInventoryCostLayers(inventoryId: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.inventory.costLayersDetail(inventoryId),
    queryFn: () =>
      resolveReadResult(
        () =>
          getInventoryCostLayers({
            data: { inventoryId },
          }),
        {
          message: 'Inventory cost layer detail returned no data',
          contractType: 'detail-not-found',
          fallbackMessage:
            'Inventory cost layer details are temporarily unavailable. Please refresh and try again.',
          notFoundMessage: 'The requested inventory item could not be found.',
        }
      ),
    enabled: enabled && !!inventoryId,
    staleTime: 60 * 1000,
  });
}

/**
 * Fetch inventory valuation report
 */
export function useInventoryValuation(filters: ValuationFilters = {}, enabled = true) {
  return useQuery({
    queryKey: queryKeys.inventory.valuation(filters),
    queryFn: () =>
      resolveReadResult(() => getInventoryValuation({ data: filters }), {
        message: 'Inventory valuation returned no data',
        contractType: 'always-shaped',
        fallbackMessage: 'Inventory valuation is temporarily unavailable. Please refresh and try again.',
      }),
    enabled,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Fetch finance integrity reconciliation for valuation trust signals.
 */
export function useInventoryFinanceIntegrity(filters: FinanceIntegrityFilters = {}, enabled = true) {
  return useQuery({
    queryKey: queryKeys.inventory.financeIntegrity(filters),
    queryFn: () =>
      resolveReadResult(() => getInventoryFinanceIntegrity({ data: filters }), {
        message: 'Inventory finance integrity returned no data',
        contractType: 'always-shaped',
        fallbackMessage:
          'Inventory finance integrity signals are temporarily unavailable. Please refresh and try again.',
      }),
    enabled,
    staleTime: 30 * 1000,
  });
}

/**
 * Calculate COGS for an inventory item (preview mode)
 */
export function useCOGSPreview(
  inventoryId: string,
  quantity: number,
  enabled = true
) {
  return useQuery({
    queryKey: queryKeys.inventory.cogs(inventoryId, quantity),
    queryFn: () =>
      resolveReadResult(
        () =>
          calculateCOGS({
            data: { inventoryId, quantity, simulate: true },
          }),
        {
          message: 'Inventory COGS preview returned no data',
          contractType: 'detail-not-found',
          fallbackMessage:
            'COGS preview is temporarily unavailable for the requested quantity. Please adjust the quantity or try again.',
          notFoundMessage: 'The requested inventory item could not be found.',
        }
      ),
    enabled: enabled && !!inventoryId && quantity > 0,
    staleTime: 30 * 1000,
  });
}

/**
 * Fetch inventory aging analysis
 */
export function useInventoryAging(filters: AgingFilters = {}, enabled = true) {
  const ageBuckets = filters.ageBuckets ?? [30, 60, 90, 180, 365];

  return useQuery({
    queryKey: queryKeys.inventory.aging({ ...filters, ageBuckets }),
    queryFn: () =>
      resolveReadResult(
        () =>
          getInventoryAging({
            data: { ...filters, ageBuckets },
          }),
        {
          message: 'Inventory aging returned no data',
          contractType: 'always-shaped',
          fallbackMessage:
            'Inventory aging analysis is temporarily unavailable. Please refresh and try again.',
        }
      ),
    enabled,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Fetch inventory turnover metrics
 */
export function useInventoryTurnover(filters: TurnoverFilters = {}, enabled = true) {
  return useQuery({
    queryKey: queryKeys.inventory.turnover(filters),
    queryFn: () =>
      resolveReadResult(() => getInventoryTurnover({ data: filters }), {
        message: 'Inventory turnover returned no data',
        contractType: 'always-shaped',
        fallbackMessage:
          'Inventory turnover analysis is temporarily unavailable. Please refresh and try again.',
      }),
    enabled,
    staleTime: 5 * 60 * 1000,
  });
}

// ============================================================================
// MUTATION HOOKS
// ============================================================================

/**
 * Create a cost layer manually
 */
export function useCreateCostLayer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Parameters<typeof createCostLayer>[0]['data']) =>
      createCostLayer({ data }),
    onSuccess: (_, variables) => {
      toast.success('Cost layer created');
      queryClient.invalidateQueries({ queryKey: queryKeys.inventory.valuationAll() });
      queryClient.invalidateQueries({
        queryKey: queryKeys.inventory.costLayersDetail(variables.inventoryId),
      });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create cost layer');
    },
  });
}

/**
 * Calculate and apply COGS (non-preview mode)
 */
export function useCalculateCOGS() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (_data: { inventoryId: string; quantity: number }) => {
      throw new Error(
        'Manual COGS apply is disabled. Use shipment and RMA workflows to post canonical COGS.'
      );
    },
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.inventory.valuationAll() });
      queryClient.invalidateQueries({
        queryKey: queryKeys.inventory.costLayersDetail(variables.inventoryId),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.inventory.lists() });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to calculate COGS');
    },
  });
}

/**
 * Run finance integrity reconciliation (dry-run or apply).
 */
export function useReconcileInventoryFinance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { dryRun?: boolean; limit?: number }) =>
      reconcileInventoryFinanceIntegrity({ data }),
    onSuccess: (result) => {
      toast.success(
        result.dryRun
          ? `Dry run complete: ${result.repairedMissingLayers} missing-layer rows detected`
          : `Reconciliation applied: ${result.repairedValueDriftRows} drift rows repaired`
      );
      queryClient.invalidateQueries({ queryKey: queryKeys.inventory.valuationAll() });
      queryClient.invalidateQueries({ queryKey: queryKeys.inventory.lists() });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to reconcile inventory finance integrity');
    },
  });
}
