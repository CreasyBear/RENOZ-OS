/**
 * Financial Aggregation Helpers
 *
 * Shared aggregation logic for financial metrics. Used by financial-dashboard
 * and dashboard-metrics to ensure consistent cash revenue calculations.
 *
 * @see SCHEMA-TRACE.md - Aggregation patterns
 */

import { eq, and, sql, isNull, ne, gte, lte } from 'drizzle-orm';
import { db } from '@/lib/db';
import { orders, orderPayments } from 'drizzle/schema';
import { safeNumber } from '@/lib/numeric';

/**
 * Get cash revenue (payments received, net of refunds) for a date range.
 * Sums order_payments.amount where isRefund=false, subtracts where isRefund=true.
 *
 * @param organizationId - Organization to filter by
 * @param startDate - Start date (YYYY-MM-DD)
 * @param endDate - End date (YYYY-MM-DD)
 * @returns Total cash received in cents
 */
export async function getCashRevenueByDateRange(
  organizationId: string,
  startDate: string,
  endDate: string
): Promise<number> {
  const [result] = await db
    .select({
      total: sql<number>`COALESCE(SUM(CASE WHEN ${orderPayments.isRefund} THEN -${orderPayments.amount} ELSE ${orderPayments.amount} END), 0)`,
    })
    .from(orderPayments)
    .innerJoin(orders, eq(orderPayments.orderId, orders.id))
    .where(
      and(
        eq(orderPayments.organizationId, organizationId),
        isNull(orderPayments.deletedAt),
        isNull(orders.deletedAt),
        ne(orders.status, 'cancelled'),
        gte(orderPayments.paymentDate, startDate),
        lte(orderPayments.paymentDate, endDate)
      )
    );

  return safeNumber(result?.total);
}
