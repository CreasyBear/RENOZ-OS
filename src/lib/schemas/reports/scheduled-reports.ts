/**
 * Scheduled Reports Validation Schemas
 *
 * Zod schemas for scheduled reports CRUD operations.
 * Canonical owner: reports domain.
 * Matches enums from drizzle/schema/reports/scheduled-reports.ts
 *
 * @see drizzle/schema/reports/scheduled-reports.ts
 * @see design-patterns.md Section 2 - Zod Schemas
 */

import { z } from 'zod';
import { idParamSchema, paginationSchema } from '../_shared/patterns';

// ============================================================================
// ENUMS (match Drizzle schema enums)
// ============================================================================

/**
 * Report frequency types matching reportFrequencyEnum from Drizzle schema.
 */
export const reportFrequencyValues = [
  'daily',
  'weekly',
  'biweekly',
  'monthly',
  'quarterly',
] as const;

export const reportFrequencySchema = z.enum(reportFrequencyValues);

export type ReportFrequency = z.infer<typeof reportFrequencySchema>;

/**
 * Report format types matching reportFormatEnum from Drizzle schema.
 */
export const reportFormatValues = ['pdf', 'csv', 'xlsx', 'html'] as const;

export const reportFormatSchema = z.enum(reportFormatValues);

export type ReportFormat = z.infer<typeof reportFormatSchema>;

// ============================================================================
// REPORT RECIPIENTS (matches JSONB type from Drizzle schema)
// ============================================================================

export const reportRecipientsSchema = z.object({
  emails: z.array(z.string().email()).min(1, 'At least one email recipient is required'),
  userIds: z.array(z.string().uuid()).default([]),
});

export type ReportRecipients = z.infer<typeof reportRecipientsSchema>;

// ============================================================================
// REPORT METRICS (matches JSONB type from Drizzle schema)
// ============================================================================

export const reportComparisonPeriodValues = ['previous_period', 'previous_year', 'none'] as const;

export const reportComparisonPeriodSchema = z.enum(reportComparisonPeriodValues);

export const reportMetricsSchema = z.object({
  metrics: z
    .array(z.string())
    .min(1, 'At least one metric is required')
    .max(20, 'Maximum 20 metrics per report'),
  includeCharts: z.boolean().default(true),
  includeTrends: z.boolean().default(true),
  comparisonPeriod: reportComparisonPeriodSchema.default('previous_period'),
});

export type ReportMetrics = z.infer<typeof reportMetricsSchema>;

// ============================================================================
// CREATE SCHEDULED REPORT
// ============================================================================

export const createScheduledReportSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  description: z.string().max(1000).optional(),

  // Schedule frequency
  frequency: reportFrequencySchema,

  // Report configuration
  format: reportFormatSchema.default('pdf'),
  isActive: z.boolean().default(true),

  // Recipients
  recipients: reportRecipientsSchema,

  // Metrics to include
  metrics: reportMetricsSchema,
});

export type CreateScheduledReportInput = z.infer<typeof createScheduledReportSchema>;

// ============================================================================
// UPDATE SCHEDULED REPORT
// ============================================================================

export const updateScheduledReportSchema = createScheduledReportSchema.partial().extend({
  id: z.string().uuid(),
});

export type UpdateScheduledReportInput = z.infer<typeof updateScheduledReportSchema>;

// ============================================================================
// LIST SCHEDULED REPORTS
// ============================================================================

export const listScheduledReportsSchema = paginationSchema.extend({
  isActive: z.boolean().optional(),
  frequency: reportFrequencySchema.optional(),
  format: reportFormatSchema.optional(),
  search: z.string().max(255).optional(),
});

export type ListScheduledReportsInput = z.infer<typeof listScheduledReportsSchema>;

// ============================================================================
// GET SCHEDULED REPORT
// ============================================================================

export const getScheduledReportSchema = idParamSchema;

export type GetScheduledReportInput = z.infer<typeof getScheduledReportSchema>;

// ============================================================================
// DELETE SCHEDULED REPORT
// ============================================================================

export const deleteScheduledReportSchema = idParamSchema;

export type DeleteScheduledReportInput = z.infer<typeof deleteScheduledReportSchema>;

// ============================================================================
// EXECUTE SCHEDULED REPORT
// ============================================================================

export const executeScheduledReportSchema = z.object({
  id: z.string().uuid(),
  // Optional override for schedule
  overrideSchedule: z.boolean().default(false),
});

export type ExecuteScheduledReportInput = z.infer<typeof executeScheduledReportSchema>;

// ============================================================================
// SCHEDULED REPORT OUTPUT
// ============================================================================

export const scheduledReportSchema = z.object({
  id: z.string().uuid(),
  organizationId: z.string().uuid(),
  name: z.string(),
  description: z.string().nullable(),
  frequency: reportFrequencySchema,
  format: reportFormatSchema,
  isActive: z.boolean(),
  lastRunAt: z.coerce.date().nullable(),
  nextRunAt: z.coerce.date().nullable(),
  recipients: reportRecipientsSchema,
  metrics: reportMetricsSchema,
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  createdBy: z.string().uuid().nullable(),
  updatedBy: z.string().uuid().nullable(),
});

export type ScheduledReport = z.infer<typeof scheduledReportSchema>;

// ============================================================================
// SCHEDULED REPORT STATUS
// ============================================================================

export const reportRunStatusValues = ['success', 'failed', 'running', 'pending'] as const;

export const reportRunStatusSchema = z.enum(reportRunStatusValues);

export type ReportRunStatus = z.infer<typeof reportRunStatusSchema>;

export const scheduledReportStatusSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  isActive: z.boolean(),
  lastRunAt: z.coerce.date().nullable(),
  nextRunAt: z.coerce.date().nullable(),
  lastRunStatus: reportRunStatusSchema.nullable(),
  lastRunMessage: z.string().nullable(),
});

export type ScheduledReportStatus = z.infer<typeof scheduledReportStatusSchema>;

// ============================================================================
// GENERATE REPORT (on-demand)
// ============================================================================

export const generateReportSchema = z.object({
  metrics: z.array(z.string()).min(1).max(20),
  dateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  dateTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  format: reportFormatSchema.default('pdf'),
  includeCharts: z.boolean().default(true),
  includeTrends: z.boolean().default(true),
});

export type GenerateReportInput = z.infer<typeof generateReportSchema>;

export const generateReportResponseSchema = z.object({
  reportUrl: z.string().url(),
  expiresAt: z.coerce.date(),
  format: reportFormatSchema,
});

export type GenerateReportResponse = z.infer<typeof generateReportResponseSchema>;

// ============================================================================
// BULK OPERATIONS
// ============================================================================

export const bulkUpdateScheduledReportsSchema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(50),
  updates: z.object({
    isActive: z.boolean().optional(),
    frequency: reportFrequencySchema.optional(),
    format: reportFormatSchema.optional(),
    recipients: reportRecipientsSchema.optional(),
  }),
});

export type BulkUpdateScheduledReportsInput = z.infer<typeof bulkUpdateScheduledReportsSchema>;

export const bulkDeleteScheduledReportsSchema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(50),
});

export type BulkDeleteScheduledReportsInput = z.infer<typeof bulkDeleteScheduledReportsSchema>;

// ============================================================================
// FILTER STATE
// ============================================================================

export interface ScheduledReportsFiltersState {
  isActive: boolean | null;
  frequency: ReportFrequency | null;
  format: ReportFormat | null;
  search: string;
}

export const defaultScheduledReportsFilters: ScheduledReportsFiltersState = {
  isActive: null,
  frequency: null,
  format: null,
  search: '',
};
