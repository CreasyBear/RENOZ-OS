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
import { eq, and, sql, isNull } from 'drizzle-orm';
import { db } from '@/lib/db';
import { safeNumber } from '@/lib/numeric';
import { customers as customersTable } from 'drizzle/schema';
import { withAuth } from '@/lib/server/protected';
import { NotFoundError } from '@/lib/server/errors';
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

// ============================================================================
// CONSTANTS
// ============================================================================

/** Commercial account threshold in AUD */
const COMMERCIAL_THRESHOLD = 50000;

/** Payment terms in days (standard 30-day terms) */
const PAYMENT_TERMS_DAYS = 30;


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

    // RAW SQL (Phase 11 Keep): CTEs, EXTRACT, bucket aggregations. Drizzle cannot express. See PHASE11-RAW-SQL-AUDIT.md
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
        amount: safeNumber(bucketRow?.current_amount),
        count: Math.floor(safeNumber(bucketRow?.current_count)),
      },
      '1-30': {
        amount: safeNumber(bucketRow?.days_1_30_amount),
        count: Math.floor(safeNumber(bucketRow?.days_1_30_count)),
      },
      '31-60': {
        amount: safeNumber(bucketRow?.days_31_60_amount),
        count: Math.floor(safeNumber(bucketRow?.days_31_60_count)),
      },
      '61-90': {
        amount: safeNumber(bucketRow?.days_61_90_amount),
        count: Math.floor(safeNumber(bucketRow?.days_61_90_count)),
      },
      '90+': {
        amount: safeNumber(bucketRow?.days_over_90_amount),
        count: Math.floor(safeNumber(bucketRow?.days_over_90_count)),
      },
    };

    // Query 2: Get customer-level aggregation using SQL GROUP BY
    // This groups and sums per customer in the database
    const commercialFilter = data.commercialOnly
      ? sql`HAVING SUM(balance) >= ${COMMERCIAL_THRESHOLD}`
      : sql``;

    const { page, pageSize } = data;
    const offset = (page - 1) * pageSize;

    // Common subquery for customer aggregation (used by both COUNT and main query)
    const customerAggregateCte = sql`
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
    `;

    // Query 2a: COUNT for pagination (SQL-level)
    const countResult = await db.execute<{ total: string }>(sql`
      SELECT COUNT(*)::text as total
      FROM (
        SELECT 1
        FROM (${customerAggregateCte}) aged
        WHERE balance > 0 OR ${data.includeZeroBalance ?? false}
        GROUP BY customer_id, customer_name, customer_email
        ${commercialFilter}
      ) counted
    `);
    const totalItems = Math.floor(safeNumber(countResult[0]?.total));

    // Query 2b: Customer-level aggregation with SQL-level LIMIT/OFFSET
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
      FROM (${customerAggregateCte}) aged
      WHERE balance > 0 OR ${data.includeZeroBalance ?? false}
      GROUP BY customer_id, customer_name, customer_email
      ${commercialFilter}
      ORDER BY SUM(balance) DESC
      LIMIT ${pageSize} OFFSET ${offset}
    `);

    const paginatedCustomers: CustomerAgingSummary[] = customerSummaryResult.map((row) => {
      const totalOutstanding = safeNumber(row.total_outstanding);
      return {
        customerId: row.customer_id,
        customerName: row.customer_name ?? 'Unknown',
        customerEmail: row.customer_email,
        isCommercial: totalOutstanding >= COMMERCIAL_THRESHOLD,
        totalOutstanding,
        current: safeNumber(row.current_amount),
        overdue1_30: safeNumber(row.days_1_30_amount),
        overdue31_60: safeNumber(row.days_31_60_amount),
        overdue61_90: safeNumber(row.days_61_90_amount),
        overdue90Plus: safeNumber(row.days_over_90_amount),
        oldestInvoiceDate: row.oldest_order_date ? new Date(row.oldest_order_date) : null,
        invoiceCount: Math.floor(safeNumber(row.invoice_count)),
      };
    });

    // Query 2c: Commercial total (sum of outstanding for customers >= threshold)
    const commercialResult = await db.execute<{ commercial_total: string }>(sql`
      SELECT COALESCE(SUM(total_outstanding), 0)::text as commercial_total
      FROM (
        SELECT SUM(balance) as total_outstanding
        FROM (${customerAggregateCte}) aged
        WHERE balance > 0 OR ${data.includeZeroBalance ?? false}
        GROUP BY customer_id, customer_name, customer_email
        HAVING SUM(balance) >= ${COMMERCIAL_THRESHOLD}
      ) commercial
    `);
    const commercialOutstanding = safeNumber(commercialResult[0]?.commercial_total);

    // Calculate totals from bucket summary
    const totalOutstanding = Object.values(bucketTotals).reduce((sum, b) => sum + b.amount, 0);
    const totalCurrent = bucketTotals['current'].amount;
    const totalOverdue =
      bucketTotals['1-30'].amount +
      bucketTotals['31-60'].amount +
      bucketTotals['61-90'].amount +
      bucketTotals['90+'].amount;
    const invoiceCount = Object.values(bucketTotals).reduce((sum, b) => sum + b.count, 0);

    const totalPages = Math.ceil(totalItems / pageSize);

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
 *
 * Uses SQL aggregation for efficient summary calculation instead of
 * in-memory processing.
 */
export const getARAgingCustomerDetail = createServerFn()
  .inputValidator(arAgingCustomerDetailQuerySchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth();
    const asOfDate = data.asOfDate ? new Date(data.asOfDate) : new Date();
    const asOfDateStr = asOfDate.toISOString().split('T')[0]; // YYYY-MM-DD format
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
      throw new NotFoundError('Customer not found', 'customer');
    }

    const customer = customerResult[0];

    // Build bucket filter for SQL
    const bucketFilter = data.bucket
      ? data.bucket === 'current'
        ? sql`AND age <= 0`
        : data.bucket === '1-30'
          ? sql`AND age BETWEEN 1 AND 30`
          : data.bucket === '31-60'
            ? sql`AND age BETWEEN 31 AND 60`
            : data.bucket === '61-90'
              ? sql`AND age BETWEEN 61 AND 90`
              : sql`AND age > 90`
      : sql``;

    // Query 1: Get summary using SQL aggregation
    // Complex CTE with CASE aggregations - acceptable use of raw SQL for complex reporting queries
    const summaryResult = await db.execute<{
      total_outstanding: string;
      current_amount: string;
      days_1_30_amount: string;
      days_31_60_amount: string;
      days_61_90_amount: string;
      days_over_90_amount: string;
      oldest_order_date: string | null;
      invoice_count: string;
    }>(sql`
      SELECT
        COALESCE(SUM(balance), 0)::text as total_outstanding,
        COALESCE(SUM(CASE WHEN age <= 0 THEN balance ELSE 0 END), 0)::text as current_amount,
        COALESCE(SUM(CASE WHEN age BETWEEN 1 AND 30 THEN balance ELSE 0 END), 0)::text as days_1_30_amount,
        COALESCE(SUM(CASE WHEN age BETWEEN 31 AND 60 THEN balance ELSE 0 END), 0)::text as days_31_60_amount,
        COALESCE(SUM(CASE WHEN age BETWEEN 61 AND 90 THEN balance ELSE 0 END), 0)::text as days_61_90_amount,
        COALESCE(SUM(CASE WHEN age > 90 THEN balance ELSE 0 END), 0)::text as days_over_90_amount,
        MIN(order_date)::text as oldest_order_date,
        COUNT(*)::text as invoice_count
      FROM (
        SELECT
          o.order_date,
          COALESCE(o.balance_due, COALESCE(o.total, 0) - COALESCE(o.paid_amount, 0)) as balance,
          EXTRACT(DAY FROM (${asOfDateStr}::date - COALESCE(o.due_date, o.order_date::date + ${PAYMENT_TERMS_DAYS})))::int as age
        FROM orders o
        WHERE o.organization_id = ${ctx.organizationId}
          AND o.customer_id = ${data.customerId}
          AND o.deleted_at IS NULL
          AND o.status NOT IN ('draft', 'cancelled')
          AND (
            o.balance_due > 0
            OR (o.balance_due IS NULL AND COALESCE(o.total, 0) > COALESCE(o.paid_amount, 0))
          )
      ) aged
      WHERE balance > 0
    `);

    const summaryRow = summaryResult[0];
    const totalOutstanding = safeNumber(summaryRow?.total_outstanding);

    const customerSummary: CustomerAgingSummary = {
      customerId: customer.id,
      customerName: customer.name ?? 'Unknown',
      customerEmail: customer.email,
      isCommercial: totalOutstanding >= COMMERCIAL_THRESHOLD,
      totalOutstanding,
      current: safeNumber(summaryRow?.current_amount),
      overdue1_30: safeNumber(summaryRow?.days_1_30_amount),
      overdue31_60: safeNumber(summaryRow?.days_31_60_amount),
      overdue61_90: safeNumber(summaryRow?.days_61_90_amount),
      overdue90Plus: safeNumber(summaryRow?.days_over_90_amount),
      oldestInvoiceDate: summaryRow?.oldest_order_date
        ? new Date(summaryRow.oldest_order_date)
        : null,
      invoiceCount: Math.floor(safeNumber(summaryRow?.invoice_count)),
    };

    // Query 2: Get paginated invoice details with bucket filtering
    const invoicesResult = await db.execute<{
      order_id: string;
      order_number: string;
      order_date: string;
      due_date: string;
      total: string;
      paid_amount: string;
      balance_due: string;
      days_overdue: string;
      bucket: string;
    }>(sql`
      SELECT
        order_id,
        order_number,
        order_date,
        due_date,
        total::text,
        paid_amount::text,
        balance_due::text,
        age as days_overdue,
        CASE
          WHEN age <= 0 THEN 'current'
          WHEN age BETWEEN 1 AND 30 THEN '1-30'
          WHEN age BETWEEN 31 AND 60 THEN '31-60'
          WHEN age BETWEEN 61 AND 90 THEN '61-90'
          ELSE '90+'
        END as bucket
      FROM (
        SELECT
          o.id as order_id,
          o.order_number,
          o.order_date,
          COALESCE(o.due_date, o.order_date::date + ${PAYMENT_TERMS_DAYS}) as due_date,
          COALESCE(o.total, 0) as total,
          COALESCE(o.paid_amount, 0) as paid_amount,
          COALESCE(o.balance_due, COALESCE(o.total, 0) - COALESCE(o.paid_amount, 0)) as balance_due,
          EXTRACT(DAY FROM (${asOfDateStr}::date - COALESCE(o.due_date, o.order_date::date + ${PAYMENT_TERMS_DAYS})))::int as age
        FROM orders o
        WHERE o.organization_id = ${ctx.organizationId}
          AND o.customer_id = ${data.customerId}
          AND o.deleted_at IS NULL
          AND o.status NOT IN ('draft', 'cancelled')
          AND (
            o.balance_due > 0
            OR (o.balance_due IS NULL AND COALESCE(o.total, 0) > COALESCE(o.paid_amount, 0))
          )
      ) aged
      WHERE balance_due > 0
        ${bucketFilter}
      ORDER BY age DESC
      LIMIT ${pageSize}
      OFFSET ${offset}
    `);

    // Get total count for pagination (with bucket filter)
    const countResult = await db.execute<{ count: string }>(sql`
      SELECT COUNT(*)::text as count
      FROM (
        SELECT
          COALESCE(o.balance_due, COALESCE(o.total, 0) - COALESCE(o.paid_amount, 0)) as balance_due,
          EXTRACT(DAY FROM (${asOfDateStr}::date - COALESCE(o.due_date, o.order_date::date + ${PAYMENT_TERMS_DAYS})))::int as age
        FROM orders o
        WHERE o.organization_id = ${ctx.organizationId}
          AND o.customer_id = ${data.customerId}
          AND o.deleted_at IS NULL
          AND o.status NOT IN ('draft', 'cancelled')
          AND (
            o.balance_due > 0
            OR (o.balance_due IS NULL AND COALESCE(o.total, 0) > COALESCE(o.paid_amount, 0))
          )
      ) aged
      WHERE balance_due > 0
        ${bucketFilter}
    `);

    const totalItems = Math.floor(safeNumber(countResult[0]?.count));
    const totalPages = Math.ceil(totalItems / pageSize);

    // Transform invoice results
    const invoices: AgingInvoiceDetail[] = invoicesResult.map((row) => ({
      orderId: row.order_id,
      orderNumber: row.order_number,
      orderDate: new Date(row.order_date),
      dueDate: new Date(row.due_date),
      total: safeNumber(row.total),
      paidAmount: safeNumber(row.paid_amount),
      balanceDue: safeNumber(row.balance_due),
      daysOverdue: Math.floor(safeNumber(row.days_overdue)),
      bucket: row.bucket as AgingBucket,
    }));

    const result: CustomerAgingDetailResult = {
      customer: {
        id: customer.id,
        name: customer.name ?? 'Unknown',
        email: customer.email,
        isCommercial: customerSummary.isCommercial,
      },
      summary: customerSummary,
      invoices,
      pagination: {
        page,
        pageSize,
        totalItems,
        totalPages,
      },
    };

    return result;
  });
