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
import { eq, and, sql, isNull, gt, gte, lte, ne, desc, asc } from 'drizzle-orm';
import { db } from '@/lib/db';
import { orders, customers as customersTable } from 'drizzle/schema';
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
export const getFinancialDashboardMetrics = createServerFn()
  .inputValidator(financialDashboardQuerySchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth();

    const now = new Date();
    const { start: monthStart, end: monthEnd } = getMonthBounds(now);
    const yearStart = getYearStart(now);

    // Previous month for comparison
    const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

    // Get all orders for calculations
    const allOrders = await db
      .select({
        id: orders.id,
        total: orders.total,
        paidAmount: orders.paidAmount,
        balanceDue: orders.balanceDue,
        taxAmount: orders.taxAmount,
        orderDate: orders.orderDate,
        dueDate: orders.dueDate,
        paymentStatus: orders.paymentStatus,
        status: orders.status,
      })
      .from(orders)
      .where(
        and(
          eq(orders.organizationId, ctx.organizationId),
          isNull(orders.deletedAt),
          ne(orders.status, 'cancelled')
        )
      );

    // Calculate MTD revenue (orders placed this month)
    let revenueMTD = 0;
    let revenuePrevMTD = 0;
    let revenueYTD = 0;
    let cashReceivedMTD = 0;
    let cashReceivedPrevMTD = 0;
    let cashReceivedYTD = 0;
    let gstCollectedMTD = 0;
    let arBalance = 0;
    let overdueAmount = 0;
    let invoiceCount = 0;
    let overdueCount = 0;
    let totalDaysToPayment = 0;
    let paidInvoiceCount = 0;

    for (const order of allOrders) {
      const orderDate = new Date(order.orderDate);
      const dueDate = order.dueDate ? new Date(order.dueDate) : null;
      const daysOverdue = dueDate ? calculateDaysOverdue(dueDate, now) : 0;

      // Revenue calculations (based on order date)
      if (orderDate >= monthStart && orderDate <= monthEnd) {
        revenueMTD += order.total;
        gstCollectedMTD += order.taxAmount ?? order.total * GST_RATE;
      }
      if (orderDate >= prevMonthStart && orderDate <= prevMonthEnd) {
        revenuePrevMTD += order.total;
      }
      if (orderDate >= yearStart && orderDate <= now) {
        revenueYTD += order.total;
      }

      // Cash received (paid amount, approximated by order date for now)
      // In a real system, this would use a payments table with payment dates
      if (orderDate >= monthStart && orderDate <= monthEnd) {
        cashReceivedMTD += order.paidAmount;
      }
      if (orderDate >= prevMonthStart && orderDate <= prevMonthEnd) {
        cashReceivedPrevMTD += order.paidAmount;
      }
      if (orderDate >= yearStart && orderDate <= now) {
        cashReceivedYTD += order.paidAmount;
      }

      // AR and overdue calculations (outstanding balance)
      if (order.balanceDue > 0) {
        arBalance += order.balanceDue;
        invoiceCount++;

        if (daysOverdue > 0) {
          overdueAmount += order.balanceDue;
          overdueCount++;
        }
      }

      // Average days to payment (for fully paid orders)
      if (order.paymentStatus === 'paid' && order.paidAmount > 0) {
        // Estimate days to payment as 15 days (without payment date tracking)
        // In production, this would use actual payment dates
        totalDaysToPayment += 15;
        paidInvoiceCount++;
      }
    }

    const averageDaysToPayment =
      paidInvoiceCount > 0 ? Math.round(totalDaysToPayment / paidInvoiceCount) : 0;

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
export const getRevenueByPeriod = createServerFn()
  .inputValidator(revenueByPeriodQuerySchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth();

    // Get orders with customer type
    const ordersWithCustomers = await db
      .select({
        id: orders.id,
        total: orders.total,
        orderDate: orders.orderDate,
        customerType: customersTable.type,
      })
      .from(orders)
      .innerJoin(customersTable, eq(orders.customerId, customersTable.id))
      .where(
        and(
          eq(orders.organizationId, ctx.organizationId),
          isNull(orders.deletedAt),
          ne(orders.status, 'cancelled'),
          gte(orders.orderDate, data.dateFrom.toISOString().split('T')[0]),
          lte(orders.orderDate, data.dateTo.toISOString().split('T')[0])
        )
      )
      .orderBy(asc(orders.orderDate));

    // Group by period
    const periodMap = new Map<string, RevenuePeriodData>();

    for (const order of ordersWithCustomers) {
      const orderDate = new Date(order.orderDate);
      const periodKey = getPeriodKey(orderDate, data.periodType);
      const periodLabel = getPeriodLabel(orderDate, data.periodType);

      if (!periodMap.has(periodKey)) {
        periodMap.set(periodKey, {
          period: periodKey,
          periodLabel,
          residentialRevenue: 0,
          commercialRevenue: 0,
          totalRevenue: 0,
          invoiceCount: 0,
        });
      }

      const periodData = periodMap.get(periodKey)!;

      // Filter by customer type if specified
      const isRes = isResidential(order.customerType);
      if (data.customerType === 'residential' && !isRes) continue;
      if (data.customerType === 'commercial' && isRes) continue;

      if (isRes) {
        periodData.residentialRevenue += order.total;
      } else {
        periodData.commercialRevenue += order.total;
      }
      periodData.totalRevenue += order.total;
      periodData.invoiceCount++;
    }

    const periods = Array.from(periodMap.values()).sort((a, b) => a.period.localeCompare(b.period));

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
      // ISO week number
      const firstDayOfYear = new Date(year, 0, 1);
      const dayOfYear = Math.ceil((date.getTime() - firstDayOfYear.getTime()) / 86400000);
      const weekNum = Math.ceil((dayOfYear + firstDayOfYear.getDay() + 1) / 7);
      return `${year}-W${String(weekNum).padStart(2, '0')}`;
    case 'monthly':
      return `${year}-${String(month).padStart(2, '0')}`;
    case 'quarterly':
      const quarter = Math.ceil(month / 3);
      return `${year}-Q${quarter}`;
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
      const quarter = Math.ceil((month + 1) / 3);
      return `Q${quarter} ${year}`;
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
export const getTopCustomersByRevenue = createServerFn()
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
      .orderBy(desc(sql`COALESCE(SUM(${orders.total}), 0)`))
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
export const getOutstandingInvoices = createServerFn()
  .inputValidator(outstandingInvoicesQuerySchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth();

    const page = data.page ?? 1;
    const pageSize = data.pageSize ?? 20;
    const offset = (page - 1) * pageSize;
    const now = new Date();

    // Get outstanding orders
    const outstandingOrders = await db
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
      .where(
        and(
          eq(orders.organizationId, ctx.organizationId),
          isNull(orders.deletedAt),
          ne(orders.status, 'cancelled'),
          gt(orders.balanceDue, 0)
        )
      )
      .orderBy(desc(orders.orderDate))
      .limit(pageSize)
      .offset(offset);

    // Process and filter invoices
    const invoices: OutstandingInvoiceEntry[] = [];
    let totalOutstanding = 0;
    let totalOverdue = 0;
    let residentialOutstanding = 0;
    let commercialOutstanding = 0;
    let residentialCount = 0;
    let commercialCount = 0;

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

      // Update totals
      totalOutstanding += order.balanceDue;
      if (isOverdue) totalOverdue += order.balanceDue;

      if (isRes) {
        residentialOutstanding += order.balanceDue;
        residentialCount++;
      } else {
        commercialOutstanding += order.balanceDue;
        commercialCount++;
      }
    }

    // Get total count for pagination
    const countResult = await db
      .select({ count: sql<number>`COUNT(*)::int` })
      .from(orders)
      .where(
        and(
          eq(orders.organizationId, ctx.organizationId),
          isNull(orders.deletedAt),
          ne(orders.status, 'cancelled'),
          gt(orders.balanceDue, 0)
        )
      );

    return {
      invoices,
      summary: {
        totalOutstanding,
        totalOverdue,
        residentialOutstanding,
        commercialOutstanding,
        averageInvoiceValue: invoices.length > 0 ? totalOutstanding / invoices.length : 0,
        averageResidentialValue:
          residentialCount > 0 ? residentialOutstanding / residentialCount : 0,
        averageCommercialValue: commercialCount > 0 ? commercialOutstanding / commercialCount : 0,
      },
      total: countResult[0]?.count ?? 0,
      page,
      pageSize,
    } as OutstandingInvoicesResult;
  });
