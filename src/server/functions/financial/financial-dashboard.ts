/**
 * Financial Dashboard Server Functions
 *
 * Dashboard metrics and chart data queries for battery equipment financial overview.
 * Provides KPIs, revenue breakdowns, top customers, and outstanding invoices.
 *
 * Key metrics:
 * - Revenue MTD/YTD in AUD
 * - AR balance and overdue amounts
 * - Cash received (payments)
 * - GST collected (10% of revenue)
 * - Residential vs commercial breakdown
 *
 * @see _Initiation/_prd/2-domains/financial/financial.prd.json for DOM-FIN-007a
 */

import { createServerFn } from '@tanstack/react-start';
import { eq, and, sql, isNull, gt, gte, lte, ne, desc } from 'drizzle-orm';
import { db } from '@/lib/db';
import { orders, customers as customersTable, orderPayments } from 'drizzle/schema';
import { withAuth } from '@/lib/server/protected';
import {
  financialDashboardQuerySchema,
  revenueByPeriodQuerySchema,
  topCustomersQuerySchema,
  outstandingInvoicesQuerySchema,
  type FinancialDashboardMetrics,
  type KPIMetric,
  type RevenueByPeriodResult,
  type RevenuePeriodData,
  type TopCustomersResult,
  type TopCustomerEntry,
  type OutstandingInvoicesResult,
  type OutstandingInvoiceEntry,
} from '@/lib/schemas';
import { GST_RATE } from '@/lib/order-calculations';

// ============================================================================
// CONSTANTS
// ============================================================================

/** Commercial account threshold in AUD */
const COMMERCIAL_THRESHOLD = 50000;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get start and end of month for a given date.
 */
function getMonthBounds(date: Date): { start: Date; end: Date } {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  return { start, end };
}

/**
 * Get start of year for a given date.
 */
function getYearStart(date: Date): Date {
  return new Date(date.getFullYear(), 0, 1);
}

/**
 * Calculate KPI with comparison.
 */
function calculateKPI(current: number, previous?: number): KPIMetric {
  const metric: KPIMetric = { value: current };

  if (previous !== undefined && previous !== 0) {
    metric.previousValue = previous;
    const change = ((current - previous) / previous) * 100;
    metric.changePercent = Math.round(change * 100) / 100;
    metric.changeDirection = change > 0.5 ? 'up' : change < -0.5 ? 'down' : 'flat';
  }

  return metric;
}

/**
 * Check if customer type is residential (individual) vs commercial (business/gov/non-profit).
 */
function isResidential(customerType: string): boolean {
  return customerType === 'individual';
}

/**
 * Calculate days overdue from due date.
 */
function calculateDaysOverdue(dueDate: Date | null, asOfDate: Date): number {
  if (!dueDate) return 0;
  const diffTime = asOfDate.getTime() - new Date(dueDate).getTime();
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}

// ============================================================================
// GET FINANCIAL DASHBOARD METRICS
// ============================================================================

/**
 * Get comprehensive financial dashboard metrics.
 * Returns KPIs for revenue, AR, payments, and GST.
 */
