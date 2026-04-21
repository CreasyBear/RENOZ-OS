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
import { useServerFn } from '@tanstack/react-start';
import { queryKeys } from '@/lib/query-keys';
import {
  isReadQueryError,
  normalizeReadQueryError,
  requireReadResult,
} from '@/lib/read-path-policy';
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
  const getPipelineMetricsFn = useServerFn(getPipelineMetrics);

  return useQuery<PipelineMetricsData>({
    queryKey: queryKeys.pipeline.metrics(),
    queryFn: async () => {
      try {
        const result = await getPipelineMetricsFn({ data: { assignedTo, customerId } });
        return requireReadResult(result, {
          message: 'Pipeline metrics returned no data',
          contractType: 'always-shaped',
          fallbackMessage: 'Pipeline metrics are temporarily unavailable. Please refresh and try again.',
        }) as PipelineMetricsData;
      } catch (error) {
        if (isReadQueryError(error)) throw error;
        throw normalizeReadQueryError(error, {
          contractType: 'always-shaped',
          fallbackMessage: 'Pipeline metrics are temporarily unavailable. Please refresh and try again.',
        });
      }
    },
    enabled,
    staleTime: 60 * 1000, // 1 minute
  });
}

// ============================================================================
// PIPELINE FORECAST HOOKS
// ============================================================================

export interface UsePipelineForecastOptions {
  /** Number of months for date range (used if startDate/endDate not provided) */
  months?: number;
  /** Start date in YYYY-MM-DD format */
  startDate?: string;
  /** End date in YYYY-MM-DD format */
  endDate?: string;
  /** Grouping: 'week', 'month', 'quarter', 'rep', or 'customer' */
  groupBy?: 'week' | 'month' | 'quarter' | 'rep' | 'customer';
  /** Include weighted values in response */
  includeWeighted?: boolean;
  enabled?: boolean;
}

/**
 * Fetch pipeline forecast data.
 * Supports both months-based and explicit date range inputs.
 */
