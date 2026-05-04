/**
 * Financial dashboard hooks.
 */

import { useQuery } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { queryKeys } from '@/lib/query-keys';
import { isReadQueryError, normalizeReadQueryError, requireReadResult } from '@/lib/read-path-policy';
import {
  getFinancialDashboardMetrics,
  getFinancialCloseReadiness,
  getRevenueByPeriod,
  getTopCustomersByRevenue,
  getOutstandingInvoices,
} from '@/server/functions/financial/financial-dashboard';
import type { PeriodType } from '@/lib/schemas';

function rethrowFinancialReadError(
  error: unknown,
  options: {
    fallbackMessage: string;
    contractType: 'always-shaped' | 'detail-not-found';
    notFoundMessage?: string;
  }
): never {
  if (isReadQueryError(error)) {
    throw error;
  }

  throw normalizeReadQueryError(error, options);
}

// ============================================================================
// FINANCIAL DASHBOARD HOOKS
// ============================================================================

export interface UseFinancialDashboardMetricsOptions {
  includePreviousPeriod?: boolean;
  enabled?: boolean;
}

/**
 * Fetch comprehensive financial dashboard metrics.
 * Includes revenue MTD/YTD, AR balance, cash received, GST collected.
 */
export function useFinancialDashboardMetrics(options: UseFinancialDashboardMetricsOptions = {}) {
  const { enabled = true, includePreviousPeriod = true } = options;
  const fn = useServerFn(getFinancialDashboardMetrics);

  return useQuery({
    queryKey: queryKeys.financial.dashboardMetrics({ includePreviousPeriod }),
    queryFn: async () => {
      try {
        const result = await fn({ data: { includePreviousPeriod } });
        return requireReadResult(result, {
          message: 'Financial dashboard metrics returned no data',
          contractType: 'always-shaped',
          fallbackMessage:
            'Financial dashboard metrics are temporarily unavailable. Please refresh and try again.',
        });
      } catch (error) {
        rethrowFinancialReadError(error, {
          contractType: 'always-shaped',
          fallbackMessage:
            'Financial dashboard metrics are temporarily unavailable. Please refresh and try again.',
        });
      }
    },
    enabled,
    staleTime: 60 * 1000, // 1 minute
  });
}

/**
 * Finance close-readiness guard (hard gates for period close / release).
 */
export function useFinancialCloseReadiness(enabled = true) {
  const fn = useServerFn(getFinancialCloseReadiness);
  return useQuery({
    queryKey: queryKeys.financial.closeReadiness(),
    queryFn: async () => {
      try {
        const result = await fn({ data: undefined });
        return requireReadResult(result, {
          message: 'Financial close readiness returned no data',
          contractType: 'always-shaped',
          fallbackMessage:
            'Financial close readiness is temporarily unavailable. Please refresh and try again.',
        });
      } catch (error) {
        rethrowFinancialReadError(error, {
          contractType: 'always-shaped',
          fallbackMessage:
            'Financial close readiness is temporarily unavailable. Please refresh and try again.',
        });
      }
    },
    enabled,
    staleTime: 30 * 1000,
  });
}

export interface UseRevenueByPeriodOptions {
  dateFrom: Date;
  dateTo: Date;
  periodType: PeriodType;
  customerType?: 'residential' | 'commercial';
  enabled?: boolean;
}

/**
 * Fetch revenue breakdown by time period.
 * Supports daily, weekly, monthly, quarterly, yearly periods.
 * Includes residential vs commercial breakdown.
 */
export function useRevenueByPeriod(options: UseRevenueByPeriodOptions) {
  const { enabled = true, ...params } = options;
  const fn = useServerFn(getRevenueByPeriod);

  return useQuery({
    queryKey: queryKeys.financial.revenueByPeriod(params.periodType, {
      dateFrom: params.dateFrom,
      dateTo: params.dateTo,
      customerType: params.customerType,
    }),
    queryFn: async () => {
      try {
        const result = await fn({ data: params });
        return requireReadResult(result, {
          message: 'Revenue report returned no data',
          contractType: 'always-shaped',
          fallbackMessage: 'Revenue reporting is temporarily unavailable. Please refresh and try again.',
        });
      } catch (error) {
        rethrowFinancialReadError(error, {
          contractType: 'always-shaped',
          fallbackMessage: 'Revenue reporting is temporarily unavailable. Please refresh and try again.',
        });
      }
    },
    enabled,
    staleTime: 60 * 1000,
  });
}

export interface UseTopCustomersByRevenueOptions {
  dateFrom?: Date;
  dateTo?: Date;
  commercialOnly?: boolean;
  pageSize?: number;
  page?: number;
  /** Revenue basis: invoiced (orders) or cash (payments received) */
  basis?: 'invoiced' | 'cash';
  enabled?: boolean;
}

/**
 * Fetch top customers by revenue.
 * Highlights commercial accounts ($50K+).
 */
export function useTopCustomersByRevenue(options: UseTopCustomersByRevenueOptions = {}) {
  const { enabled = true, ...params } = options;
  const fn = useServerFn(getTopCustomersByRevenue);

  return useQuery({
    queryKey: queryKeys.financial.topCustomers({
      dateFrom: params.dateFrom,
      dateTo: params.dateTo,
      commercialOnly: params.commercialOnly,
      pageSize: params.pageSize,
      basis: params.basis,
    }),
    queryFn: async () => {
      try {
        const result = await fn({ data: params });
        return requireReadResult(result, {
          message: 'Top customers by revenue returned no data',
          contractType: 'always-shaped',
          fallbackMessage:
            'Top-customer revenue data is temporarily unavailable. Please refresh and try again.',
        });
      } catch (error) {
        rethrowFinancialReadError(error, {
          contractType: 'always-shaped',
          fallbackMessage:
            'Top-customer revenue data is temporarily unavailable. Please refresh and try again.',
        });
      }
    },
    enabled,
    staleTime: 60 * 1000,
  });
}

export interface UseOutstandingInvoicesOptions {
  overdueOnly?: boolean;
  customerType?: 'residential' | 'commercial';
  pageSize?: number;
  page?: number;
  enabled?: boolean;
}

/**
 * Fetch outstanding invoices with summary statistics.
 * Optionally filtered by overdue status or customer type.
 */
export function useOutstandingInvoices(options: UseOutstandingInvoicesOptions = {}) {
  const { enabled = true, ...params } = options;
  const fn = useServerFn(getOutstandingInvoices);

  return useQuery({
    queryKey: queryKeys.financial.outstandingInvoices({
      overdueOnly: params.overdueOnly,
      customerType: params.customerType,
      pageSize: params.pageSize,
    }),
    queryFn: async () => {
      try {
        const result = await fn({ data: params });
        return requireReadResult(result, {
          message: 'Outstanding invoices returned no data',
          contractType: 'always-shaped',
          fallbackMessage:
            'Outstanding invoice data is temporarily unavailable. Please refresh and try again.',
        });
      } catch (error) {
        rethrowFinancialReadError(error, {
          contractType: 'always-shaped',
          fallbackMessage:
            'Outstanding invoice data is temporarily unavailable. Please refresh and try again.',
        });
      }
    },
    enabled,
    staleTime: 60 * 1000,
  });
}