export const getFinancialDashboardMetrics = createServerFn({ method: 'GET' })
  .inputValidator(financialDashboardQuerySchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth();

    const now = new Date();
    const { start: monthStart, end: monthEnd } = getMonthBounds(now);
    const yearStart = getYearStart(now);
    const periodStart = data.dateFrom ?? monthStart;
    const periodEnd = data.dateTo ?? monthEnd;
    const periodStartStr = periodStart.toISOString().split('T')[0];
    const periodEndStr = periodEnd.toISOString().split('T')[0];

    // Previous month for comparison
    const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
    const monthStartStr = monthStart.toISOString().split('T')[0];
    const monthEndStr = monthEnd.toISOString().split('T')[0];
    const prevMonthStartStr = prevMonthStart.toISOString().split('T')[0];
    const prevMonthEndStr = prevMonthEnd.toISOString().split('T')[0];
    const yearStartStr = yearStart.toISOString().split('T')[0];
    const nowStr = now.toISOString().split('T')[0];

    const getCashReceivedTotal = async (startDate: string, endDate: string): Promise<number> => {
      // Complex aggregation with CASE statement - acceptable use of sql template
      const [result] = await db
        .select({
          total: sql<number>`COALESCE(SUM(CASE WHEN ${orderPayments.isRefund} THEN -${orderPayments.amount} ELSE ${orderPayments.amount} END), 0)`,
        })
        .from(orderPayments)
        .innerJoin(orders, eq(orderPayments.orderId, orders.id))
        .where(
          and(
            eq(orderPayments.organizationId, ctx.organizationId),
            isNull(orderPayments.deletedAt),
            isNull(orders.deletedAt),
            ne(orders.status, 'cancelled'),
            gte(orderPayments.paymentDate, startDate),
            lte(orderPayments.paymentDate, endDate)
          )
        );

      return Number(result?.total ?? 0);
    };

    const cashReceivedMTD = await getCashReceivedTotal(monthStartStr, monthEndStr);
    const cashReceivedPrevMTD = await getCashReceivedTotal(prevMonthStartStr, prevMonthEndStr);
    const cashReceivedYTD = await getCashReceivedTotal(yearStartStr, nowStr);

    // Avg days to payment: CTE for last payment per order, then join with orders
    const paymentSubquery = db.$with('p').as(
      db
        .select({
          orderId: orderPayments.orderId,
          lastPaymentDate: sql<Date>`MAX(${orderPayments.paymentDate})`.as('last_payment_date'),
        })
        .from(orderPayments)
        .where(
          and(
            eq(orderPayments.organizationId, ctx.organizationId),
            isNull(orderPayments.deletedAt),
            eq(orderPayments.isRefund, false)
          )
        )
        .groupBy(orderPayments.orderId)
    );

    const [avgRow] = await db
      .with(paymentSubquery)
      .select({
        avg_days: sql<string>`COALESCE(AVG(EXTRACT(DAY FROM (${paymentSubquery.lastPaymentDate} - ${orders.orderDate}))), 0)::text`,
      })
      .from(paymentSubquery)
      .innerJoin(orders, eq(orders.id, paymentSubquery.orderId))
      .where(
        and(
          eq(orders.organizationId, ctx.organizationId),
          isNull(orders.deletedAt),
          ne(orders.status, 'cancelled'),
          eq(orders.paymentStatus, 'paid'),
          sql`${paymentSubquery.lastPaymentDate} >= ${periodStartStr}::date`,
          sql`${paymentSubquery.lastPaymentDate} <= ${periodEndStr}::date`
        )
      );

    const averageDaysToPayment = Math.round(parseFloat(avgRow?.avg_days ?? '0'));

    // Aggregate all order metrics in a single SQL query using SUM/CASE
    // This replaces fetching all orders and looping in JS
    const baseConditions = and(
      eq(orders.organizationId, ctx.organizationId),
      isNull(orders.deletedAt),
      ne(orders.status, 'cancelled')
    );

    // RAW SQL (Phase 11 Keep): DATE_TRUNC, SUM(CASE WHEN). Drizzle cannot express. See PHASE11-RAW-SQL-AUDIT.md
    const [orderMetrics] = await db
      .select({
        // Revenue by period
        revenueMTD: sql<number>`COALESCE(SUM(CASE WHEN ${orders.orderDate} >= ${monthStartStr} AND ${orders.orderDate} <= ${monthEndStr} THEN ${orders.total} ELSE 0 END), 0)::numeric`,
        revenuePrevMTD: sql<number>`COALESCE(SUM(CASE WHEN ${orders.orderDate} >= ${prevMonthStartStr} AND ${orders.orderDate} <= ${prevMonthEndStr} THEN ${orders.total} ELSE 0 END), 0)::numeric`,
        revenueYTD: sql<number>`COALESCE(SUM(CASE WHEN ${orders.orderDate} >= ${yearStartStr} AND ${orders.orderDate} <= ${nowStr} THEN ${orders.total} ELSE 0 END), 0)::numeric`,
        // GST collected this month
        gstCollectedMTD: sql<number>`COALESCE(SUM(CASE WHEN ${orders.orderDate} >= ${monthStartStr} AND ${orders.orderDate} <= ${monthEndStr} THEN COALESCE(${orders.taxAmount}, ${orders.total} * ${GST_RATE}) ELSE 0 END), 0)::numeric`,
        // AR balance and overdue (orders with outstanding balance)
        arBalance: sql<number>`COALESCE(SUM(CASE WHEN ${orders.balanceDue} > 0 THEN ${orders.balanceDue} ELSE 0 END), 0)::numeric`,
        overdueAmount: sql<number>`COALESCE(SUM(CASE WHEN ${orders.balanceDue} > 0 AND ${orders.dueDate} IS NOT NULL AND ${orders.dueDate}::date < ${nowStr}::date THEN ${orders.balanceDue} ELSE 0 END), 0)::numeric`,
        invoiceCount: sql<number>`SUM(CASE WHEN ${orders.balanceDue} > 0 THEN 1 ELSE 0 END)::int`,
        overdueCount: sql<number>`SUM(CASE WHEN ${orders.balanceDue} > 0 AND ${orders.dueDate} IS NOT NULL AND ${orders.dueDate}::date < ${nowStr}::date THEN 1 ELSE 0 END)::int`,
        // Period invoice metrics
        totalPeriodInvoices: sql<number>`SUM(CASE WHEN ${orders.orderDate} >= ${periodStartStr} AND ${orders.orderDate} <= ${periodEndStr} THEN 1 ELSE 0 END)::int`,
        paidPeriodInvoices: sql<number>`SUM(CASE WHEN ${orders.orderDate} >= ${periodStartStr} AND ${orders.orderDate} <= ${periodEndStr} AND (${orders.paymentStatus} = 'paid' OR COALESCE(${orders.balanceDue}, 0) <= 0) THEN 1 ELSE 0 END)::int`,
        overduePeriodInvoices: sql<number>`SUM(CASE WHEN ${orders.orderDate} >= ${periodStartStr} AND ${orders.orderDate} <= ${periodEndStr} AND ${orders.dueDate} IS NOT NULL AND ${orders.dueDate}::date < ${nowStr}::date AND COALESCE(${orders.balanceDue}, 0) > 0 THEN 1 ELSE 0 END)::int`,
      })
      .from(orders)
      .where(baseConditions);

    const revenueMTD = Number(orderMetrics?.revenueMTD ?? 0);
    const revenuePrevMTD = Number(orderMetrics?.revenuePrevMTD ?? 0);
    const revenueYTD = Number(orderMetrics?.revenueYTD ?? 0);
    const gstCollectedMTD = Number(orderMetrics?.gstCollectedMTD ?? 0);
    const arBalance = Number(orderMetrics?.arBalance ?? 0);
    const overdueAmount = Number(orderMetrics?.overdueAmount ?? 0);
    const invoiceCount = Number(orderMetrics?.invoiceCount ?? 0);
    const overdueCount = Number(orderMetrics?.overdueCount ?? 0);
    const totalPeriodInvoices = Number(orderMetrics?.totalPeriodInvoices ?? 0);
    const paidPeriodInvoices = Number(orderMetrics?.paidPeriodInvoices ?? 0);
    const overduePeriodInvoices = Number(orderMetrics?.overduePeriodInvoices ?? 0);

    const metrics: FinancialDashboardMetrics = {
      revenueMTD: calculateKPI(revenueMTD, data.includePreviousPeriod ? revenuePrevMTD : undefined),
      revenueYTD: calculateKPI(revenueYTD),
      arBalance: calculateKPI(arBalance),
      overdueAmount: calculateKPI(overdueAmount),
      cashReceivedMTD: calculateKPI(
        cashReceivedMTD,
        data.includePreviousPeriod ? cashReceivedPrevMTD : undefined
      ),
      cashReceivedYTD: calculateKPI(cashReceivedYTD),
      gstCollectedMTD: calculateKPI(gstCollectedMTD),
      invoiceCount,
      overdueCount,
      averageDaysToPayment,
      paymentRate: totalPeriodInvoices > 0 ? paidPeriodInvoices / totalPeriodInvoices : 0,
      overdueRate: totalPeriodInvoices > 0 ? overduePeriodInvoices / totalPeriodInvoices : 0,
      periodStart: data.dateFrom ?? monthStart,
      periodEnd: data.dateTo ?? monthEnd,
    };

    return metrics;
  });

