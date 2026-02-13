/**
 * Metrics Schemas
 *
 * Zod schemas for metric definitions and validation.
 * Follows STANDARDS.md barrel export pattern.
 *
 * @see src/lib/metrics/registry.ts
 */

import { z } from 'zod';
import { METRICS, type MetricId } from '@/lib/metrics/registry';

// ============================================================================
// METRIC ID SCHEMA
// ============================================================================

/**
 * Schema for validating metric IDs.
 * Uses registry to ensure only valid metric IDs are accepted.
 */
export const metricIdSchema = z.string().refine(
  (id): id is MetricId => {
    return id in METRICS;
  },
  {
    message: 'Invalid metric ID',
  }
);

export type MetricIdInput = z.infer<typeof metricIdSchema>;

// ============================================================================
// METRIC DEFINITION SCHEMA
// ============================================================================

export const metricDefinitionSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  aggregation: z.enum(['SUM', 'COUNT', 'AVG', 'SPECIAL']),
  table: z.enum(['orders', 'customers', 'opportunities', 'warranties', 'warrantyClaims', 'slaTracking']),
  field: z.string(),
  dateField: z.string(),
  baseFilters: z.record(z.string(), z.unknown()),
  unit: z.enum(['currency', 'count', 'percentage']),
  requiresDateRange: z.boolean(),
});

export type MetricDefinitionInput = z.infer<typeof metricDefinitionSchema>;

// ============================================================================
// METRIC CALCULATION INPUT
// ============================================================================

export const metricCalculationInputSchema = z.object({
  organizationId: z.string().uuid(),
  metricId: metricIdSchema,
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  additionalFilters: z.record(z.string(), z.unknown()).optional(),
});

export type MetricCalculationInput = z.infer<typeof metricCalculationInputSchema>;

// ============================================================================
// METRIC CALCULATION RESULT
// ============================================================================

export const metricCalculationResultSchema = z.object({
  value: z.number(),
  metricId: z.string(),
  calculatedAt: z.date(),
});

export type MetricCalculationResult = z.infer<typeof metricCalculationResultSchema>;

// ============================================================================
// MULTIPLE METRICS CALCULATION INPUT
// ============================================================================

export const metricsCalculationInputSchema = z.object({
  organizationId: z.string().uuid(),
  metricIds: z.array(metricIdSchema).min(1),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  additionalFilters: z.record(z.string(), z.unknown()).optional(),
});

export type MetricsCalculationInput = z.infer<typeof metricsCalculationInputSchema>;
