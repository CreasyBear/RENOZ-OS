/**
 * Pipeline Metrics Hooks
 *
 * TanStack Query hooks for pipeline metrics and forecasting:
 * - Pipeline metrics summary
 * - Pipeline forecast
 * - Pipeline velocity
 * - Revenue attribution
 *
 * @see src/lib/query-keys.ts for centralized query keys
 * @see src/server/functions/pipeline/pipeline.ts for server functions
 */
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import {
  getPipelineMetrics,
  getPipelineForecast,
  getPipelineVelocity,
  getRevenueAttribution,
} from '@/server/functions/pipeline/pipeline';
import { getCustomers } from '@/server/functions/customers/customers';
import { listProducts } from '@/server/functions/products/products';

// ============================================================================
// PIPELINE METRICS HOOKS
// ============================================================================

export interface UsePipelineMetricsOptions {
  assignedTo?: string;
  customerId?: string;
  enabled?: boolean;
}

export interface PipelineMetricsData {
  totalValue: number;
  weightedValue: number;
  opportunityCount: number;
  byStage: Record<string, { count: number; value: number; weightedValue: number }>;
  avgDaysInStage: Record<string, number>;
  conversionRate: number;
}

/**
 * Fetch pipeline metrics summary
 */
export function usePipelineMetrics({ assignedTo, customerId, enabled = true }: UsePipelineMetricsOptions = {}) {
  return useQuery<PipelineMetricsData>({
    queryKey: queryKeys.pipeline.metrics(),
    queryFn: async () => {
      const result = await getPipelineMetrics({ data: { assignedTo, customerId } });
      return result as PipelineMetricsData;
    },
    enabled,
    staleTime: 60 * 1000, // 1 minute
  });
}

// ============================================================================
// PIPELINE FORECAST HOOKS
// ============================================================================

export interface UsePipelineForecastOptions {
  months?: number;
  enabled?: boolean;
}

/**
 * Fetch pipeline forecast data
 */
export function usePipelineForecast({ months = 6, enabled = true }: UsePipelineForecastOptions = {}) {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - months);

  return useQuery({
    queryKey: [...queryKeys.pipeline.all, 'forecast', months] as const,
    queryFn: () => getPipelineForecast({
      data: {
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
      },
    }),
    enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// ============================================================================
// PIPELINE VELOCITY HOOKS
// ============================================================================

export interface UsePipelineVelocityOptions {
  months?: number;
  enabled?: boolean;
}

/**
 * Fetch pipeline velocity metrics (average time in each stage)
 */
export function usePipelineVelocity({ months = 3, enabled = true }: UsePipelineVelocityOptions = {}) {
  const dateTo = new Date();
  const dateFrom = new Date();
  dateFrom.setMonth(dateFrom.getMonth() - months);

  return useQuery({
    queryKey: [...queryKeys.pipeline.all, 'velocity', months] as const,
    queryFn: () => getPipelineVelocity({
      data: {
        dateFrom: dateFrom.toISOString().split('T')[0],
        dateTo: dateTo.toISOString().split('T')[0],
      },
    }),
    enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// ============================================================================
// REVENUE ATTRIBUTION HOOKS
// ============================================================================

export interface UseRevenueAttributionOptions {
  months?: number;
  enabled?: boolean;
}

/**
 * Fetch revenue attribution data (source tracking)
 */
export function useRevenueAttribution({ months = 12, enabled = true }: UseRevenueAttributionOptions = {}) {
  const dateTo = new Date();
  const dateFrom = new Date();
  dateFrom.setMonth(dateFrom.getMonth() - months);

  return useQuery({
    queryKey: [...queryKeys.pipeline.all, 'revenue-attribution', months] as const,
    queryFn: () => getRevenueAttribution({
      data: {
        dateFrom: dateFrom.toISOString().split('T')[0],
        dateTo: dateTo.toISOString().split('T')[0],
      },
    }),
    enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// ============================================================================
// PIPELINE SUPPORTING DATA HOOKS
// ============================================================================

/**
 * Fetch customers for pipeline dropdowns/selects
 */
export function usePipelineCustomers() {
  return useQuery({
    queryKey: queryKeys.pipeline.customers(),
    queryFn: async () => {
      const result = await getCustomers({
        data: { page: 1, pageSize: 200, sortBy: 'name', sortOrder: 'asc' },
      });
      return result as { items: Array<{ id: string; name: string; email?: string | null }> };
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Fetch products for quote building
 */
export function usePipelineProducts() {
  return useQuery({
    queryKey: queryKeys.pipeline.products(),
    queryFn: async () => {
      const result = await listProducts({
        data: { page: 1, pageSize: 200, status: 'active', sortBy: 'name', sortOrder: 'asc' },
      });
      return result as {
        products: Array<{ id: string; name: string; sku: string; basePrice: number }>;
      };
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

