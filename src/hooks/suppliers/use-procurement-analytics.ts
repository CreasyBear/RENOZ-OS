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
import { useServerFn } from '@tanstack/react-start';
import { queryKeys } from '@/lib/query-keys';
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
  const fn = useServerFn(getSpendMetrics);

  // Build input with schema defaults (groupBy defaults to 'month' in schema)
  const input: SpendMetricsInput = {
    groupBy: params.groupBy ?? 'month',
    ...params,
  };

  return useQuery({
    queryKey: queryKeys.procurement.spend(params),
    queryFn: () => fn({ data: input }),
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
  const fn = useServerFn(getOrderMetrics);

  // OrderMetricsInput has all optional fields, so params is already valid
  const input: OrderMetricsInput = { ...params };

  return useQuery({
    queryKey: queryKeys.procurement.orders(params),
    queryFn: () => fn({ data: input }),
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
  const fn = useServerFn(getSupplierMetrics);

  // Build input with schema defaults (limit=10, sortBy='spend' in schema)
  const input: SupplierMetricsInput = {
    limit: params.limit ?? 10,
    sortBy: params.sortBy ?? 'spend',
    ...params,
  };

  return useQuery({
    queryKey: queryKeys.procurement.suppliers(params),
    queryFn: () => fn({ data: input }),
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
  const fn = useServerFn(getProcurementAlerts);

  return useQuery({
    queryKey: queryKeys.procurement.alerts(),
    queryFn: () => fn({}),
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
  const fn = useServerFn(getProcurementDashboard);

  // Build input with schema default (includePreviousPeriod=true in schema)
  const input: DashboardInput = {
    includePreviousPeriod: params.includePreviousPeriod ?? true,
    ...params,
  };

  return useQuery({
    queryKey: queryKeys.procurement.dashboard(params),
    queryFn: () => fn({ data: input }),
    enabled,
    staleTime: 60 * 1000, // 1 minute
  });
}
