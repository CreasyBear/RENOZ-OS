/**
 * AI Insights Schema
 *
 * Defines types for AI-powered dashboard insights including:
 * - Pattern recognition insights
 * - Anomaly detection alerts
 * - Predictive trend analysis
 * - Actionable recommendations
 *
 * @see _Initiation/_prd/2-domains/dashboard/dashboard.prd.json - DASH-AI-INSIGHTS
 */

import { z } from 'zod';

// ============================================================================
// ENUMS
// ============================================================================

/**
 * Insight categories for grouping and filtering.
 */
export const InsightCategorySchema = z.enum([
  'pattern',       // Recurring patterns in data
  'anomaly',       // Unusual deviations from normal
  'trend',         // Directional trends over time
  'opportunity',   // Potential improvements or gains
  'risk',          // Potential problems or losses
  'recommendation', // Suggested actions
  'achievement',   // Goals met or milestones reached
]);

export type InsightCategory = z.infer<typeof InsightCategorySchema>;

/**
 * Priority levels for insights.
 */
export const InsightPrioritySchema = z.enum([
  'critical',  // Immediate attention required
  'high',      // Important, address soon
  'medium',    // Worth noting
  'low',       // Informational
]);

export type InsightPriority = z.infer<typeof InsightPrioritySchema>;

/**
 * Confidence level of the insight.
 */
export const ConfidenceLevelSchema = z.enum([
  'high',      // > 90% confidence
  'medium',    // 70-90% confidence
  'low',       // < 70% confidence
]);

export type ConfidenceLevel = z.infer<typeof ConfidenceLevelSchema>;

/**
 * Source of the insight generation.
 */
export const InsightSourceSchema = z.enum([
  'rule_based',    // Deterministic rule matching
  'statistical',   // Statistical analysis
  'ai_generated',  // AI/ML model generated
  'hybrid',        // Combination of methods
]);

export type InsightSource = z.infer<typeof InsightSourceSchema>;

// ============================================================================
// CORE SCHEMAS
// ============================================================================

/**
 * Metric reference within an insight.
 */
export const InsightMetricSchema = z.object({
  id: z.string(),
  name: z.string(),
  currentValue: z.number(),
  previousValue: z.number().optional(),
  changePercent: z.number().optional(),
  unit: z.string().optional(),
});

export type InsightMetric = z.infer<typeof InsightMetricSchema>;

/**
 * Action that can be taken from an insight.
 */
export const InsightActionSchema = z.object({
  id: z.string(),
  label: z.string(),
  description: z.string().optional(),
  url: z.string().optional(),
  type: z.enum(['navigate', 'filter', 'export', 'dismiss']),
});

export type InsightAction = z.infer<typeof InsightActionSchema>;

/**
 * Individual insight item.
 */
export const InsightSchema = z.object({
  id: z.string(),
  category: InsightCategorySchema,
  priority: InsightPrioritySchema,
  title: z.string(),
  description: z.string(),
  metrics: z.array(InsightMetricSchema).optional(),
  actions: z.array(InsightActionSchema).optional(),
  confidence: ConfidenceLevelSchema,
  source: InsightSourceSchema,
  createdAt: z.coerce.date(),
  expiresAt: z.coerce.date().optional(),
  dismissedAt: z.coerce.date().nullable().optional(),
  viewedAt: z.coerce.date().nullable().optional(),
});

export type Insight = z.infer<typeof InsightSchema>;

/**
 * Trend prediction data.
 */
export const TrendPredictionSchema = z.object({
  metricId: z.string(),
  metricName: z.string(),
  direction: z.enum(['up', 'down', 'stable']),
  predictedValue: z.number(),
  confidenceInterval: z.object({
    lower: z.number(),
    upper: z.number(),
  }),
  timeframe: z.string(), // e.g., "next_week", "next_month"
  confidence: ConfidenceLevelSchema,
});

export type TrendPrediction = z.infer<typeof TrendPredictionSchema>;

/**
 * Anomaly detection result.
 */
export const AnomalySchema = z.object({
  id: z.string(),
  metricId: z.string(),
  metricName: z.string(),
  detectedAt: z.coerce.date(),
  severity: InsightPrioritySchema,
  deviation: z.number(), // Standard deviations from mean
  expectedRange: z.object({
    min: z.number(),
    max: z.number(),
  }),
  actualValue: z.number(),
  description: z.string(),
  possibleCauses: z.array(z.string()).optional(),
});