// ============================================================================
// GET REVENUE BY PERIOD
// ============================================================================

/**
 * Get revenue breakdown by period for charts.
 * Supports daily, weekly, monthly, quarterly, yearly periods.
 * Breaks down by residential vs commercial customers.
 */
export const getRevenueByPeriod = createServerFn({ method: 'GET' })
  .inputValidator(revenueByPeriodQuerySchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth();

    // Build customer type filter if specified
    const customerTypeConditions: ReturnType<typeof eq>[] = [];
    if (data.customerType === 'residential') {
      customerTypeConditions.push(eq(customersTable.type, 'individual'));
    } else if (data.customerType === 'commercial') {
      customerTypeConditions.push(ne(customersTable.type, 'individual'));
    }

    // Determine SQL DATE_TRUNC interval and format from periodType
    const truncInterval =
      data.periodType === 'daily' ? 'day'
      : data.periodType === 'weekly' ? 'week'
      : data.periodType === 'quarterly' ? 'quarter'
      : data.periodType === 'yearly' ? 'year'
      : 'month';

    // Raw SQL justified: DATE_TRUNC + TO_CHAR + SUM(CASE WHEN type) for period breakdown.
    // Drizzle doesn't provide DATE_TRUNC/period grouping abstractions.
    const results = await db
      .select({
        period: sql<string>`TO_CHAR(DATE_TRUNC(${truncInterval}, ${orders.orderDate}::date), 'YYYY-MM-DD')`,
        residentialRevenue: sql<number>`COALESCE(SUM(CASE WHEN ${customersTable.type} = 'individual' THEN ${orders.total} ELSE 0 END), 0)::numeric`,
        commercialRevenue: sql<number>`COALESCE(SUM(CASE WHEN ${customersTable.type} != 'individual' THEN ${orders.total} ELSE 0 END), 0)::numeric`,
        totalRevenue: sql<number>`COALESCE(SUM(${orders.total}), 0)::numeric`,
        invoiceCount: sql<number>`COUNT(*)::int`,
      })
      .from(orders)
      .innerJoin(customersTable, eq(orders.customerId, customersTable.id))
      .where(
        and(
          eq(orders.organizationId, ctx.organizationId),
          isNull(orders.deletedAt),
          ne(orders.status, 'cancelled'),
          gte(orders.orderDate, data.dateFrom.toISOString().split('T')[0]),
          lte(orders.orderDate, data.dateTo.toISOString().split('T')[0]),
          ...customerTypeConditions
        )
      )
      .groupBy(sql`DATE_TRUNC(${truncInterval}, ${orders.orderDate}::date)`)
      .orderBy(sql`DATE_TRUNC(${truncInterval}, ${orders.orderDate}::date)`)
      .limit(500);

    const periods: RevenuePeriodData[] = results.map((r) => {
      const date = new Date(r.period);
      return {
        period: getPeriodKey(date, data.periodType),
        periodLabel: getPeriodLabel(date, data.periodType),
        residentialRevenue: Number(r.residentialRevenue),
        commercialRevenue: Number(r.commercialRevenue),
        totalRevenue: Number(r.totalRevenue),
        invoiceCount: r.invoiceCount,
      };
    });

    const totals = periods.reduce(
      (acc, p) => ({
        residentialRevenue: acc.residentialRevenue + p.residentialRevenue,
        commercialRevenue: acc.commercialRevenue + p.commercialRevenue,
        totalRevenue: acc.totalRevenue + p.totalRevenue,
      }),
      { residentialRevenue: 0, commercialRevenue: 0, totalRevenue: 0 }
    );

    return { periods, totals } as RevenueByPeriodResult;
  });

