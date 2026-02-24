/**
 * Financial Summary Report Schemas
 *
 * Validation schemas for the Financial Summary report.
 * Aggregates KPIs, revenue trends, and cash flow from the financial domain.
 *
 * @see reports_domain_remediation Phase 6
 * @see src/server/functions/reports/financial-summary.ts
 */

import { z } from 'zod';

// ============================================================================
// INPUT
// ============================================================================

export const financialSummarySearchSchema = z.object({
  dateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  dateTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  periodType: z.enum(['daily', 'weekly', 'monthly', 'quarterly', 'yearly']).default('monthly'),
});

export type FinancialSummarySearchParams = z.infer<typeof financialSummarySearchSchema>;

export const getFinancialSummaryReportSchema = z.object({
  dateFrom: z.coerce.date(),
  dateTo: z.coerce.date(),
  periodType: z.enum(['daily', 'weekly', 'monthly', 'quarterly', 'yearly']).default('monthly'),
});

export type GetFinancialSummaryReportInput = z.infer<typeof getFinancialSummaryReportSchema>;

// ============================================================================
// OUTPUT
// ============================================================================

export const financialSummaryTrendPointSchema = z.object({
  period: z.string(),
  periodLabel: z.string(),
  totalRevenue: z.number(),
  cashRevenue: z.number().optional(),
  residentialRevenue: z.number(),
  commercialRevenue: z.number(),
  invoiceCount: z.number(),
});

export type FinancialSummaryTrendPoint = z.infer<typeof financialSummaryTrendPointSchema>;

export const financialSummaryCashFlowSchema = z.object({
  cashReceived: z.number(),
  arBalance: z.number(),
  overdueAmount: z.number(),
  invoiceCount: z.number(),
  overdueCount: z.number(),
});

export type FinancialSummaryCashFlow = z.infer<typeof financialSummaryCashFlowSchema>;

export const financialSummaryReportSchema = z.object({
  kpis: z.object({
    revenue: z.number(),
    revenuePrev: z.number().optional(),
    revenueChangePercent: z.number().optional(),
    arBalance: z.number(),
    overdueAmount: z.number(),
    cashReceived: z.number(),
    gstCollected: z.number(),
  }),
  trends: z.array(financialSummaryTrendPointSchema),
  cashFlow: financialSummaryCashFlowSchema,
  periodStart: z.coerce.date(),
  periodEnd: z.coerce.date(),
});

export type FinancialSummaryReport = z.infer<typeof financialSummaryReportSchema>;

// ============================================================================
// EXPORT
// ============================================================================

export const generateFinancialSummaryReportSchema = z.object({
  dateFrom: z.coerce.date(),
  dateTo: z.coerce.date(),
  format: z.enum(['csv', 'pdf', 'xlsx']),
});

export type GenerateFinancialSummaryReportInput = z.infer<
  typeof generateFinancialSummaryReportSchema
>;