export type Anomaly = z.infer<typeof AnomalySchema>;

// ============================================================================
// API REQUEST/RESPONSE SCHEMAS
// ============================================================================

/**
 * Request filters for fetching insights.
 */
export const GetInsightsRequestSchema = z.object({
  organizationId: z.string().uuid().optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
  categories: z.array(InsightCategorySchema).optional(),
  priorities: z.array(InsightPrioritySchema).optional(),
  includeDismissed: z.boolean().optional().default(false),
  limit: z.number().min(1).max(50).optional().default(10),
  offset: z.number().min(0).optional().default(0),
});

export type GetInsightsRequest = z.infer<typeof GetInsightsRequestSchema>;

/**
 * Response for insights list.
 */
export const GetInsightsResponseSchema = z.object({
  insights: z.array(InsightSchema),
  total: z.number(),
  summary: z.object({
    byCategory: z.record(InsightCategorySchema, z.number()),
    byPriority: z.record(InsightPrioritySchema, z.number()),
    unviewed: z.number(),
  }),
  generatedAt: z.coerce.date(),
});

export type GetInsightsResponse = z.infer<typeof GetInsightsResponseSchema>;

/**
 * Request for generating new insights.
 */
export const GenerateInsightsRequestSchema = z.object({
  organizationId: z.string().uuid().optional(),
  dateFrom: z.coerce.date(),
  dateTo: z.coerce.date(),
  metrics: z.array(z.string()).optional(), // Specific metrics to analyze
  comparisonPeriod: z.enum(['previous_period', 'previous_year', 'previous_quarter', 'previous_month']).optional(),
  includeAnomalyDetection: z.boolean().optional().default(true),
  includeTrendPrediction: z.boolean().optional().default(true),
  includeRecommendations: z.boolean().optional().default(true),
});

export type GenerateInsightsRequest = z.infer<typeof GenerateInsightsRequestSchema>;

/**
 * Response for insight generation.
 */
export const GenerateInsightsResponseSchema = z.object({
  insights: z.array(InsightSchema),
  predictions: z.array(TrendPredictionSchema).optional(),
  anomalies: z.array(AnomalySchema).optional(),
  summary: z.object({
    totalGenerated: z.number(),
    criticalCount: z.number(),
    highCount: z.number(),
  }),
  processingTime: z.number(), // milliseconds
});

export type GenerateInsightsResponse = z.infer<typeof GenerateInsightsResponseSchema>;

/**
 * Request to update insight status.
 */
export const UpdateInsightRequestSchema = z.object({
  id: z.string(),
  dismissed: z.boolean().optional(),
  viewed: z.boolean().optional(),
});

export type UpdateInsightRequest = z.infer<typeof UpdateInsightRequestSchema>;

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Threshold constants for insight generation.
 */
export const INSIGHT_THRESHOLDS = {
  // Percentage change thresholds
  CRITICAL_CHANGE: 30,       // >30% change is critical
  SIGNIFICANT_CHANGE: 15,    // >15% change is significant
  NOTABLE_CHANGE: 5,         // >5% change is notable

  // Target achievement thresholds
  TARGET_CRITICAL: 50,       // <50% of target is critical
  TARGET_WARNING: 80,        // <80% of target is warning
  TARGET_ACHIEVED: 100,      // >=100% is achieved

  // Anomaly detection (standard deviations)
  ANOMALY_CRITICAL: 3,       // >3 std devs is critical
  ANOMALY_WARNING: 2,        // >2 std devs is warning

  // Trend strength
  STRONG_TREND: 0.8,         // R² > 0.8 is strong
  MODERATE_TREND: 0.5,       // R² > 0.5 is moderate
} as const;

/**
 * Icon mapping for insight categories.
 */
export const INSIGHT_CATEGORY_ICONS = {
  pattern: 'Repeat',
  anomaly: 'AlertTriangle',
  trend: 'TrendingUp',
  opportunity: 'Lightbulb',
  risk: 'ShieldAlert',
  recommendation: 'Sparkles',
  achievement: 'Trophy',
} as const;

/**
 * Color mapping for priorities.
 */
export const INSIGHT_PRIORITY_COLORS = {
  critical: 'text-destructive bg-destructive/10',
  high: 'text-amber-600 bg-amber-100',
  medium: 'text-blue-600 bg-blue-100',
  low: 'text-muted-foreground bg-muted',
} as const;