/**
 * Get period key for grouping.
 */
function getPeriodKey(date: Date, periodType: string): string {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();

  switch (periodType) {
    case 'daily':
      return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    case 'weekly':
      {
        // ISO week number
        const firstDayOfYear = new Date(year, 0, 1);
        const dayOfYear = Math.ceil((date.getTime() - firstDayOfYear.getTime()) / 86400000);
        const weekNum = Math.ceil((dayOfYear + firstDayOfYear.getDay() + 1) / 7);
        return `${year}-W${String(weekNum).padStart(2, '0')}`;
      }
    case 'monthly':
      return `${year}-${String(month).padStart(2, '0')}`;
    case 'quarterly':
      {
        const quarter = Math.ceil(month / 3);
        return `${year}-Q${quarter}`;
      }
    case 'yearly':
      return `${year}`;
    default:
      return `${year}-${String(month).padStart(2, '0')}`;
  }
}

/**
 * Get human-readable period label.
 */
function getPeriodLabel(date: Date, periodType: string): string {
  const monthNames = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];
  const year = date.getFullYear();
  const month = date.getMonth();

  switch (periodType) {
    case 'daily':
      return `${monthNames[month].slice(0, 3)} ${date.getDate()}, ${year}`;
    case 'weekly':
      return `Week of ${monthNames[month].slice(0, 3)} ${date.getDate()}`;
    case 'monthly':
      return `${monthNames[month]} ${year}`;
    case 'quarterly':
      {
        const quarter = Math.ceil((month + 1) / 3);
        return `Q${quarter} ${year}`;
      }
    case 'yearly':
      return `${year}`;
    default:
      return `${monthNames[month]} ${year}`;
  }
}

