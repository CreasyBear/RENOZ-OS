/**
 * Targets Validation Schemas
 *
 * Zod schemas for KPI targets CRUD operations.
 * Canonical owner: reports domain.
 * Matches enums from drizzle/schema/reports/targets.ts
 *
 * @see drizzle/schema/reports/targets.ts
 * @see design-patterns.md Section 2 - Zod Schemas
 */

import { z } from 'zod';
import { currencySchema, idParamSchema, paginationSchema } from '../_shared/patterns';
import { cursorPaginationSchema } from '@/lib/db/pagination';

// ============================================================================
// ENUMS (match Drizzle schema enums)
// ============================================================================

/**
 * Target metric types matching targetMetricEnum from Drizzle schema.
 */
export const targetMetricValues = [
  'revenue',
  'kwh_deployed',
  'quote_win_rate',
  'active_installations',
  'warranty_claims',
  'pipeline_value',
  'customer_count',
  'orders_count',
  'average_order_value',
] as const;

export const targetMetricSchema = z.enum(targetMetricValues);

export type TargetMetric = z.infer<typeof targetMetricSchema>;

/**
 * Target period types matching targetPeriodEnum from Drizzle schema.
 */
export const targetPeriodValues = ['weekly', 'monthly', 'quarterly', 'yearly'] as const;

export const targetPeriodSchema = z.enum(targetPeriodValues);

export type TargetPeriod = z.infer<typeof targetPeriodSchema>;

// ============================================================================
// CREATE TARGET
// ============================================================================

export const createTargetSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  metric: targetMetricSchema,
  period: targetPeriodSchema,

  // Date range - YYYY-MM-DD format
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Start date must be in YYYY-MM-DD format'),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'End date must be in YYYY-MM-DD format'),

  // Target value (currency precision for monetary metrics)
  targetValue: currencySchema,

  // Optional description
  description: z.string().max(1000).optional(),
});

export type CreateTargetInput = z.infer<typeof createTargetSchema>;

// ============================================================================
// UPDATE TARGET
// ============================================================================

export const updateTargetSchema = createTargetSchema.partial().extend({
  id: z.string().uuid(),
});

export type UpdateTargetInput = z.infer<typeof updateTargetSchema>;

// ============================================================================
// LIST TARGETS
// ============================================================================

export const listTargetsSchema = paginationSchema.extend({
  metric: targetMetricSchema.optional(),
  period: targetPeriodSchema.optional(),
  startDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  endDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  search: z.string().max(255).optional(),
});

export type ListTargetsInput = z.infer<typeof listTargetsSchema>;

export const listTargetsCursorSchema = cursorPaginationSchema.merge(
  z.object({
    metric: targetMetricSchema.optional(),
    period: targetPeriodSchema.optional(),
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    search: z.string().max(255).optional(),
  })
);
export type ListTargetsCursorInput = z.infer<typeof listTargetsCursorSchema>;

// ============================================================================
// GET TARGET
// ============================================================================

export const getTargetSchema = idParamSchema;

export type GetTargetInput = z.infer<typeof getTargetSchema>;

// ============================================================================
// DELETE TARGET
// ============================================================================

export const deleteTargetSchema = idParamSchema;

export type DeleteTargetInput = z.infer<typeof deleteTargetSchema>;

// ============================================================================
// TARGET OUTPUT
// ============================================================================

export const targetSchema = z.object({
  id: z.string().uuid(),
  organizationId: z.string().uuid(),
  name: z.string(),
  metric: targetMetricSchema,
  period: targetPeriodSchema,
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  targetValue: z.number(),
  description: z.string().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  createdBy: z.string().uuid().nullable(),
  updatedBy: z.string().uuid().nullable(),
});

export type Target = z.infer<typeof targetSchema>;

// ============================================================================
// TARGET PROGRESS
// ============================================================================

export const targetProgressStatusValues = ['on_track', 'behind', 'ahead', 'completed'] as const;

export const targetProgressStatusSchema = z.enum(targetProgressStatusValues);

export type TargetProgressStatus = z.infer<typeof targetProgressStatusSchema>;

export const targetProgressSchema = z.object({
  targetId: z.string().uuid(),
  targetName: z.string(),
  metric: targetMetricSchema,
  period: targetPeriodSchema,
  targetValue: z.number(),
  currentValue: z.number(),
  percentage: z.number().min(0).max(200), // Allow over 100% for overachievement
  status: targetProgressStatusSchema,
  daysRemaining: z.number().int(),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
});

export type TargetProgress = z.infer<typeof targetProgressSchema>;

// ============================================================================
// GET TARGET PROGRESS
// ============================================================================

export const getTargetProgressSchema = z.object({
  metric: targetMetricSchema.optional(),
  period: targetPeriodSchema.optional(),
});

export type GetTargetProgressInput = z.infer<typeof getTargetProgressSchema>;

// ============================================================================
// TARGET PROGRESS RESPONSE
// ============================================================================

export const targetProgressResponseSchema = z.object({
  targets: z.array(targetProgressSchema),
  overall: z.object({
    achieved: z.number().int(),
    total: z.number().int(),
    percentage: z.number().min(0).max(100),
  }),
});

export type TargetProgressResponse = z.infer<typeof targetProgressResponseSchema>;

// ============================================================================
// BULK OPERATIONS
// ============================================================================

export const bulkCreateTargetsSchema = z.object({
  targets: z.array(createTargetSchema).min(1).max(50),
});

export type BulkCreateTargetsInput = z.infer<typeof bulkCreateTargetsSchema>;

export const bulkUpdateTargetsSchema = z.object({
  updates: z.array(updateTargetSchema).min(1).max(50),
});

export type BulkUpdateTargetsInput = z.infer<typeof bulkUpdateTargetsSchema>;

export const bulkDeleteTargetsSchema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(50),
});

export type BulkDeleteTargetsInput = z.infer<typeof bulkDeleteTargetsSchema>;

// ============================================================================
// FILTER STATE
// ============================================================================

export interface TargetsFiltersState {
  metric: TargetMetric | null;
  period: TargetPeriod | null;
  dateFrom: Date | null;
  dateTo: Date | null;
  search: string;
}

export const defaultTargetsFilters: TargetsFiltersState = {
  metric: null,
  period: null,
  dateFrom: null,
  dateTo: null,
  search: '',
};
