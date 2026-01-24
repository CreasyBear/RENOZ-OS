/**
 * Job Costing Zod Schemas
 *
 * Validation schemas for job costing calculations and reports.
 * Covers material costs, labor costs, and profitability analysis.
 *
 * @see src/server/functions/job-costing.ts
 * @see _Initiation/_prd/2-domains/jobs/jobs.prd.json - DOM-JOBS-008a
 */

import { z } from 'zod';

// ============================================================================
// COST BREAKDOWN SCHEMAS
// ============================================================================

/**
 * Material cost breakdown for a job.
 */
export const materialCostSchema = z.object({
  productId: z.string().uuid(),
  productName: z.string(),
  productSku: z.string().nullable(),
  unitCost: z.number(),
  quantityUsed: z.number(),
  totalCost: z.number(),
});

export type MaterialCost = z.infer<typeof materialCostSchema>;

/**
 * Labor cost breakdown for a job.
 */
export const laborCostSchema = z.object({
  userId: z.string().uuid(),
  userName: z.string(),
  hoursWorked: z.number(),
  hourlyRate: z.number(),
  totalCost: z.number(),
});

export type LaborCost = z.infer<typeof laborCostSchema>;

// ============================================================================
// CALCULATE JOB COST
// ============================================================================

export const calculateJobCostSchema = z.object({
  jobId: z.string().uuid(),
  /** Optional labor rate override (defaults to organization setting or $75/hr) */
  laborRateOverride: z.number().positive().optional(),
});

export type CalculateJobCostInput = z.infer<typeof calculateJobCostSchema>;

export const jobCostResultSchema = z.object({
  jobId: z.string().uuid(),
  materialCost: z.number(),
  laborCost: z.number(),
  totalCost: z.number(),
  materials: z.array(materialCostSchema),
  labor: z.array(laborCostSchema),
});

export type JobCostResult = z.infer<typeof jobCostResultSchema>;

// ============================================================================
// GET JOB PROFITABILITY
// ============================================================================

export const getJobProfitabilitySchema = z.object({
  jobId: z.string().uuid(),
  laborRateOverride: z.number().positive().optional(),
});

export type GetJobProfitabilityInput = z.infer<typeof getJobProfitabilitySchema>;

export const jobProfitabilityResultSchema = z.object({
  jobId: z.string().uuid(),
  jobNumber: z.string(),
  jobTitle: z.string(),
  customerName: z.string(),
  jobType: z.string(),
  status: z.string(),
  /** Quoted amount from the linked order */
  quotedAmount: z.number(),
  /** Actual total cost (materials + labor) */
  actualCost: z.number(),
  /** Material cost breakdown */
  materialCost: z.number(),
  /** Labor cost breakdown */
  laborCost: z.number(),
  /** Gross profit (quoted - actual cost) */
  profit: z.number(),
  /** Profit margin as percentage (profit / quoted * 100) */
  marginPercent: z.number(),
  /** Profitability status */
  profitabilityStatus: z.enum(['profitable', 'break_even', 'loss']),
});

export type JobProfitabilityResult = z.infer<typeof jobProfitabilityResultSchema>;

// ============================================================================
// GET JOB COSTING REPORT
// ============================================================================

export const getJobCostingReportSchema = z.object({
  /** Date range filter */
  dateFrom: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(), // YYYY-MM-DD format
  dateTo: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  /** Customer filter */
  customerId: z.string().uuid().optional(),
  /** Job type filter */
  jobType: z
    .enum(['installation', 'service', 'warranty', 'inspection', 'commissioning'])
    .optional(),
  /** Job status filter */
  status: z.enum(['scheduled', 'in_progress', 'completed', 'cancelled', 'on_hold']).optional(),
  /** Labor rate for calculations */
  laborRateOverride: z.number().positive().optional(),
  /** Pagination */
  limit: z.number().int().min(1).max(100).default(50),
  offset: z.number().int().min(0).default(0),
});

export type GetJobCostingReportInput = z.infer<typeof getJobCostingReportSchema>;

export const jobCostingReportResultSchema = z.object({
  /** List of jobs with profitability data */
  jobs: z.array(jobProfitabilityResultSchema),
  /** Summary statistics */
  summary: z.object({
    totalJobs: z.number(),
    totalQuoted: z.number(),
    totalActualCost: z.number(),
    totalMaterialCost: z.number(),
    totalLaborCost: z.number(),
    totalProfit: z.number(),
    averageMarginPercent: z.number(),
    profitableCount: z.number(),
    breakEvenCount: z.number(),
    lossCount: z.number(),
  }),
  /** Pagination info */
  pagination: z.object({
    total: z.number(),
    limit: z.number(),
    offset: z.number(),
    hasMore: z.boolean(),
  }),
});

export type JobCostingReportResult = z.infer<typeof jobCostingReportResultSchema>;
