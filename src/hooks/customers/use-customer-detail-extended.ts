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
import { queryKeys } from '@/lib/query-keys';
import {
  getCustomerAlerts,
  getCustomerActiveItems,
  getCustomerOrderSummary,
} from '@/server/functions/customers';
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
  return useQuery<CustomerAlertsResponse>({
    queryKey: queryKeys.customers.alerts(customerId),
    queryFn: async () => {
      const result = await getCustomerAlerts({
        data: { customerId } 
      });
      if (result == null) throw new Error('Query returned no data');
      return result;
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
  return useQuery({
    queryKey: queryKeys.customers.activeItems(customerId),
    queryFn: async () => {
      const result = await getCustomerActiveItems({
        data: { customerId } 
      });
      if (result == null) throw new Error('Query returned no data');
      return result;
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
  return useQuery({
    queryKey: queryKeys.customers.orderSummary(customerId),
    queryFn: async () => {
      const result = await getCustomerOrderSummary({
        data: { customerId } 
      });
      if (result == null) throw new Error('Query returned no data');
      return result;
    },
    enabled: enabled && !!customerId,
    staleTime: 60 * 1000, // 1 minute
  });
}
