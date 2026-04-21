/**
 * Customer Detail Extended Hooks
 *
 * TanStack Query hooks for customer detail view extended data:
 * - Customer alerts (credit hold, overdue orders, expiring warranties)
 * - Customer active items (quotes, orders, projects, claims in progress)
 * - Customer order summary (totals, outstanding balance, recent orders)
 *
 * @see docs/design-system/DETAIL-VIEW-STANDARDS.md
 * @see STANDARDS.md - Types imported from schemas
 */
import { useQuery } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { normalizeReadQueryError } from '@/lib/read-path-policy';
import { queryKeys } from '@/lib/query-keys';
import {
  getCustomerAlerts,
  getCustomerActiveItems,
  getCustomerOrderSummary,
} from '@/server/functions/customers/customer-detail-extended';
import type { CustomerAlertsResponse } from '@/lib/schemas/customers/customer-detail-extended';
// NOTE: Types (CustomerAlert, CustomerActiveItems, CustomerOrderSummary) must be
// imported directly from @/lib/schemas/customers, not re-exported through hooks.
// This prevents client/server bundling issues.

export interface UseCustomerAlertsOptions {
  customerId: string;
  enabled?: boolean;
}

export interface UseCustomerActiveItemsOptions {
  customerId: string;
  enabled?: boolean;
}

export interface UseCustomerOrderSummaryOptions {
  customerId: string;
  enabled?: boolean;
}

// ============================================================================
// ALERTS HOOK
// ============================================================================

/**
 * Fetch customer alerts (credit hold, overdue invoices, expiring warranties, etc.)
 *
 * @example
 * ```tsx
 * const { data: alerts, isLoading } = useCustomerAlerts({ customerId });
 *
 * if (alerts?.hasAlerts) {
 *   return <CustomerAlerts alerts={alerts.alerts} />;
 * }
 * ```
 */
export function useCustomerAlerts({ customerId, enabled = true }: UseCustomerAlertsOptions) {
  const getCustomerAlertsFn = useServerFn(getCustomerAlerts);

  return useQuery<CustomerAlertsResponse>({
    queryKey: queryKeys.customers.alerts(customerId),
    queryFn: async () => {
      try {
        return await getCustomerAlertsFn({
          data: { customerId }
        });
      } catch (error) {
        throw normalizeReadQueryError(error, {
          contractType: 'always-shaped',
          fallbackMessage: 'Customer alerts are temporarily unavailable. Please refresh and try again.',
        });
      }
    },
    enabled: enabled && !!customerId,
    staleTime: 60 * 1000, // 1 minute - alerts can be slightly stale
  });
}

// ============================================================================
// ACTIVE ITEMS HOOK
// ============================================================================

/**
 * Fetch customer active items (quotes, orders, projects, claims in progress)
 *
 * @example
 * ```tsx
 * const { data: activeItems, isLoading } = useCustomerActiveItems({ customerId });
 *
 * if (activeItems && activeItems.counts.quotes > 0) {
 *   return <ActiveQuotesList quotes={activeItems.quotes} />;
 * }
 * ```
 */
export function useCustomerActiveItems({
  customerId,
  enabled = true,
}: UseCustomerActiveItemsOptions) {
  const getCustomerActiveItemsFn = useServerFn(getCustomerActiveItems);

  return useQuery({
    queryKey: queryKeys.customers.activeItems(customerId),
    queryFn: async () => {
      try {
        return await getCustomerActiveItemsFn({
          data: { customerId }
        });
      } catch (error) {
        throw normalizeReadQueryError(error, {
          contractType: 'always-shaped',
          fallbackMessage: 'Customer activity is temporarily unavailable. Please refresh and try again.',
        });
      }
    },
    enabled: enabled && !!customerId,
    staleTime: 30 * 1000, // 30 seconds - active items change frequently
  });
}

// ============================================================================
// ORDER SUMMARY HOOK
// ============================================================================

/**
 * Fetch customer order summary (totals, outstanding balance, recent orders)
 *
 * @example
 * ```tsx
 * const { data: orderSummary } = useCustomerOrderSummary({ customerId });
 *
 * return (
 *   <div>
 *     <span>Total Orders: {orderSummary?.totalOrders}</span>
 *     <span>Outstanding: ${orderSummary?.outstandingBalance}</span>
 *   </div>
 * );
 * ```
 */
export function useCustomerOrderSummary({
  customerId,
  enabled = true,
}: UseCustomerOrderSummaryOptions) {
  const getCustomerOrderSummaryFn = useServerFn(getCustomerOrderSummary);

  return useQuery({
    queryKey: queryKeys.customers.orderSummary(customerId),
    queryFn: async () => {
      try {
        return await getCustomerOrderSummaryFn({
          data: { customerId }
        });
      } catch (error) {
        throw normalizeReadQueryError(error, {
          contractType: 'always-shaped',
          fallbackMessage: 'Customer order metrics are temporarily unavailable. Please refresh and try again.',
        });
      }
    },
    enabled: enabled && !!customerId,
    staleTime: 60 * 1000, // 1 minute
  });
}
