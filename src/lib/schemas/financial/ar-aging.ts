/**
 * AR Aging Report Zod Schemas
 *
 * Validation schemas for accounts receivable aging report operations.
 * AR aging tracks outstanding invoices by how overdue they are (based on 30-day payment terms).
 *
 * @see _Initiation/_prd/2-domains/financial/financial.prd.json for DOM-FIN-003a
 */

import { z } from 'zod';
import { idSchema, paginationSchema } from '../_shared/patterns';

// ============================================================================
// AGING BUCKET ENUM
// ============================================================================

export const agingBucketValues = [
  'current', // Within 30-day payment terms
  '1-30', // 1-30 days overdue
  '31-60', // 31-60 days overdue
  '61-90', // 61-90 days overdue
  '90+', // 90+ days overdue
] as const;

export const agingBucketSchema = z.enum(agingBucketValues);

export type AgingBucket = z.infer<typeof agingBucketSchema>;

// ============================================================================
// AR AGING REPORT QUERY
// ============================================================================

/**
 * Query parameters for getting AR aging report.
 * Includes pagination to prevent loading all outstanding orders at once.
 */
export const arAgingReportQuerySchema = paginationSchema
  .extend({
    // Filter by specific customer
    customerId: idSchema.optional(),

    // Only show high-value commercial accounts ($50K+)
    commercialOnly: z.boolean().default(false),

    // Include zero-balance customers (paid in full)
    includeZeroBalance: z.boolean().default(false),

    // As of date (defaults to today) - for historical aging snapshots
    asOfDate: z.coerce.date().optional(),
  })
  .transform((data) => ({
    ...data,
    // Override default pageSize for AR reports (can be larger since it's a report)
    pageSize: data.pageSize ?? 100,
  }));

export type ARAgingReportQuery = z.infer<typeof arAgingReportQuerySchema>;

// ============================================================================
// AR AGING CUSTOMER DETAIL QUERY
// ============================================================================

/**
 * Query parameters for getting detailed AR aging for a specific customer.
 */
export const arAgingCustomerDetailQuerySchema = paginationSchema.extend({
  customerId: idSchema,

  // Filter by specific aging bucket
  bucket: agingBucketSchema.optional(),

  // As of date (defaults to today)
  asOfDate: z.coerce.date().optional(),
});

export type ARAgingCustomerDetailQuery = z.infer<typeof arAgingCustomerDetailQuerySchema>;

// ============================================================================
// RESPONSE TYPES (for documentation/client typing)
// ============================================================================

/**
 * Summary totals per aging bucket.
 */
export interface AgingBucketSummary {
  bucket: AgingBucket;
  amount: number;
  count: number;
}

/**
 * Customer summary in AR aging report.
 */
export interface CustomerAgingSummary {
  customerId: string;
  customerName: string;
  customerEmail: string | null;
  isCommercial: boolean; // $50K+ outstanding
  totalOutstanding: number;
  current: number;
  overdue1_30: number;
  overdue31_60: number;
  overdue61_90: number;
  overdue90Plus: number;
  oldestInvoiceDate: Date | null;
  invoiceCount: number;
}

/**
 * Invoice detail for drill-down.
 */
export interface AgingInvoiceDetail {
  orderId: string;
  orderNumber: string;
  orderDate: Date;
  dueDate: Date;
  total: number;
  paidAmount: number;
  balanceDue: number;
  daysOverdue: number;
  bucket: AgingBucket;
}

/**
 * Full AR aging report result.
 */
export interface ARAgingReportResult {
  // Summary totals by bucket
  bucketSummary: AgingBucketSummary[];

  // Total AR metrics
  totals: {
    totalOutstanding: number;
    totalCurrent: number;
    totalOverdue: number;
    commercialOutstanding: number; // $50K+ accounts
    invoiceCount: number;
    customerCount: number;
  };

  // Customer breakdown (paginated)
  customers: CustomerAgingSummary[];

  // Report metadata
  asOfDate: Date;
  generatedAt: Date;

  // Pagination info
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
}

/**
 * Customer detail drill-down result.
 */
export interface CustomerAgingDetailResult {
  customer: {
    id: string;
    name: string;
    email: string | null;
    isCommercial: boolean;
  };
  summary: CustomerAgingSummary;
  invoices: AgingInvoiceDetail[];
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
}
