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
 */
export const getARAgingReport = createServerFn()
  .inputValidator(arAgingReportQuerySchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth();
    const asOfDate = data.asOfDate ? new Date(data.asOfDate) : new Date();

    // Build base query conditions
    const conditions = [
      eq(orders.organizationId, ctx.organizationId),
      isNull(orders.deletedAt),
      // Only include orders with outstanding balance
      // (balanceDue > 0 or balanceDue is null and total > paidAmount)
      or(
        gt(orders.balanceDue, sql`0`),
        and(
          isNull(orders.balanceDue),
          sql`COALESCE(${orders.total}, 0) > COALESCE(${orders.paidAmount}, 0)`
        )
      ),
      // Exclude draft and cancelled orders
      ne(orders.status, 'draft'),
      ne(orders.status, 'cancelled'),
    ];

    // Filter by specific customer if provided
    if (data.customerId) {
      conditions.push(eq(orders.customerId, data.customerId));
    }

    // Get all outstanding orders with customer info
    const outstandingOrders = await db
      .select({
        orderId: orders.id,
        orderNumber: orders.orderNumber,
        orderDate: orders.orderDate,
        dueDate: orders.dueDate,
        total: orders.total,
        paidAmount: orders.paidAmount,
        balanceDue: orders.balanceDue,
        customerId: orders.customerId,
        customerName: customersTable.name,
        customerEmail: customersTable.email,
      })
      .from(orders)
      .innerJoin(customersTable, eq(orders.customerId, customersTable.id))
      .where(and(...conditions));

    // Process orders into aging buckets
    const bucketTotals: Record<AgingBucket, { amount: number; count: number }> = {
      current: { amount: 0, count: 0 },
      '1-30': { amount: 0, count: 0 },
      '31-60': { amount: 0, count: 0 },
      '61-90': { amount: 0, count: 0 },
      '90+': { amount: 0, count: 0 },
    };

    const customerMap = new Map<string, CustomerAgingSummary>();

    for (const order of outstandingOrders) {
      // Calculate balance due (currency columns are already numbers via numericCasted)
      const totalAmount = order.total ?? 0;
      const paidAmount = order.paidAmount ?? 0;
      const balanceDue = order.balanceDue ?? totalAmount - paidAmount;

      if (balanceDue <= 0 && !data.includeZeroBalance) {
        continue;
      }

      // Calculate days overdue
      const effectiveDueDate = getEffectiveDueDate(order.orderDate, order.dueDate);
      const daysOverdue = calculateDaysOverdue(effectiveDueDate, asOfDate);
      const bucket = getAgingBucket(daysOverdue);

      // Update bucket totals
      bucketTotals[bucket].amount += balanceDue;
      bucketTotals[bucket].count += 1;

      // Update customer summary
      let customerSummary = customerMap.get(order.customerId);
      if (!customerSummary) {
        customerSummary = {
          customerId: order.customerId,
          customerName: order.customerName ?? 'Unknown',
          customerEmail: order.customerEmail,
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
        customerMap.set(order.customerId, customerSummary);
      }

      customerSummary.totalOutstanding += balanceDue;
      customerSummary.invoiceCount += 1;

      // Update bucket-specific amounts
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

      // Track oldest invoice
      const orderDate = new Date(order.orderDate);
      if (!customerSummary.oldestInvoiceDate || orderDate < customerSummary.oldestInvoiceDate) {
        customerSummary.oldestInvoiceDate = orderDate;
      }

      // Mark as commercial if over threshold
      if (customerSummary.totalOutstanding >= COMMERCIAL_THRESHOLD) {
        customerSummary.isCommercial = true;
      }
    }

    // Convert to arrays and filter
    let customersList: CustomerAgingSummary[] = Array.from(customerMap.values());

    // Filter commercial only if requested
    if (data.commercialOnly) {
      customersList = customersList.filter((c) => c.isCommercial);
    }

    // Sort by total outstanding descending (highest first)
    customersList.sort((a, b) => b.totalOutstanding - a.totalOutstanding);

    // Calculate totals (before pagination, for accurate totals)
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
