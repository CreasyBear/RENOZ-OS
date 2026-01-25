/**
 * AR Aging Server Functions
 *
 * Accounts receivable aging report functions for tracking outstanding
 * battery equipment invoices by how overdue they are.
 *
 * Aging buckets are based on 30-day payment terms:
 * - Current: Within terms (not yet due or due within 30 days)
 * - 1-30: 1-30 days overdue (past due date)
 * - 31-60: 31-60 days overdue
 * - 61-90: 61-90 days overdue
 * - 90+: More than 90 days overdue
 *
 * @see _Initiation/_prd/2-domains/financial/financial.prd.json for DOM-FIN-003a
 */

import { createServerFn } from '@tanstack/react-start';
import { eq, and, sql, isNull, gt, or, ne } from 'drizzle-orm';
import { db } from '@/lib/db';
import { orders, customers as customersTable } from 'drizzle/schema';
import { withAuth } from '@/lib/server/protected';
import {
  arAgingReportQuerySchema,
  arAgingCustomerDetailQuerySchema,
  type AgingBucket,
  type AgingBucketSummary,
  type CustomerAgingSummary,
  type AgingInvoiceDetail,
  type ARAgingReportResult,
  type CustomerAgingDetailResult,
} from '@/lib/schemas';
import { calculateDaysOverdue as calcDaysOverdue } from '@/lib/utils/financial';

// ============================================================================
// CONSTANTS
// ============================================================================

/** Commercial account threshold in AUD */
const COMMERCIAL_THRESHOLD = 50000;

/** Payment terms in days (standard 30-day terms) */
const PAYMENT_TERMS_DAYS = 30;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Calculate the aging bucket for an invoice based on days overdue.
 */
function getAgingBucket(daysOverdue: number): AgingBucket {
  if (daysOverdue <= 0) return 'current';
  if (daysOverdue <= 30) return '1-30';
  if (daysOverdue <= 60) return '31-60';
  if (daysOverdue <= 90) return '61-90';
  return '90+';
}

/**
 * Calculate days overdue from due date.
 * Negative values mean the invoice is not yet due.
 * Uses shared utility with proper timezone handling.
 */
function calculateDaysOverdue(dueDate: Date, asOfDate: Date): number {
  return calcDaysOverdue(dueDate, asOfDate);
}

/**
 * Get due date from order date (order date + payment terms).
 * If dueDate is explicitly set, use that instead.
 */
function getEffectiveDueDate(orderDate: string | Date, dueDate: string | Date | null): Date {
  if (dueDate) {
    return new Date(dueDate);
  }
  // Default: order date + 30 days payment terms
  const effectiveDate = new Date(orderDate);
  effectiveDate.setDate(effectiveDate.getDate() + PAYMENT_TERMS_DAYS);
  return effectiveDate;
}

// ============================================================================
// GET AR AGING REPORT
// ============================================================================

/**
 * Get the full AR aging report with bucket summaries and customer breakdown.
 *
 * Returns:
 * - Summary totals per aging bucket
 * - Overall AR metrics
 * - Customer-by-customer breakdown with aging details
 * - Highlights high-value commercial accounts ($50K+)
 *
 * Uses SQL aggregation for efficient bucket calculations instead of
 * in-memory processing.
 */
