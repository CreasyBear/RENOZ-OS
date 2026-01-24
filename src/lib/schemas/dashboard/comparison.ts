/**
 * Dashboard Comparison Validation Schemas
 *
 * Zod schemas for period-over-period comparison analysis.
 *
 * Features:
 * - Flexible comparison periods (previous period, same period last year)
 * - Statistical significance testing
 * - Trend analysis and forecasting
 * - Automated insights generation
 *
 * @see src/server/functions/dashboard/dashboard-metrics.ts
 * @see DASH-COMPARISON-API acceptance criteria
 */

import { z } from 'zod';
import { metricKeySchema, dashboardSummarySchema } from './metrics';

// ============================================================================
// COMPARISON PERIOD TYPES
// ============================================================================

export const comparisonPeriodValues = [
  'previous_period',
  'previous_year',
  'previous_quarter',
  'previous_month',
  'custom',
] as const;

export const comparisonPeriodSchema = z.enum(comparisonPeriodValues);

export type ComparisonPeriod = z.infer<typeof comparisonPeriodSchema>;

// ============================================================================
// TREND ANALYSIS
// ============================================================================

export const trendDirectionValues = ['increasing', 'decreasing', 'stable'] as const;

export const trendDirectionSchema = z.enum(trendDirectionValues);

export type TrendDirection = z.infer<typeof trendDirectionSchema>;

export const trendVelocityValues = ['accelerating', 'steady', 'decelerating'] as const;

export const trendVelocitySchema = z.enum(trendVelocityValues);

export type TrendVelocity = z.infer<typeof trendVelocitySchema>;

export const trendAnalysisSchema = z.object({
  /** Direction of the trend */
  direction: trendDirectionSchema,
  /** Velocity/acceleration of the trend */
  velocity: trendVelocitySchema,
  /** Slope of the trend line (rate of change per day) */
  slope: z.number(),
  /** R-squared value (0-1) indicating trend strength */
  strength: z.number().min(0).max(1),
  /** Simple forecast for next period (same duration) */
  forecast: z.number().nullable(),
  /** Confidence level of the forecast (0-1) */
  forecastConfidence: z.number().min(0).max(1).nullable(),
});

export type TrendAnalysis = z.infer<typeof trendAnalysisSchema>;

// ============================================================================
// STATISTICAL SIGNIFICANCE
// ============================================================================

export const significanceLevelValues = ['high', 'moderate', 'low', 'none'] as const;

export const significanceLevelSchema = z.enum(significanceLevelValues);

export type SignificanceLevel = z.infer<typeof significanceLevelSchema>;

export const statisticalSignificanceSchema = z.object({
  /** Whether the change is statistically significant */
  isSignificant: z.boolean(),
  /** Significance level based on threshold analysis */
  level: significanceLevelSchema,
  /** Z-score of the change */
  zScore: z.number().nullable(),
  /** P-value if applicable */
  pValue: z.number().nullable(),
  /** Confidence interval lower bound */
  confidenceLower: z.number().nullable(),
  /** Confidence interval upper bound */
  confidenceUpper: z.number().nullable(),
  /** Sample size for current period */
  sampleSize: z.number(),
  /** Standard deviation of the metric */
  standardDeviation: z.number().nullable(),
});

export type StatisticalSignificance = z.infer<typeof statisticalSignificanceSchema>;

// ============================================================================
// METRIC COMPARISON DETAIL
// ============================================================================

export const metricComparisonSchema = z.object({
  /** Metric identifier */
  metric: metricKeySchema,
  /** Current period value */
  currentValue: z.number(),
  /** Previous period value */
  previousValue: z.number(),
  /** Absolute change (current - previous) */
  absoluteChange: z.number(),
  /** Percentage change */
  percentageChange: z.number(),
  /** Trend analysis for this metric */
  trend: trendAnalysisSchema.nullable(),
  /** Statistical significance of the change */
  significance: statisticalSignificanceSchema.nullable(),
  /** Whether this metric improved (depends on metric type - e.g., lower warranty claims is better) */
  improved: z.boolean(),
});

export type MetricComparison = z.infer<typeof metricComparisonSchema>;

// ============================================================================
// INSIGHTS
// ============================================================================

export const insightCategoryValues = [
  'performance',
  'trend',
  'anomaly',
  'target',
  'forecast',
  'recommendation',
] as const;

export const insightCategorySchema = z.enum(insightCategoryValues);

export type InsightCategory = z.infer<typeof insightCategorySchema>;

export const insightPriorityValues = ['high', 'medium', 'low'] as const;

export const insightPrioritySchema = z.enum(insightPriorityValues);