export function usePipelineForecast(options: UsePipelineForecastOptions = {}) {
  const {
    months = 6,
    startDate: inputStartDate,
    endDate: inputEndDate,
    groupBy = 'month',
    includeWeighted = true,
    enabled = true,
  } = options;

  // Use explicit dates if provided, otherwise calculate from months
  let startDate = inputStartDate;
  let endDate = inputEndDate;

  if (!startDate || !endDate) {
    const end = new Date();
    const start = new Date();
    start.setMonth(start.getMonth() - months);
    startDate = start.toISOString().split('T')[0];
    endDate = end.toISOString().split('T')[0];
  }

  return useQuery({
    queryKey: queryKeys.reports.pipelineForecast(startDate, endDate, groupBy),
    queryFn: async () => {
      try {
        const result = await getPipelineForecast({
          data: {
            startDate,
            endDate,
            groupBy,
            includeWeighted,
          },
        });
        return requireReadResult(result, {
          message: 'Pipeline forecast returned no data',
          contractType: 'always-shaped',
          fallbackMessage:
            'Pipeline forecast is temporarily unavailable. Please refresh and try again.',
        });
      } catch (error) {
        if (isReadQueryError(error)) throw error;
        throw normalizeReadQueryError(error, {
          contractType: 'always-shaped',
          fallbackMessage:
            'Pipeline forecast is temporarily unavailable. Please refresh and try again.',
        });
      }
    },
    enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// ============================================================================
// PIPELINE VELOCITY HOOKS
// ============================================================================

export interface UsePipelineVelocityOptions {
  /** Number of months for date range (used if dateFrom/dateTo not provided) */
  months?: number;
  /** Start date in YYYY-MM-DD format */
  dateFrom?: string;
  /** End date in YYYY-MM-DD format */
  dateTo?: string;
  enabled?: boolean;
}

/**
 * Fetch pipeline velocity metrics (average time in each stage).
 * Supports both months-based and explicit date range inputs.
 */
export function usePipelineVelocity(options: UsePipelineVelocityOptions = {}) {
  const {
    months = 3,
    dateFrom: inputDateFrom,
    dateTo: inputDateTo,
    enabled = true,
  } = options;

  // Use explicit dates if provided, otherwise calculate from months
  let dateFrom = inputDateFrom;
  let dateTo = inputDateTo;

  if (!dateFrom || !dateTo) {
    const to = new Date();
    const from = new Date();
    from.setMonth(from.getMonth() - months);
    dateFrom = from.toISOString().split('T')[0];
    dateTo = to.toISOString().split('T')[0];
  }

  return useQuery({
    queryKey: queryKeys.reports.pipelineVelocity(dateFrom, dateTo),
    queryFn: async () => {
      try {
        const result = await getPipelineVelocity({
          data: { dateFrom, dateTo },
        });
        return requireReadResult(result, {
          message: 'Pipeline velocity returned no data',
          contractType: 'always-shaped',
          fallbackMessage:
            'Pipeline velocity is temporarily unavailable. Please refresh and try again.',
        });
      } catch (error) {
        if (isReadQueryError(error)) throw error;
        throw normalizeReadQueryError(error, {
          contractType: 'always-shaped',
          fallbackMessage:
            'Pipeline velocity is temporarily unavailable. Please refresh and try again.',
        });
      }
    },
    enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// ============================================================================
// REVENUE ATTRIBUTION HOOKS
// ============================================================================

export interface UseRevenueAttributionOptions {
  /** Number of months for date range (used if dateFrom/dateTo not provided) */
  months?: number;
  /** Start date in YYYY-MM-DD format */
  dateFrom?: string;
  /** End date in YYYY-MM-DD format */
  dateTo?: string;
  /** Grouping: 'rep', 'customer', 'source', or 'month' */
  groupBy?: 'rep' | 'customer' | 'source' | 'month';
  enabled?: boolean;
}

/**
 * Fetch revenue attribution data (source tracking).
 * Supports both months-based and explicit date range inputs.
 */
export function useRevenueAttribution(options: UseRevenueAttributionOptions = {}) {
  const {
    months = 12,
    dateFrom: inputDateFrom,
    dateTo: inputDateTo,
    groupBy = 'month',
    enabled = true,
  } = options;

  // Use explicit dates if provided, otherwise calculate from months
  let dateFrom = inputDateFrom;
  let dateTo = inputDateTo;

  if (!dateFrom || !dateTo) {
    const to = new Date();
    const from = new Date();
    from.setMonth(from.getMonth() - months);
    dateFrom = from.toISOString().split('T')[0];
    dateTo = to.toISOString().split('T')[0];
  }

  return useQuery({
    queryKey: queryKeys.reports.revenueAttribution(dateFrom, dateTo),
    queryFn: async () => {
      try {
        const result = await getRevenueAttribution({
          data: { dateFrom, dateTo, groupBy },
        });
        return requireReadResult(result, {
          message: 'Revenue attribution returned no data',
          contractType: 'always-shaped',
          fallbackMessage:
            'Revenue attribution is temporarily unavailable. Please refresh and try again.',
        });
      } catch (error) {
        if (isReadQueryError(error)) throw error;
        throw normalizeReadQueryError(error, {
          contractType: 'always-shaped',
          fallbackMessage:
            'Revenue attribution is temporarily unavailable. Please refresh and try again.',
        });
      }
    },
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
      try {
        const result = await getCustomers({
          data: { page: 1, pageSize: 200, sortBy: 'name', sortOrder: 'asc' },
        });
        return requireReadResult(result, {
          message: 'Pipeline customers returned no data',
          contractType: 'always-shaped',
          fallbackMessage:
            'Pipeline customers are temporarily unavailable. Please refresh and try again.',
        }) as { items: Array<{ id: string; name: string; email?: string | null }> };
      } catch (error) {
        if (isReadQueryError(error)) throw error;
        throw normalizeReadQueryError(error, {
          contractType: 'always-shaped',
          fallbackMessage:
            'Pipeline customers are temporarily unavailable. Please refresh and try again.',
        });
      }
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
      try {
        const result = await listProducts({
          data: { page: 1, pageSize: 200, status: 'active', sortBy: 'name', sortOrder: 'asc' },
        });
        return requireReadResult(result, {
          message: 'Pipeline products returned no data',
          contractType: 'always-shaped',
          fallbackMessage:
            'Pipeline products are temporarily unavailable. Please refresh and try again.',
        }) as {
          products: Array<{ id: string; name: string; sku: string; basePrice: number }>;
        };
      } catch (error) {
        if (isReadQueryError(error)) throw error;
        throw normalizeReadQueryError(error, {
          contractType: 'always-shaped',
          fallbackMessage:
            'Pipeline products are temporarily unavailable. Please refresh and try again.',
        });
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
