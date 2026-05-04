/**
 * Procurement Analytics Hooks
 *
 * TanStack Query hooks for procurement analytics and reporting:
 * - Spend metrics by supplier, category, and time
 * - Order metrics with cycle times
 * - Supplier performance rankings
 * - Procurement alerts
 * - Combined dashboard query
 *
 * @see src/server/functions/suppliers/procurement-analytics.ts
 */

import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import { normalizeReadQueryError } from '@/lib/read-path-policy';
import {
  getSpendMetrics,
  getOrderMetrics,
  getSupplierMetrics,
  getProcurementAlerts,
  getProcurementDashboard,
  type SpendMetricsInput,
  type OrderMetricsInput,
  type SupplierMetricsInput,
  type DashboardInput,
} from '@/server/functions/suppliers/procurement-analytics';

// ============================================================================
// OPTIONS INTERFACES
// ============================================================================

export interface UseSpendMetricsOptions extends Partial<SpendMetricsInput> {
  enabled?: boolean;
}

export interface UseOrderMetricsOptions extends Partial<OrderMetricsInput> {
  enabled?: boolean;
}

export interface UseSupplierMetricsOptions extends Partial<SupplierMetricsInput> {
  enabled?: boolean;
}

export interface UseProcurementAlertsOptions {
  enabled?: boolean;
}

export interface UseProcurementDashboardOptions extends Partial<DashboardInput> {
  enabled?: boolean;
}

// ============================================================================
// SPEND METRICS
// ============================================================================

/**
 * Fetch spend metrics aggregated by supplier, category, or time period.
 * Returns totals, breakdowns, and trend data.
 */
export function useSpendMetrics(options: UseSpendMetricsOptions = {}) {
  const { enabled = true, ...params } = options;

  // Build input with schema defaults (groupBy defaults to 'month' in schema)
  const input: SpendMetricsInput = {
    groupBy: params.groupBy ?? 'month',
    ...params,
  };

  return useQuery({
    queryKey: queryKeys.procurement.spend(params),
    queryFn: async () => {
      try {
        return await getSpendMetrics({ data: input });
      } catch (error) {
        throw normalizeReadQueryError(error, {
          contractType: 'always-shaped',
          fallbackMessage:
            'Spend metrics are temporarily unavailable. Please refresh and try again.',
        });
      }
    },
    enabled,
    staleTime: 60 * 1000, // 1 minute
  });
}

// ============================================================================
// ORDER METRICS
// ============================================================================

/**
 * Fetch order metrics including counts by status, cycle times, and rates.
 */
export function useOrderMetrics(options: UseOrderMetricsOptions = {}) {
  const { enabled = true, ...params } = options;

  // OrderMetricsInput has all optional fields, so params is already valid
  const input: OrderMetricsInput = { ...params };

  return useQuery({
    queryKey: queryKeys.procurement.orders(params),
    queryFn: async () => {
      try {
        return await getOrderMetrics({ data: input });
      } catch (error) {
        throw normalizeReadQueryError(error, {
          contractType: 'always-shaped',
          fallbackMessage:
            'Order metrics are temporarily unavailable. Please refresh and try again.',
        });
      }
    },
    enabled,
    staleTime: 60 * 1000, // 1 minute
  });
}

// ============================================================================
// SUPPLIER METRICS
// ============================================================================

/**
 * Fetch top supplier performance metrics with rankings.
 */
export function useSupplierMetrics(options: UseSupplierMetricsOptions = {}) {
  const { enabled = true, ...params } = options;

  // Build input with schema defaults (limit=10, sortBy='spend' in schema)
  const input: SupplierMetricsInput = {
    limit: params.limit ?? 10,
    sortBy: params.sortBy ?? 'spend',
    ...params,
  };

  return useQuery({
    queryKey: queryKeys.procurement.suppliers(params),
    queryFn: async () => {
      try {
        return await getSupplierMetrics({ data: input });
      } catch (error) {
        throw normalizeReadQueryError(error, {
          contractType: 'always-shaped',
          fallbackMessage:
            'Supplier metrics are temporarily unavailable. Please refresh and try again.',
        });
      }
    },
    enabled,
    staleTime: 60 * 1000, // 1 minute
  });
}

// ============================================================================
// PROCUREMENT ALERTS
// ============================================================================

/**
 * Fetch active procurement alerts including overdue POs and delayed deliveries.
 * Refreshes every 2 minutes for near-real-time awareness.
 */
export function useProcurementAlerts(options: UseProcurementAlertsOptions = {}) {
  const { enabled = true } = options;

  return useQuery({
    queryKey: queryKeys.procurement.alerts(),
    queryFn: async () => {
      try {
        return await getProcurementAlerts({});
      } catch (error) {
        throw normalizeReadQueryError(error, {
          contractType: 'always-shaped',
          fallbackMessage:
            'Procurement alerts are temporarily unavailable. Please refresh and try again.',
        });
      }
    },
    enabled,
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 2 * 60 * 1000, // Refresh every 2 minutes
  });
}

// ============================================================================
// COMBINED DASHBOARD
// ============================================================================

/**
 * Fetch combined procurement dashboard metrics.
 * Efficient single query for dashboard initialization.
 */
export function useProcurementDashboard(options: UseProcurementDashboardOptions = {}) {
  const { enabled = true, ...params } = options;

  // Build input with schema default (includePreviousPeriod=true in schema)
  const input: DashboardInput = {
    includePreviousPeriod: params.includePreviousPeriod ?? true,
    ...params,
  };

  return useQuery({
    queryKey: queryKeys.procurement.dashboard(params),
    queryFn: async () => {
      try {
        return await getProcurementDashboard({ data: input });
      } catch (error) {
        throw normalizeReadQueryError(error, {
          contractType: 'always-shaped',
          fallbackMessage:
            'Procurement analytics are temporarily unavailable. Please refresh and try again.',
        });
      }
    },
    enabled,
    staleTime: 60 * 1000, // 1 minute
  });
}
