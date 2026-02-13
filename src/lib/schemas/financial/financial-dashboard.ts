/**
 * Financial Dashboard Zod Schemas
 *
 * Validation schemas for financial dashboard metrics and chart data.
 * Provides KPIs, period breakdowns, and customer analytics for battery equipment sales.
 *
 * @see _Initiation/_prd/2-domains/financial/financial.prd.json for DOM-FIN-007a
 */

import { z } from 'zod';
import { paginationSchema } from '../_shared/patterns';

// ============================================================================
// PERIOD ENUM
// ============================================================================

export const periodTypeValues = ['daily', 'weekly', 'monthly', 'quarterly', 'yearly'] as const;

export const periodTypeSchema = z.enum(periodTypeValues);

export type PeriodType = z.infer<typeof periodTypeSchema>;

// ============================================================================
// DASHBOARD METRICS QUERY
// ============================================================================

/**
 * Query parameters for financial dashboard metrics.
 */
export const financialDashboardQuerySchema = z.object({
  // Date range for metrics (defaults to current month)
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),

  // Compare to previous period
  includePreviousPeriod: z.boolean().default(false),
});

export type FinancialDashboardQuery = z.infer<typeof financialDashboardQuerySchema>;

// ============================================================================
// REVENUE BY PERIOD QUERY
// ============================================================================

/**
 * Query parameters for revenue by period chart data.
 */
export const revenueByPeriodQuerySchema = z.object({
  dateFrom: z.coerce.date(),
  dateTo: z.coerce.date(),
  periodType: periodTypeSchema.default('monthly'),

  // Optionally filter by customer type
  customerType: z.enum(['residential', 'commercial', 'all']).default('all'),
});

export type RevenueByPeriodQuery = z.infer<typeof revenueByPeriodQuerySchema>;

// ============================================================================
// TOP CUSTOMERS QUERY
// ============================================================================

/**
 * Query parameters for top customers by revenue.
 */
export const topCustomersQuerySchema = paginationSchema.extend({
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),

  // Only show commercial accounts ($50K+)
  commercialOnly: z.boolean().default(false),
});

export type TopCustomersQuery = z.infer<typeof topCustomersQuerySchema>;

// ============================================================================
// OUTSTANDING INVOICES QUERY
// ============================================================================

/**
 * Query parameters for outstanding invoices summary.
 */
export const outstandingInvoicesQuerySchema = paginationSchema.extend({
  // Filter by overdue status
  overdueOnly: z.boolean().default(false),

  // Filter by customer type
  customerType: z.enum(['residential', 'commercial', 'all']).default('all'),
});

export type OutstandingInvoicesQuery = z.infer<typeof outstandingInvoicesQuerySchema>;

// ============================================================================
// RESPONSE TYPES
// ============================================================================

/**
 * KPI metric with optional comparison.
 */
export interface KPIMetric {
  value: number;
  previousValue?: number;
  changePercent?: number;
  changeDirection?: 'up' | 'down' | 'flat';
}

/**
 * Financial dashboard KPIs.
 */
export interface FinancialDashboardMetrics {
  // Revenue metrics
  revenueMTD: KPIMetric; // Month-to-date revenue in AUD
  revenueYTD: KPIMetric; // Year-to-date revenue

  // Receivables metrics
  arBalance: KPIMetric; // Total accounts receivable
  overdueAmount: KPIMetric; // Total overdue (past due date)

  // Payment metrics
  cashReceivedMTD: KPIMetric; // Payments received this month
  cashReceivedYTD: KPIMetric; // Payments received this year

  // Tax metrics
  gstCollectedMTD: KPIMetric; // GST collected this month (10% of revenue)

  // Summary stats
  invoiceCount: number; // Total outstanding invoices
  overdueCount: number; // Number of overdue invoices
  averageDaysToPayment: number; // Average days from invoice to payment
  paymentRate: number; // Paid invoices / total invoices in period (0-1)
  overdueRate: number; // Overdue invoices / total invoices in period (0-1)

  // Period info
  periodStart: Date;
  periodEnd: Date;
}

/**
 * Revenue data point for charts.
 */
export interface RevenuePeriodData {
  period: string; // e.g., "2026-01", "2026-Q1"
  periodLabel: string; // e.g., "January 2026", "Q1 2026"
  residentialRevenue: number; // Revenue from individual customers
  commercialRevenue: number; // Revenue from business/gov/non-profit customers
  totalRevenue: number;
  invoiceCount: number;
}

/**
 * Revenue by period response.
 */
export interface RevenueByPeriodResult {
  periods: RevenuePeriodData[];
  totals: {
    residentialRevenue: number;
    commercialRevenue: number;
    totalRevenue: number;
  };
}

/**
 * Top customer entry.
 */
export interface TopCustomerEntry {
  customerId: string;
  customerName: string;
  customerType: string; // individual, business, government, non_profit
  isCommercial: boolean; // $50K+ total
  totalRevenue: number; // Total revenue from this customer
  invoiceCount: number;
  paidAmount: number;
  outstandingAmount: number;
  lastOrderDate: Date | null;
}

/**
 * Top customers response.
 */
export interface TopCustomersResult {
  customers: TopCustomerEntry[];
  total: number;
  page: number;
  pageSize: number;
}

/**
 * Outstanding invoice entry.
 */
export interface OutstandingInvoiceEntry {
  orderId: string;
  orderNumber: string;
  customerId: string;
  customerName: string;
  customerType: string;
  orderDate: Date;
  dueDate: Date | null;
  daysOverdue: number; // Negative if not yet due
  total: number;
  paidAmount: number;
  balanceDue: number;
  isOverdue: boolean;
  isCommercial: boolean; // $50K+ order
}

/**
 * Outstanding invoices response.
 */
export interface OutstandingInvoicesResult {
  invoices: OutstandingInvoiceEntry[];
  summary: {
    totalOutstanding: number;
    totalOverdue: number;
    residentialOutstanding: number;
    commercialOutstanding: number;
    averageInvoiceValue: number;
    averageResidentialValue: number;
    averageCommercialValue: number;
  };
  total: number;
  page: number;
  pageSize: number;
}
