/**
 * Email Analytics Schemas
 *
 * Zod validation schemas for email metrics and analytics.
 *
 * @see INT-RES-005
 */

import { z } from "zod";

// ============================================================================
// INPUT SCHEMAS
// ============================================================================

export const emailMetricsFiltersSchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  period: z.enum(["7d", "30d", "90d", "custom"]).optional().default("30d"),
});
export type EmailMetricsFilters = z.infer<typeof emailMetricsFiltersSchema>;

// ============================================================================
// OUTPUT SCHEMAS
// ============================================================================

export const emailMetricsSchema = z.object({
  // Raw counts
  sent: z.number().int().nonnegative(),
  delivered: z.number().int().nonnegative(),
  opened: z.number().int().nonnegative(),
  clicked: z.number().int().nonnegative(),
  bounced: z.number().int().nonnegative(),
  complained: z.number().int().nonnegative(),

  // Rates (as percentages)
  deliveryRate: z.number().nonnegative(),
  openRate: z.number().nonnegative(),
  clickRate: z.number().nonnegative(),
  bounceRate: z.number().nonnegative(),
  complaintRate: z.number().nonnegative(),

  // Period info
  periodStart: z.string(),
  periodEnd: z.string(),
});
export type EmailMetrics = z.infer<typeof emailMetricsSchema>;

export const emailMetricsResultSchema = z.object({
  metrics: emailMetricsSchema,
  comparison: z
    .object({
      sent: z.number(),
      delivered: z.number(),
      opened: z.number(),
      clicked: z.number(),
      bounced: z.number(),
      deliveryRateChange: z.number(),
      openRateChange: z.number(),
    })
    .optional(),
});
export type EmailMetricsResult = z.infer<typeof emailMetricsResultSchema>;