// ============================================================================
// GET TOP CUSTOMERS BY REVENUE
// ============================================================================

/**
 * Get top customers by total revenue.
 * Highlights commercial accounts ($50K+).
 */
export const getTopCustomersByRevenue = createServerFn({ method: 'GET' })
  .inputValidator(topCustomersQuerySchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth();

    const page = data.page ?? 1;
    const pageSize = data.pageSize ?? 10;
    const offset = (page - 1) * pageSize;

    // Build date filter conditions
    const dateConditions: ReturnType<typeof eq>[] = [];
    if (data.dateFrom) {
      dateConditions.push(gte(orders.orderDate, data.dateFrom.toISOString().split('T')[0]));
    }
    if (data.dateTo) {
      dateConditions.push(lte(orders.orderDate, data.dateTo.toISOString().split('T')[0]));
    }

    // Get customer revenue aggregates
    const customerRevenue = await db
      .select({
        customerId: customersTable.id,
        customerName: customersTable.name,
        customerType: customersTable.type,
        totalRevenue: sql<number>`COALESCE(SUM(${orders.total}), 0)::numeric`,
        invoiceCount: sql<number>`COUNT(${orders.id})::int`,
        paidAmount: sql<number>`COALESCE(SUM(${orders.paidAmount}), 0)::numeric`,
        outstandingAmount: sql<number>`COALESCE(SUM(${orders.balanceDue}), 0)::numeric`,
        lastOrderDate: sql<Date | null>`MAX(${orders.orderDate})`,
      })
      .from(customersTable)
      .leftJoin(
        orders,
        and(
          eq(orders.customerId, customersTable.id),
          isNull(orders.deletedAt),
          ne(orders.status, 'cancelled'),
          ...dateConditions
        )
      )
      .where(
        and(eq(customersTable.organizationId, ctx.organizationId), isNull(customersTable.deletedAt))
      )
      .groupBy(customersTable.id, customersTable.name, customersTable.type)
      .orderBy(desc(sql`COALESCE(SUM(${orders.total}), 0)`)) // Complex aggregation - acceptable use of sql template
      .limit(pageSize)
      .offset(offset);

    // Get total count
    const countResult = await db
      .select({ count: sql<number>`COUNT(DISTINCT ${customersTable.id})::int` })
      .from(customersTable)
      .where(
        and(eq(customersTable.organizationId, ctx.organizationId), isNull(customersTable.deletedAt))
      );

    const customers: TopCustomerEntry[] = customerRevenue
      .filter((c) => !data.commercialOnly || Number(c.totalRevenue) >= COMMERCIAL_THRESHOLD)
      .map((c) => ({
        customerId: c.customerId,
        customerName: c.customerName,
        customerType: c.customerType,
        isCommercial: Number(c.totalRevenue) >= COMMERCIAL_THRESHOLD,
        totalRevenue: Number(c.totalRevenue),
        invoiceCount: c.invoiceCount,
        paidAmount: Number(c.paidAmount),
        outstandingAmount: Number(c.outstandingAmount),
        lastOrderDate: c.lastOrderDate,
      }));

    return {
      customers,
      total: countResult[0]?.count ?? 0,
      page,
      pageSize,
    } as TopCustomersResult;
  });

// ============================================================================
// GET OUTSTANDING INVOICES
// ============================================================================

/**
 * Get outstanding invoices with summary statistics.
 * Shows invoices with balance due, optionally filtered by overdue status.
 */