export const getARAgingReport = createServerFn()
  .inputValidator(arAgingReportQuerySchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth();
    const asOfDate = data.asOfDate ? new Date(data.asOfDate) : new Date();
    const asOfDateStr = asOfDate.toISOString().split('T')[0]; // YYYY-MM-DD format

    // Build customer filter clause for SQL
    const customerFilter = data.customerId
      ? sql`AND o.customer_id = ${data.customerId}`
      : sql``;

    // Query 1: Get bucket summary totals using SQL aggregation
    // This calculates aging buckets in the database instead of JavaScript
    const bucketSummaryResult = await db.execute<{
      current_amount: string;
      current_count: string;
      days_1_30_amount: string;
      days_1_30_count: string;
      days_31_60_amount: string;
      days_31_60_count: string;
      days_61_90_amount: string;
      days_61_90_count: string;
      days_over_90_amount: string;
      days_over_90_count: string;
      total_invoices: string;
    }>(sql`
      SELECT
        COALESCE(SUM(CASE WHEN age <= 0 THEN balance ELSE 0 END), 0)::text as current_amount,
        COUNT(CASE WHEN age <= 0 THEN 1 END)::text as current_count,
        COALESCE(SUM(CASE WHEN age BETWEEN 1 AND 30 THEN balance ELSE 0 END), 0)::text as days_1_30_amount,
        COUNT(CASE WHEN age BETWEEN 1 AND 30 THEN 1 END)::text as days_1_30_count,
        COALESCE(SUM(CASE WHEN age BETWEEN 31 AND 60 THEN balance ELSE 0 END), 0)::text as days_31_60_amount,
        COUNT(CASE WHEN age BETWEEN 31 AND 60 THEN 1 END)::text as days_31_60_count,
        COALESCE(SUM(CASE WHEN age BETWEEN 61 AND 90 THEN balance ELSE 0 END), 0)::text as days_61_90_amount,
        COUNT(CASE WHEN age BETWEEN 61 AND 90 THEN 1 END)::text as days_61_90_count,
        COALESCE(SUM(CASE WHEN age > 90 THEN balance ELSE 0 END), 0)::text as days_over_90_amount,
        COUNT(CASE WHEN age > 90 THEN 1 END)::text as days_over_90_count,
        COUNT(*)::text as total_invoices
      FROM (
        SELECT
          COALESCE(o.balance_due, COALESCE(o.total, 0) - COALESCE(o.paid_amount, 0)) as balance,
          EXTRACT(DAY FROM (${asOfDateStr}::date - COALESCE(o.due_date, o.order_date::date + ${PAYMENT_TERMS_DAYS})))::int as age
        FROM orders o
        WHERE o.organization_id = ${ctx.organizationId}
          AND o.deleted_at IS NULL
          AND o.status NOT IN ('draft', 'cancelled')
          AND (
            o.balance_due > 0
            OR (o.balance_due IS NULL AND COALESCE(o.total, 0) > COALESCE(o.paid_amount, 0))
          )
          ${customerFilter}
      ) aged
      WHERE balance > 0 OR ${data.includeZeroBalance ?? false}
    `);

    const bucketRow = bucketSummaryResult[0];
    const bucketTotals: Record<AgingBucket, { amount: number; count: number }> = {
      current: {
        amount: parseFloat(bucketRow?.current_amount ?? '0'),
        count: parseInt(bucketRow?.current_count ?? '0', 10),
      },
      '1-30': {
        amount: parseFloat(bucketRow?.days_1_30_amount ?? '0'),
        count: parseInt(bucketRow?.days_1_30_count ?? '0', 10),
      },
      '31-60': {
        amount: parseFloat(bucketRow?.days_31_60_amount ?? '0'),
        count: parseInt(bucketRow?.days_31_60_count ?? '0', 10),
      },
      '61-90': {
        amount: parseFloat(bucketRow?.days_61_90_amount ?? '0'),
        count: parseInt(bucketRow?.days_61_90_count ?? '0', 10),
      },
      '90+': {
        amount: parseFloat(bucketRow?.days_over_90_amount ?? '0'),
        count: parseInt(bucketRow?.days_over_90_count ?? '0', 10),
      },
    };

    // Query 2: Get customer-level aggregation using SQL GROUP BY
    // This groups and sums per customer in the database
    const commercialFilter = data.commercialOnly
      ? sql`HAVING SUM(balance) >= ${COMMERCIAL_THRESHOLD}`
      : sql``;

    const customerSummaryResult = await db.execute<{
      customer_id: string;
      customer_name: string;
      customer_email: string | null;
      total_outstanding: string;
      current_amount: string;
      days_1_30_amount: string;
      days_31_60_amount: string;
      days_61_90_amount: string;
      days_over_90_amount: string;
      oldest_order_date: string;
      invoice_count: string;
    }>(sql`
      SELECT
        customer_id,
        customer_name,
        customer_email,
        SUM(balance)::text as total_outstanding,
        COALESCE(SUM(CASE WHEN age <= 0 THEN balance ELSE 0 END), 0)::text as current_amount,
        COALESCE(SUM(CASE WHEN age BETWEEN 1 AND 30 THEN balance ELSE 0 END), 0)::text as days_1_30_amount,
        COALESCE(SUM(CASE WHEN age BETWEEN 31 AND 60 THEN balance ELSE 0 END), 0)::text as days_31_60_amount,
        COALESCE(SUM(CASE WHEN age BETWEEN 61 AND 90 THEN balance ELSE 0 END), 0)::text as days_61_90_amount,
        COALESCE(SUM(CASE WHEN age > 90 THEN balance ELSE 0 END), 0)::text as days_over_90_amount,
        MIN(order_date)::text as oldest_order_date,
        COUNT(*)::text as invoice_count
      FROM (
        SELECT
          o.customer_id,
          c.name as customer_name,
          c.email as customer_email,
          o.order_date,
          COALESCE(o.balance_due, COALESCE(o.total, 0) - COALESCE(o.paid_amount, 0)) as balance,
          EXTRACT(DAY FROM (${asOfDateStr}::date - COALESCE(o.due_date, o.order_date::date + ${PAYMENT_TERMS_DAYS})))::int as age
        FROM orders o
        INNER JOIN customers c ON o.customer_id = c.id
        WHERE o.organization_id = ${ctx.organizationId}
          AND o.deleted_at IS NULL
          AND o.status NOT IN ('draft', 'cancelled')
          AND (
            o.balance_due > 0
            OR (o.balance_due IS NULL AND COALESCE(o.total, 0) > COALESCE(o.paid_amount, 0))
          )
          ${customerFilter}
      ) aged
      WHERE balance > 0 OR ${data.includeZeroBalance ?? false}
      GROUP BY customer_id, customer_name, customer_email
      ${commercialFilter}
      ORDER BY SUM(balance) DESC
    `);

    // Transform customer results
    const customersList: CustomerAgingSummary[] = customerSummaryResult.map((row) => {
      const totalOutstanding = parseFloat(row.total_outstanding);
      return {
        customerId: row.customer_id,
        customerName: row.customer_name ?? 'Unknown',
        customerEmail: row.customer_email,
        isCommercial: totalOutstanding >= COMMERCIAL_THRESHOLD,
        totalOutstanding,
        current: parseFloat(row.current_amount),
        overdue1_30: parseFloat(row.days_1_30_amount),
        overdue31_60: parseFloat(row.days_31_60_amount),
        overdue61_90: parseFloat(row.days_61_90_amount),
        overdue90Plus: parseFloat(row.days_over_90_amount),
        oldestInvoiceDate: row.oldest_order_date ? new Date(row.oldest_order_date) : null,
        invoiceCount: parseInt(row.invoice_count, 10),
      };
    });

    // Calculate totals from bucket summary
    const totalOutstanding = Object.values(bucketTotals).reduce((sum, b) => sum + b.amount, 0);
    const totalCurrent = bucketTotals['current'].amount;
    const totalOverdue =
      bucketTotals['1-30'].amount +
      bucketTotals['31-60'].amount +
      bucketTotals['61-90'].amount +
      bucketTotals['90+'].amount;
    const commercialOutstanding = customersList
      .filter((c) => c.isCommercial)
      .reduce((sum, c) => sum + c.totalOutstanding, 0);
    const invoiceCount = Object.values(bucketTotals).reduce((sum, b) => sum + b.count, 0);

    // Pagination
    const { page, pageSize } = data;
    const totalItems = customersList.length;
    const totalPages = Math.ceil(totalItems / pageSize);
    const offset = (page - 1) * pageSize;
    const paginatedCustomers = customersList.slice(offset, offset + pageSize);

    // Build bucket summary array
    const bucketSummary: AgingBucketSummary[] = [
      { bucket: 'current', ...bucketTotals['current'] },
      { bucket: '1-30', ...bucketTotals['1-30'] },
      { bucket: '31-60', ...bucketTotals['31-60'] },
      { bucket: '61-90', ...bucketTotals['61-90'] },
      { bucket: '90+', ...bucketTotals['90+'] },
    ];

    const result: ARAgingReportResult = {
      bucketSummary,
      totals: {
        totalOutstanding,
        totalCurrent,
        totalOverdue,
        commercialOutstanding,
        invoiceCount,
        customerCount: totalItems,
      },
      customers: paginatedCustomers,
      asOfDate,
      generatedAt: new Date(),
      pagination: {
        page,
        pageSize,
        totalItems,
        totalPages,
      },
    };

    return result;
  });

