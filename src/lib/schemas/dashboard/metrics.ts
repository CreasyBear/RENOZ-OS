/**
 * Dashboard Metrics Validation Schemas
 *
 * Zod schemas for dashboard metrics API operations.
 *
 * @see drizzle/schema/dashboard/
 * @see design-patterns.md Section 2 - Zod Schemas
 */

import { z } from 'zod';

// ============================================================================
// DATE RANGE PRESETS
// ============================================================================

export const dateRangePresetValues = [
  '7d',
  '30d',
  '90d',
  '365d',
  'this_week',
  'this_month',
  'this_quarter',
  'ytd',
  'custom',
] as const;

export const dateRangePresetSchema = z.enum(dateRangePresetValues);

export type DateRangePreset = z.infer<typeof dateRangePresetSchema>;

// ============================================================================
// COMPARISON TYPES
// ============================================================================

export const comparisonTypeValues = ['previous_period', 'previous_year', 'none'] as const;

export const comparisonTypeSchema = z.enum(comparisonTypeValues);

export type ComparisonType = z.infer<typeof comparisonTypeSchema>;

// ============================================================================
// METRIC KEYS (matches targetMetricEnum from Drizzle schema)
// ============================================================================

export const metricKeyValues = [
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

export const metricKeySchema = z.enum(metricKeyValues);

export type MetricKey = z.infer<typeof metricKeySchema>;

// ============================================================================
// GET DASHBOARD METRICS
// ============================================================================

export const getDashboardMetricsSchema = z.object({
  dateFrom: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format')
    .optional(),
  dateTo: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format')
    .optional(),
  preset: dateRangePresetSchema.optional(),
  comparePeriod: comparisonTypeSchema.optional(),
});

export type GetDashboardMetricsInput = z.infer<typeof getDashboardMetricsSchema>;

// ============================================================================
// METRIC VALUE (shared type for all metrics)
// ============================================================================

export const metricValueSchema = z.object({
  current: z.number(),
  change: z.number(), // Percentage change from previous period
  changeAbsolute: z.number().optional(), // Absolute change value
  target: z.number().nullable(), // Target value if set
  targetProgress: z.number().nullable(), // Progress toward target (0-100+)
});

export type MetricValue = z.infer<typeof metricValueSchema>;

// ============================================================================
// DASHBOARD SUMMARY
// ============================================================================

export const dashboardSummarySchema = z.object({
  revenue: metricValueSchema,
  kwhDeployed: metricValueSchema,
  quoteWinRate: metricValueSchema,
  activeInstallations: metricValueSchema,
  warrantyClaims: metricValueSchema,
  pipelineValue: metricValueSchema,
  customerCount: metricValueSchema,
  ordersCount: metricValueSchema,
  averageOrderValue: metricValueSchema.optional(),
});

export type DashboardSummary = z.infer<typeof dashboardSummarySchema>;

// ============================================================================
// CHART DATA
// ============================================================================

export const chartDataPointSchema = z.object({
  date: z.string(), // YYYY-MM-DD or month label
  value: z.number(),
  label: z.string().optional(),
});

export type ChartDataPoint = z.infer<typeof chartDataPointSchema>;

export const chartDataSchema = z.object({
  label: z.string(),
  data: z.array(chartDataPointSchema),
  color: z.string().optional(),
});

export type ChartData = z.infer<typeof chartDataSchema>;

// ============================================================================
// DASHBOARD CHARTS
// ============================================================================

export const dashboardChartsSchema = z.object({
  revenueTrend: z.array(chartDataPointSchema),
  kwhDeploymentTrend: z.array(chartDataPointSchema),
  productMix: z.array(chartDataPointSchema),
  pipelineByStage: z.array(chartDataPointSchema),
  quoteConversionFunnel: z.array(chartDataPointSchema),
  warrantyClaimsByType: z.array(chartDataPointSchema).optional(),
});

export type DashboardCharts = z.infer<typeof dashboardChartsSchema>;

// ============================================================================
// ACTIVITY ITEM
// ============================================================================

export const activityTypeValues = [
  'quote',
  'installation',
  'warranty',
  'opportunity',
  'customer',
  'order',
  'job',
] as const;

export const activityTypeSchema = z.enum(activityTypeValues);

export type ActivityType = z.infer<typeof activityTypeSchema>;

export const activityItemSchema = z.object({
  id: z.string().uuid(),
  type: activityTypeSchema,
  title: z.string(),
  description: z.string().nullable(),
  entityId: z.string().uuid(),
  entityType: z.string(),
  userId: z.string().uuid().nullable(),
  userName: z.string().nullable(),
  createdAt: z.coerce.date(),
  // Omit metadata from schema to avoid Record<string, unknown> vs {} type inference issues
  // Metadata can be added at runtime but won't be validated
});

// Extended type with optional metadata for runtime use
export type ActivityItemWithMetadata = z.infer<typeof activityItemSchema> & {
  metadata?: Record<string, unknown>;
};

export type ActivityItem = z.infer<typeof activityItemSchema>;

// ============================================================================
// DASHBOARD METRICS RESPONSE
// ============================================================================

export const dashboardMetricsResponseSchema = z.object({
  summary: dashboardSummarySchema,
  charts: dashboardChartsSchema,
  recentActivity: z.array(activityItemSchema),
  dateRange: z.object({
    from: z.coerce.date(),
    to: z.coerce.date(),
    preset: dateRangePresetSchema.nullable(),
  }),
  comparisonEnabled: z.boolean(),
  lastUpdated: z.coerce.date(),
});

export type DashboardMetricsResponse = z.infer<typeof dashboardMetricsResponseSchema>;

// ============================================================================
// GET METRICS COMPARISON
// ============================================================================

export const getMetricsComparisonSchema = z.object({
  dateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  dateTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  comparisonType: comparisonTypeSchema,
});

export type GetMetricsComparisonInput = z.infer<typeof getMetricsComparisonSchema>;

// ============================================================================
// INSIGHT ITEM
// ============================================================================

export const insightSeverityValues = ['info', 'positive', 'warning', 'critical'] as const;

export const insightSeveritySchema = z.enum(insightSeverityValues);

export type InsightSeverity = z.infer<typeof insightSeveritySchema>;

export const insightItemSchema = z.object({
  id: z.string(),
  metric: metricKeySchema,
  severity: insightSeveritySchema,
  title: z.string(),
  description: z.string(),
  recommendation: z.string().nullable(),
  percentageChange: z.number().nullable(),
});

export type InsightItem = z.infer<typeof insightItemSchema>;

// ============================================================================
// METRICS COMPARISON RESPONSE
// ============================================================================

export const metricsComparisonResponseSchema = z.object({
  current: dashboardSummarySchema,
  previous: dashboardSummarySchema,
  changes: z.record(z.string(), z.number()), // metric key -> percentage change
  insights: z.array(insightItemSchema),
  comparisonPeriod: z.object({
    currentFrom: z.coerce.date(),
    currentTo: z.coerce.date(),
    previousFrom: z.coerce.date(),
    previousTo: z.coerce.date(),
  }),
});

export type MetricsComparisonResponse = z.infer<typeof metricsComparisonResponseSchema>;

// ============================================================================
// FILTER STATE
// ============================================================================

export interface DashboardFiltersState {
  dateFrom: Date | null;
  dateTo: Date | null;
  preset: DateRangePreset | null;
  comparisonType: ComparisonType | null;
  comparisonEnabled: boolean;
}

export const defaultDashboardFilters: DashboardFiltersState = {
  dateFrom: null,
  dateTo: null,
  preset: '30d',
  comparisonType: null,
  comparisonEnabled: false,
};