export const getOutstandingInvoices = createServerFn({ method: 'GET' })
  .inputValidator(outstandingInvoicesQuerySchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth();

    const page = data.page ?? 1;
    const pageSize = data.pageSize ?? 20;
    const offset = (page - 1) * pageSize;
    const now = new Date();

    // Base conditions for outstanding invoices
    const outstandingConditions = [
      eq(orders.organizationId, ctx.organizationId),
      isNull(orders.deletedAt),
      ne(orders.status, 'cancelled'),
      gt(orders.balanceDue, 0),
    ];

    // Run paginated data query and unpaginated summary query in parallel.
    // The summary must aggregate across ALL matching rows, not just the current page.
    const [outstandingOrders, summaryResult, countResult] = await Promise.all([
      db
        .select({
          orderId: orders.id,
          orderNumber: orders.orderNumber,
          customerId: customersTable.id,
          customerName: customersTable.name,
          customerType: customersTable.type,
          orderDate: orders.orderDate,
          dueDate: orders.dueDate,
          total: orders.total,
          paidAmount: orders.paidAmount,
          balanceDue: orders.balanceDue,
        })
        .from(orders)
        .innerJoin(customersTable, eq(orders.customerId, customersTable.id))
        .where(and(...outstandingConditions))
        .orderBy(desc(orders.orderDate))
        .limit(pageSize)
        .offset(offset),
      // Separate SUM query without LIMIT/OFFSET for accurate summary totals
      db
        .select({
          totalOutstanding: sql<number>`COALESCE(SUM(${orders.balanceDue}), 0)::numeric`,
          totalOverdue: sql<number>`COALESCE(SUM(CASE WHEN ${orders.dueDate} IS NOT NULL AND ${orders.dueDate}::date < ${now.toISOString().split('T')[0]}::date THEN ${orders.balanceDue} ELSE 0 END), 0)::numeric`,
          residentialOutstanding: sql<number>`COALESCE(SUM(CASE WHEN ${customersTable.type} = 'individual' THEN ${orders.balanceDue} ELSE 0 END), 0)::numeric`,
          commercialOutstanding: sql<number>`COALESCE(SUM(CASE WHEN ${customersTable.type} != 'individual' THEN ${orders.balanceDue} ELSE 0 END), 0)::numeric`,
          residentialCount: sql<number>`SUM(CASE WHEN ${customersTable.type} = 'individual' THEN 1 ELSE 0 END)::int`,
          commercialCount: sql<number>`SUM(CASE WHEN ${customersTable.type} != 'individual' THEN 1 ELSE 0 END)::int`,
          totalCount: sql<number>`COUNT(*)::int`,
        })
        .from(orders)
        .innerJoin(customersTable, eq(orders.customerId, customersTable.id))
        .where(and(...outstandingConditions)),
      // Count for pagination
      db
        .select({ count: sql<number>`COUNT(*)::int` })
        .from(orders)
        .where(and(...outstandingConditions)),
    ]);

    // Process invoices for the current page
    const invoices: OutstandingInvoiceEntry[] = [];

    for (const order of outstandingOrders) {
      const dueDate = order.dueDate ? new Date(order.dueDate) : null;
      const daysOverdue = calculateDaysOverdue(dueDate, now);
      const isOverdue = daysOverdue > 0;
      const isRes = isResidential(order.customerType);
      const isCommercialOrder = order.total >= COMMERCIAL_THRESHOLD;

      // Apply filters
      if (data.overdueOnly && !isOverdue) continue;
      if (data.customerType === 'residential' && !isRes) continue;
      if (data.customerType === 'commercial' && isRes) continue;

      invoices.push({
        orderId: order.orderId,
        orderNumber: order.orderNumber,
        customerId: order.customerId,
        customerName: order.customerName,
        customerType: order.customerType,
        orderDate: new Date(order.orderDate),
        dueDate,
        daysOverdue,
        total: order.total,
        paidAmount: order.paidAmount,
        balanceDue: order.balanceDue,
        isOverdue,
        isCommercial: isCommercialOrder,
      });
    }

    // Use summary from the unpaginated query for accurate totals
    const summary = summaryResult[0];
    const totalOutstanding = Number(summary?.totalOutstanding ?? 0);
    const totalOverdue = Number(summary?.totalOverdue ?? 0);
    const residentialOutstanding = Number(summary?.residentialOutstanding ?? 0);
    const commercialOutstanding = Number(summary?.commercialOutstanding ?? 0);
    const residentialCount = Number(summary?.residentialCount ?? 0);
    const commercialCount = Number(summary?.commercialCount ?? 0);
    const totalInvoiceCount = Number(summary?.totalCount ?? 0);

    return {
      invoices,
      summary: {
        totalOutstanding,
        totalOverdue,
        residentialOutstanding,
        commercialOutstanding,
        averageInvoiceValue: totalInvoiceCount > 0 ? totalOutstanding / totalInvoiceCount : 0,
        averageResidentialValue:
          residentialCount > 0 ? residentialOutstanding / residentialCount : 0,
        averageCommercialValue: commercialCount > 0 ? commercialOutstanding / commercialCount : 0,
      },
      total: countResult[0]?.count ?? 0,
      page,
      pageSize,
    } as OutstandingInvoicesResult;
  });