// ============================================================================
// GET AR AGING CUSTOMER DETAIL
// ============================================================================

/**
 * Get detailed AR aging for a specific customer with invoice drill-down.
 *
 * Returns:
 * - Customer info and summary
 * - List of outstanding invoices with aging details
 * - Supports pagination and bucket filtering
 */
export const getARAgingCustomerDetail = createServerFn()
  .inputValidator(arAgingCustomerDetailQuerySchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth();
    const asOfDate = data.asOfDate ? new Date(data.asOfDate) : new Date();
    const { page, pageSize } = data;
    const offset = (page - 1) * pageSize;

    // Get customer info
    const customerResult = await db
      .select({
        id: customersTable.id,
        name: customersTable.name,
        email: customersTable.email,
      })
      .from(customersTable)
      .where(
        and(
          eq(customersTable.id, data.customerId),
          eq(customersTable.organizationId, ctx.organizationId),
          isNull(customersTable.deletedAt)
        )
      )
      .limit(1);

    if (customerResult.length === 0) {
      throw new Error('Customer not found');
    }

    const customer = customerResult[0];

    // Get all outstanding orders for this customer
    const outstandingOrders = await db
      .select({
        orderId: orders.id,
        orderNumber: orders.orderNumber,
        orderDate: orders.orderDate,
        dueDate: orders.dueDate,
        total: orders.total,
        paidAmount: orders.paidAmount,
        balanceDue: orders.balanceDue,
      })
      .from(orders)
      .where(
        and(
          eq(orders.organizationId, ctx.organizationId),
          eq(orders.customerId, data.customerId),
          isNull(orders.deletedAt),
          ne(orders.status, 'draft'),
          ne(orders.status, 'cancelled'),
          or(
            gt(orders.balanceDue, sql`0`),
            and(
              isNull(orders.balanceDue),
              sql`COALESCE(${orders.total}, 0) > COALESCE(${orders.paidAmount}, 0)`
            )
          )
        )
      );

    // Process into invoice details with aging
    const allInvoices: AgingInvoiceDetail[] = [];
    const customerSummary: CustomerAgingSummary = {
      customerId: customer.id,
      customerName: customer.name ?? 'Unknown',
      customerEmail: customer.email,
      isCommercial: false,
      totalOutstanding: 0,
      current: 0,
      overdue1_30: 0,
      overdue31_60: 0,
      overdue61_90: 0,
      overdue90Plus: 0,
      oldestInvoiceDate: null,
      invoiceCount: 0,
    };

    for (const order of outstandingOrders) {
      // Currency columns are already numbers via numericCasted
      const totalAmount = order.total ?? 0;
      const paidAmount = order.paidAmount ?? 0;
      const balanceDue = order.balanceDue ?? totalAmount - paidAmount;

      if (balanceDue <= 0) continue;

      const effectiveDueDate = getEffectiveDueDate(order.orderDate, order.dueDate);
      const daysOverdue = calculateDaysOverdue(effectiveDueDate, asOfDate);
      const bucket = getAgingBucket(daysOverdue);

      // Filter by bucket if specified
      if (data.bucket && bucket !== data.bucket) {
        continue;
      }

      allInvoices.push({
        orderId: order.orderId,
        orderNumber: order.orderNumber,
        orderDate: new Date(order.orderDate),
        dueDate: effectiveDueDate,
        total: totalAmount,
        paidAmount,
        balanceDue,
        daysOverdue,
        bucket,
      });

      // Update summary
      customerSummary.totalOutstanding += balanceDue;
      customerSummary.invoiceCount += 1;

      switch (bucket) {
        case 'current':
          customerSummary.current += balanceDue;
          break;
        case '1-30':
          customerSummary.overdue1_30 += balanceDue;
          break;
        case '31-60':
          customerSummary.overdue31_60 += balanceDue;
          break;
        case '61-90':
          customerSummary.overdue61_90 += balanceDue;
          break;
        case '90+':
          customerSummary.overdue90Plus += balanceDue;
          break;
      }

      const orderDate = new Date(order.orderDate);
      if (!customerSummary.oldestInvoiceDate || orderDate < customerSummary.oldestInvoiceDate) {
        customerSummary.oldestInvoiceDate = orderDate;
      }
    }

    // Mark as commercial
    customerSummary.isCommercial = customerSummary.totalOutstanding >= COMMERCIAL_THRESHOLD;

    // Sort by days overdue descending (oldest first)
    allInvoices.sort((a, b) => b.daysOverdue - a.daysOverdue);

    // Paginate
    const totalItems = allInvoices.length;
    const totalPages = Math.ceil(totalItems / pageSize);
    const paginatedInvoices = allInvoices.slice(offset, offset + pageSize);

    const result: CustomerAgingDetailResult = {
      customer: {
        id: customer.id,
        name: customer.name ?? 'Unknown',
        email: customer.email,
        isCommercial: customerSummary.isCommercial,
      },
      summary: customerSummary,
      invoices: paginatedInvoices,
      pagination: {
        page,
        pageSize,
        totalItems,
        totalPages,
      },
    };

    return result;
  });