export type InsightPriority = z.infer<typeof insightPrioritySchema>;

export const comparisonInsightSchema = z.object({
  /** Unique insight ID */
  id: z.string(),
  /** Related metric */
  metric: metricKeySchema,
  /** Insight category */
  category: insightCategorySchema,
  /** Priority level */
  priority: insightPrioritySchema,
  /** Insight title */
  title: z.string(),
  /** Detailed description */
  description: z.string(),
  /** Actionable recommendation */
  recommendation: z.string().nullable(),
  /** Data supporting the insight */
  data: z.object({
    currentValue: z.number().optional(),
    previousValue: z.number().optional(),
    percentageChange: z.number().optional(),
    threshold: z.number().optional(),
  }).optional(),
  /** Timestamp when insight was generated */
  generatedAt: z.coerce.date(),
});

export type ComparisonInsight = z.infer<typeof comparisonInsightSchema>;

// ============================================================================
// ENHANCED COMPARISON INPUT
// ============================================================================

export const enhancedComparisonInputSchema = z.object({
  /** Current period start date */
  dateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  /** Current period end date */
  dateTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  /** Comparison period type */
  comparisonPeriod: comparisonPeriodSchema.default('previous_period'),
  /** Custom previous period start (only if comparisonPeriod is 'custom') */
  customPreviousFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  /** Custom previous period end (only if comparisonPeriod is 'custom') */
  customPreviousTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  /** Specific metrics to compare (empty means all) */
  metrics: z.array(metricKeySchema).optional(),
  /** Include trend analysis */
  includeTrend: z.boolean().default(true),
  /** Include statistical significance testing */
  includeSignificance: z.boolean().default(true),
  /** Include automated insights */
  includeInsights: z.boolean().default(true),
});

export type EnhancedComparisonInput = z.infer<typeof enhancedComparisonInputSchema>;

// ============================================================================
// ENHANCED COMPARISON RESPONSE
// ============================================================================

export const enhancedComparisonResponseSchema = z.object({
  /** Summary metrics for current period */
  current: dashboardSummarySchema,
  /** Summary metrics for previous/comparison period */
  previous: dashboardSummarySchema,
  /** Detailed comparison for each metric */
  comparisons: z.array(metricComparisonSchema),
  /** Generated insights based on the comparison */
  insights: z.array(comparisonInsightSchema),
  /** Overall performance indicator */
  overallPerformance: z.object({
    /** Number of metrics that improved */
    improved: z.number(),
    /** Number of metrics that declined */
    declined: z.number(),
    /** Number of metrics that stayed stable */
    stable: z.number(),
    /** Overall score (0-100) */
    score: z.number(),
    /** Overall trend direction */
    trend: trendDirectionSchema,
  }),
  /** Period information */
  periods: z.object({
    current: z.object({
      from: z.coerce.date(),
      to: z.coerce.date(),
      dayCount: z.number(),
    }),
    previous: z.object({
      from: z.coerce.date(),
      to: z.coerce.date(),
      dayCount: z.number(),
    }),
  }),
  /** Metadata */
  meta: z.object({
    comparisonPeriod: comparisonPeriodSchema,
    generatedAt: z.coerce.date(),
    cacheHit: z.boolean().optional(),
    processingTimeMs: z.number().optional(),
  }),
});

export type EnhancedComparisonResponse = z.infer<typeof enhancedComparisonResponseSchema>;

// ============================================================================
// THRESHOLD CONFIGURATION
// ============================================================================

/**
 * Thresholds for generating insights.
 * These determine when changes are considered significant enough to highlight.
 */
export const COMPARISON_THRESHOLDS = {
  /** Minimum percentage change to consider significant */
  SIGNIFICANT_CHANGE_PERCENT: 10,
  /** Major change threshold for high priority insights */
  MAJOR_CHANGE_PERCENT: 25,
  /** Critical change threshold for urgent alerts */
  CRITICAL_CHANGE_PERCENT: 50,
  /** Z-score threshold for statistical significance (95% confidence) */
  Z_SCORE_95: 1.96,
  /** Z-score threshold for high significance (99% confidence) */
  Z_SCORE_99: 2.576,
  /** Minimum R-squared for strong trend */
  STRONG_TREND_R2: 0.7,
  /** Stable change threshold (less than this is considered stable) */
  STABLE_THRESHOLD_PERCENT: 2,
} as const;

/**
 * Metrics where lower values are better (e.g., warranty claims).
 * Used to determine if a metric "improved" or "declined".
 */
export const INVERSE_METRICS: Set<string> = new Set([
  'warranty_claims',
]);
