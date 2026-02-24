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
 * Revenue basis for top customers: invoiced (orders) or cash (payments received).
 * Single source of truth for default - used by schema and server.
 */
export const DEFAULT_REVENUE_BASIS = 'invoiced' as const;

export const revenueBasisSchema = z.enum(['invoiced', 'cash']).default(DEFAULT_REVENUE_BASIS);

export type RevenueBasis = z.infer<typeof revenueBasisSchema>;

/**
 * Query parameters for top customers by revenue.
 */
export const topCustomersQuerySchema = paginationSchema.extend({
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),

  // Only show commercial accounts ($50K+)
  commercialOnly: z.boolean().default(false),

  // Revenue basis: invoiced (orders by orderDate) or cash (payments by paymentDate)
  basis: revenueBasisSchema,
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
 * Dual-metrics: Revenue (Invoiced) = orders by orderDate; Revenue (Cash) = payments by paymentDate.
 */
export interface FinancialDashboardMetrics {
  // Revenue metrics (invoiced = orders placed; cash = payments received)
  revenueMTD: KPIMetric; // Month-to-date revenue in AUD (invoiced) - deprecated, use revenueInvoicedMTD
  revenueYTD: KPIMetric; // Year-to-date revenue (invoiced) - deprecated, use revenueInvoicedYTD
  revenueInvoicedMTD: KPIMetric; // Month-to-date invoiced revenue (orders by orderDate)
  revenueInvoicedYTD: KPIMetric; // Year-to-date invoiced revenue
  revenueCashMTD: KPIMetric; // Month-to-date cash revenue (payments by paymentDate)
  revenueCashYTD: KPIMetric; // Year-to-date cash revenue

  // Receivables metrics
  arBalance: KPIMetric; // Total accounts receivable
  overdueAmount: KPIMetric; // Total overdue (past due date)

  // Payment metrics (aliases for revenueCash for backward compat)
  cashReceivedMTD: KPIMetric; // Payments received this month (= revenueCashMTD)
  cashReceivedYTD: KPIMetric; // Payments received this year (= revenueCashYTD)

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
 * Dual-metrics: totalRevenue = invoiced; cashRevenue = payments received.
 */
export interface RevenuePeriodData {
  period: string; // e.g., "2026-01", "2026-Q1"
  periodLabel: string; // e.g., "January 2026", "Q1 2026"
  residentialRevenue: number; // Invoiced revenue from individual customers
  commercialRevenue: number; // Invoiced revenue from business/gov/non-profit customers
  totalRevenue: number; // Invoiced (orders by orderDate)
  cashRevenue: number; // Cash received (payments by paymentDate)
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
    cashRevenue: number;
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
 * Aggregated dashboard data from parallel queries.
 * Used by FinancialDashboard presenter.
 */
export interface FinancialDashboardData {
  /** @source useQuery(['financial-dashboard-metrics']) */
  metrics?: FinancialDashboardMetrics;
  /** @source useQuery(['revenue-by-period', periodType]) */
  revenueByPeriod?: RevenueByPeriodResult;
  /** @source useQuery(['top-customers']) */
  topCustomers?: TopCustomersResult;
  /** @source useQuery(['outstanding-invoices']) */
  outstanding?: OutstandingInvoicesResult;
}

/**
 * Revenue chart basis: invoiced (orders) or cash (payments).
 */
export type RevenueChartBasis = 'invoiced' | 'cash';

/**
 * Props for RevenueChart component (financial dashboard).
 */
export interface RevenueChartProps {
  periods: RevenuePeriodData[];
  basis: RevenueChartBasis;
  onBasisChange: (basis: RevenueChartBasis) => void;
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

/**
 * Close readiness guard result for finance period close and release gating.
 */
export interface FinancialCloseReadiness {
  isReady: boolean;
  blockingReasons: string[];
  generatedAt: string;
  gates: {
    stockWithoutActiveLayers: number;
    rowsValueMismatch: number;
    layerNegativeOrOverconsumed: number;
    duplicateActiveSerializedAllocations: number;
    shipmentLinkNotShippedOrReturned: number;
  };
  totals: {
    totalAbsValueDrift: number;
  };
}
