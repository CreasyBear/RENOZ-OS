/**
 * Inventory Forecasting Hooks
 *
 * TanStack Query hooks for demand forecasting and reorder management:
 * - Reorder recommendations
 * - Product forecasts
 * - Forecast accuracy metrics
 * - Safety stock calculations
 *
 * @see src/server/functions/inventory/forecasting.ts
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import { toast } from '../_shared/use-toast';
import {
  listForecasts,
  getProductForecast,
  upsertForecast,
  bulkUpdateForecasts,
  calculateSafetyStock,
  getReorderRecommendations,
  getForecastAccuracy,
} from '@/server/functions/inventory';

// ============================================================================
// TYPES
// ============================================================================

export interface ForecastFilters {
  productId?: string;
  forecastPeriod?: 'daily' | 'weekly' | 'monthly';
  dateFrom?: Date;
  dateTo?: Date;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface UseForecastsOptions extends ForecastFilters {
  enabled?: boolean;
}

export interface ReorderFilters extends Record<string, unknown> {
  urgencyFilter?: 'all' | 'critical' | 'high';
  limit?: number;
}

// ============================================================================
// QUERY HOOKS
// ============================================================================

/**
 * Fetch forecast list with filtering
 */
export function useForecasts(options: UseForecastsOptions = {}) {
  const { enabled = true, ...filters } = options;

  return useQuery({
    queryKey: queryKeys.inventory.productForecast('all', filters),
    queryFn: async () => {
      const result = await listForecasts({ data: filters });
      if (result == null) throw new Error('Query returned no data');
      return result;
    },
    enabled,
    staleTime: 60 * 1000,
  });
}

/**
 * Fetch product forecast details
 */
export function useProductForecast(
  productId: string,
  options: { period?: 'daily' | 'weekly' | 'monthly' | 'quarterly'; days?: number } = {},
  enabled = true
) {
  const { period = 'monthly', days = 90 } = options;

  return useQuery({
    queryKey: queryKeys.inventory.productForecast(productId, { period, days }),
    queryFn: async () => {
      const result = await getProductForecast({
        data: { productId, period, days } 
      });
      if (result == null) throw new Error('Query returned no data');
      return result;
    },
    enabled: enabled && !!productId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Fetch reorder recommendations
 */
export function useReorderRecommendations(filters: ReorderFilters = {}, enabled = true) {
  return useQuery({
    queryKey: queryKeys.inventory.reorderRecommendations(filters),
    queryFn: async () => {
      const result = await getReorderRecommendations({ data: filters });
      if (result == null) throw new Error('Query returned no data');
      return result;
    },
    enabled,
    staleTime: 60 * 1000,
  });
}

/**
 * Fetch forecast accuracy metrics
 */
export function useForecastAccuracy(
  options: {
    productId?: string;
    period?: 'daily' | 'weekly' | 'monthly';
    lookbackDays?: number;
  } = {},
  enabled = true
) {
  const { productId, period = 'monthly', lookbackDays = 90 } = options;

  return useQuery({
    queryKey: queryKeys.inventory.forecastAccuracy(productId),
    queryFn: async () => {
      const result = await getForecastAccuracy({
        data: { productId, period, lookbackDays } 
      });
      if (result == null) throw new Error('Query returned no data');
      return result;
    },
    enabled,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Calculate safety stock for a product
 */
export function useSafetyStock(
  productId: string,
  options: { serviceLevel?: number; leadTimeDays?: number } = {},
  enabled = true
) {
  const { serviceLevel = 0.95, leadTimeDays = 7 } = options;

  return useQuery({
    queryKey: queryKeys.inventory.safetyStock(productId, { serviceLevel, leadTimeDays }),
    queryFn: async () => {
      const result = await calculateSafetyStock({
        data: { productId, serviceLevel, leadTimeDays } 
      });
      if (result == null) throw new Error('Query returned no data');
      return result;
    },
    enabled: enabled && !!productId,
    staleTime: 10 * 60 * 1000,
  });
}

// ============================================================================
// MUTATION HOOKS
// ============================================================================

/**
 * Create or update a forecast
 */
export function useUpsertForecast() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Parameters<typeof upsertForecast>[0]['data']) =>
      upsertForecast({ data }),
    onSuccess: (result, variables) => {
      toast.success(result.created ? 'Forecast created' : 'Forecast updated');
      queryClient.invalidateQueries({ queryKey: queryKeys.inventory.forecastingAll() });
      queryClient.invalidateQueries({
        queryKey: queryKeys.inventory.productForecast(variables.productId, {}),
      });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to save forecast');
    },
  });
}

/**
 * Bulk update forecasts
 */
export function useBulkUpdateForecasts() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (forecasts: Parameters<typeof bulkUpdateForecasts>[0]['data']['forecasts']) =>
      bulkUpdateForecasts({ data: { forecasts } }),
    onSuccess: (result) => {
      toast.success(`Updated ${result.updatedCount} forecasts, created ${result.createdCount}`);
      queryClient.invalidateQueries({ queryKey: queryKeys.inventory.forecastingAll() });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update forecasts');
    },
  });
}
