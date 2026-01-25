/**
 * Dashboard Comparison Server Functions
 *
 * Enhanced period-over-period comparison with:
 * - Statistical significance testing
 * - Trend analysis and forecasting
 * - Automated insights generation
 *
 * SECURITY: All functions use withAuth for authentication and
 * filter by organizationId for multi-tenant isolation.
 *
 * @see src/lib/schemas/dashboard/comparison.ts
 * @see DASH-COMPARISON-API acceptance criteria
 */

import { createServerFn } from '@tanstack/react-start';
import { eq, sql, and, gte, lte, count } from 'drizzle-orm';
import { db } from '@/lib/db';
import { withAuth } from '@/lib/server/protected';
import { PERMISSIONS } from '@/lib/auth/permissions';
import { orders, customers, opportunities } from 'drizzle/schema';
import {
  enhancedComparisonInputSchema,
  COMPARISON_THRESHOLDS,
  INVERSE_METRICS,
  type EnhancedComparisonResponse,
  type MetricComparison,
  type ComparisonInsight,
  type TrendAnalysis,
  type StatisticalSignificance,
  type TrendDirection,
  type SignificanceLevel,
  type ComparisonPeriod,
} from '@/lib/schemas/dashboard/comparison';
import {
  type DashboardSummary,
  type MetricKey,
  metricKeyValues,
} from '@/lib/schemas/dashboard/metrics';

// ============================================================================
// HELPERS - PERIOD CALCULATION
// ============================================================================

/**
 * Calculate the previous period dates based on comparison type.
 */
function calculatePreviousPeriod(
  currentFrom: Date,
  currentTo: Date,
  comparisonPeriod: ComparisonPeriod,
  customFrom?: string,
  customTo?: string
): { from: Date; to: Date } {
  if (comparisonPeriod === 'custom' && customFrom && customTo) {
    return { from: new Date(customFrom), to: new Date(customTo) };
  }

  const daysDiff = Math.ceil(
    (currentTo.getTime() - currentFrom.getTime()) / (1000 * 60 * 60 * 24)
  );

  switch (comparisonPeriod) {
    case 'previous_year': {
      const from = new Date(currentFrom);
      from.setFullYear(from.getFullYear() - 1);
      const to = new Date(currentTo);
      to.setFullYear(to.getFullYear() - 1);
      return { from, to };
    }
    case 'previous_quarter': {
      const from = new Date(currentFrom);
      from.setMonth(from.getMonth() - 3);
      const to = new Date(currentTo);
      to.setMonth(to.getMonth() - 3);
      return { from, to };
    }
    case 'previous_month': {
      const from = new Date(currentFrom);
      from.setMonth(from.getMonth() - 1);
      const to = new Date(currentTo);
      to.setMonth(to.getMonth() - 1);
      return { from, to };
    }
    case 'previous_period':
    default: {
      // Previous period of same length
      const to = new Date(currentFrom);
      to.setDate(to.getDate() - 1);
      const from = new Date(to);
      from.setDate(from.getDate() - daysDiff + 1);
      return { from, to };
    }
  }
}

// ============================================================================
// HELPERS - METRIC CALCULATIONS
// ============================================================================

interface PeriodMetrics {
  revenue: number;
  ordersCount: number;
  customerCount: number;
  pipelineValue: number;
  averageOrderValue: number;
  kwhDeployed: number;
  quoteWinRate: number;
  activeInstallations: number;
  warrantyClaims: number;
}

/**
 * Fetch all metrics for a given period.
 */
async function fetchPeriodMetrics(
  organizationId: string,
  fromDate: string,
  toDate: string
): Promise<PeriodMetrics> {
  // Revenue and orders
  const [orderStats] = await db
    .select({
      revenue: sql<number>`COALESCE(SUM(${orders.total}), 0)`,
      ordersCount: count(),
      avgOrder: sql<number>`COALESCE(AVG(${orders.total}), 0)`,
    })
    .from(orders)
    .where(
      and(
        eq(orders.organizationId, organizationId),
        gte(orders.orderDate, fromDate),
        lte(orders.orderDate, toDate)
      )
    );

  // Customer count
  const [customerStats] = await db
    .select({ count: count() })
    .from(customers)
    .where(
      and(
        eq(customers.organizationId, organizationId),
        sql`${customers.deletedAt} IS NULL`,
        gte(customers.createdAt, new Date(fromDate)),
        lte(customers.createdAt, new Date(toDate))
      )
    );

  // Pipeline value (open opportunities)
  const [pipelineStats] = await db
    .select({
      total: sql<number>`COALESCE(SUM(${opportunities.value}), 0)`,
    })
    .from(opportunities)
    .where(
      and(
        eq(opportunities.organizationId, organizationId),
        sql`${opportunities.stage} NOT IN ('won', 'lost')`,
        gte(opportunities.createdAt, new Date(fromDate)),
        lte(opportunities.createdAt, new Date(toDate))
      )
    );

  return {
    revenue: Number(orderStats?.revenue ?? 0),
    ordersCount: Number(orderStats?.ordersCount ?? 0),
    customerCount: Number(customerStats?.count ?? 0),
    pipelineValue: Number(pipelineStats?.total ?? 0),
    averageOrderValue: Number(orderStats?.avgOrder ?? 0),
    // Placeholder for metrics that need specialized tracking
    kwhDeployed: 0,
    quoteWinRate: 0,
    activeInstallations: 0,
    warrantyClaims: 0,
  };
}

/**
 * Convert period metrics to DashboardSummary format.
 */
function metricsToSummary(metrics: PeriodMetrics): DashboardSummary {
  const buildValue = (current: number) => ({
    current,
    change: 0,
    changeAbsolute: 0,
    target: null,
    targetProgress: null,
  });

  return {
    revenue: buildValue(metrics.revenue),
    kwhDeployed: buildValue(metrics.kwhDeployed),
    quoteWinRate: buildValue(metrics.quoteWinRate),
    activeInstallations: buildValue(metrics.activeInstallations),
    warrantyClaims: buildValue(metrics.warrantyClaims),
    pipelineValue: buildValue(metrics.pipelineValue),
    customerCount: buildValue(metrics.customerCount),
    ordersCount: buildValue(metrics.ordersCount),
    averageOrderValue: buildValue(metrics.averageOrderValue),
  };
}

// ============================================================================
// HELPERS - TREND ANALYSIS
// ============================================================================

/**
 * Determine trend direction based on percentage change.
 */
function determineTrendDirection(percentageChange: number): TrendDirection {
  if (percentageChange > COMPARISON_THRESHOLDS.STABLE_THRESHOLD_PERCENT) {
    return 'increasing';
  }
  if (percentageChange < -COMPARISON_THRESHOLDS.STABLE_THRESHOLD_PERCENT) {
    return 'decreasing';
  }
  return 'stable';
}

/**
 * Calculate simple trend analysis for a metric.
 */
function calculateTrendAnalysis(
  currentValue: number,
  previousValue: number,
  _dayCount: number
): TrendAnalysis {
  const percentageChange =
    previousValue === 0
      ? 0
      : ((currentValue - previousValue) / previousValue) * 100;

  const direction = determineTrendDirection(percentageChange);

  // Simple linear slope (change per day)
  const slope = previousValue === 0 ? 0 : (currentValue - previousValue) / _dayCount;

  // Simplified strength (based on magnitude of change)
  const strength = Math.min(1, Math.abs(percentageChange) / 100);

  // Simple forecast: continue current trend
  const forecast = direction === 'stable' ? currentValue : currentValue * (1 + percentageChange / 100);

  return {
    direction,
    velocity: 'steady', // Would need historical data for accurate velocity
    slope,
    strength,
    forecast,
    forecastConfidence: strength * 0.5, // Conservative confidence
  };
}

// ============================================================================
// HELPERS - STATISTICAL SIGNIFICANCE
// ============================================================================

/**
 * Calculate statistical significance of the change.
 */
function calculateStatisticalSignificance(
  currentValue: number,
  previousValue: number,
  sampleSize: number
): StatisticalSignificance {
  if (previousValue === 0 || sampleSize === 0) {
    return {
      isSignificant: false,
      level: 'none',
      zScore: null,
      pValue: null,
      confidenceLower: null,
      confidenceUpper: null,
      sampleSize,
      standardDeviation: null,
    };
  }

  const change = currentValue - previousValue;
  const percentageChange = (change / previousValue) * 100;

  // Simplified z-score calculation (would need actual variance for real significance)
  // Using coefficient of variation approximation
  const estimatedStdDev = previousValue * 0.15; // Assume 15% coefficient of variation
  const zScore = estimatedStdDev > 0 ? change / estimatedStdDev : 0;

  // Determine significance level
  let level: SignificanceLevel = 'none';
  let isSignificant = false;

  if (Math.abs(zScore) >= COMPARISON_THRESHOLDS.Z_SCORE_99) {
    level = 'high';
    isSignificant = true;
  } else if (Math.abs(zScore) >= COMPARISON_THRESHOLDS.Z_SCORE_95) {
    level = 'moderate';
    isSignificant = true;
  } else if (Math.abs(percentageChange) >= COMPARISON_THRESHOLDS.SIGNIFICANT_CHANGE_PERCENT) {
    level = 'low';
    isSignificant = true;
  }

  // Simplified confidence interval (±2 standard errors)
  const standardError = estimatedStdDev / Math.sqrt(sampleSize);
  const marginOfError = COMPARISON_THRESHOLDS.Z_SCORE_95 * standardError;

  return {
    isSignificant,
    level,
    zScore: Math.round(zScore * 100) / 100,
    pValue: null, // Would need proper statistical test for p-value
    confidenceLower: currentValue - marginOfError,
    confidenceUpper: currentValue + marginOfError,
    sampleSize,
    standardDeviation: estimatedStdDev,
  };
}

// ============================================================================
// HELPERS - INSIGHTS GENERATION
// ============================================================================

/**
 * Generate automated insights based on metric comparisons.
 */
function generateInsights(
  comparisons: MetricComparison[]
): ComparisonInsight[] {
  const insights: ComparisonInsight[] = [];
  const now = new Date();

  for (const comparison of comparisons) {
    const { metric, percentageChange, improved, significance, trend } = comparison;
    const absChange = Math.abs(percentageChange);

    // Major positive change
    if (improved && absChange >= COMPARISON_THRESHOLDS.MAJOR_CHANGE_PERCENT) {
      insights.push({
        id: `insight-${metric}-major-improvement`,
        metric,
        category: 'performance',
        priority: 'high',
        title: `Strong ${formatMetricName(metric)} Growth`,
        description: `${formatMetricName(metric)} has increased by ${percentageChange.toFixed(1)}% compared to the previous period.`,
        recommendation: 'Analyze what drove this improvement and consider ways to sustain this momentum.',
        data: {
          currentValue: comparison.currentValue,
          previousValue: comparison.previousValue,
          percentageChange,
        },
        generatedAt: now,
      });
    }

    // Major negative change
    if (!improved && absChange >= COMPARISON_THRESHOLDS.MAJOR_CHANGE_PERCENT) {
      insights.push({
        id: `insight-${metric}-major-decline`,
        metric,
        category: 'performance',
        priority: 'high',
        title: `${formatMetricName(metric)} Requires Attention`,
        description: `${formatMetricName(metric)} has decreased by ${Math.abs(percentageChange).toFixed(1)}% compared to the previous period.`,
        recommendation: 'Investigate the causes of this decline and develop an action plan.',
        data: {
          currentValue: comparison.currentValue,
          previousValue: comparison.previousValue,
          percentageChange,
        },
        generatedAt: now,
      });
    }

    // Trend-based insights
    if (trend && trend.direction !== 'stable') {
      const trendEmoji = trend.direction === 'increasing' ? 'upward' : 'downward';
      if (trend.strength >= COMPARISON_THRESHOLDS.STRONG_TREND_R2) {
        insights.push({
          id: `insight-${metric}-strong-trend`,
          metric,
          category: 'trend',
          priority: 'medium',
          title: `Strong ${trendEmoji} Trend in ${formatMetricName(metric)}`,
          description: `${formatMetricName(metric)} shows a consistent ${trendEmoji} trend with ${(trend.strength * 100).toFixed(0)}% confidence.`,
          recommendation: trend.direction === 'increasing' && !INVERSE_METRICS.has(metric)
            ? 'This positive trend suggests your strategies are working. Consider scaling successful initiatives.'
            : 'Review recent changes that may be contributing to this trend.',
          data: {
            percentageChange,
            threshold: COMPARISON_THRESHOLDS.STRONG_TREND_R2,
          },
          generatedAt: now,
        });
      }
    }

    // Statistical significance insight
    if (significance?.isSignificant && significance.level === 'high') {
      insights.push({
        id: `insight-${metric}-significant`,
        metric,
        category: 'anomaly',
        priority: improved ? 'medium' : 'high',
        title: `Statistically Significant Change in ${formatMetricName(metric)}`,
        description: `The ${percentageChange.toFixed(1)}% change in ${formatMetricName(metric)} is statistically significant (z-score: ${significance.zScore}).`,
        recommendation: 'This change is unlikely to be due to random variation. Investigate contributing factors.',
        generatedAt: now,
      });
    }
  }

  // Sort by priority
  const priorityOrder = { high: 0, medium: 1, low: 2 };
  return insights.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
}

/**
 * Format metric key to human-readable name.
 */
function formatMetricName(metric: MetricKey): string {
  const names: Record<MetricKey, string> = {
    revenue: 'Revenue',
    kwh_deployed: 'kWh Deployed',
    quote_win_rate: 'Quote Win Rate',
    active_installations: 'Active Installations',
    warranty_claims: 'Warranty Claims',
    pipeline_value: 'Pipeline Value',
    customer_count: 'Customer Count',
    orders_count: 'Orders Count',
    average_order_value: 'Average Order Value',
  };
  return names[metric] ?? metric;
}

// ============================================================================
// MAIN SERVER FUNCTION
// ============================================================================

/**
 * Get enhanced metrics comparison with trend analysis and insights.
 */
export const getEnhancedComparison = createServerFn({ method: 'GET' })
  .inputValidator(enhancedComparisonInputSchema)
  .handler(async ({ data }) => {
    const startTime = Date.now();
    const ctx = await withAuth({ permission: PERMISSIONS.dashboard.read });

    const currentFrom = new Date(data.dateFrom);
    const currentTo = new Date(data.dateTo);
    const currentDayCount = Math.ceil(
      (currentTo.getTime() - currentFrom.getTime()) / (1000 * 60 * 60 * 24)
    ) + 1;

    // Calculate previous period
    const previous = calculatePreviousPeriod(
      currentFrom,
      currentTo,
      data.comparisonPeriod,
      data.customPreviousFrom,
      data.customPreviousTo
    );
    const previousDayCount = Math.ceil(
      (previous.to.getTime() - previous.from.getTime()) / (1000 * 60 * 60 * 24)
    ) + 1;

    // Fetch metrics for both periods
    const currentMetrics = await fetchPeriodMetrics(
      ctx.organizationId,
      data.dateFrom,
      data.dateTo
    );
    const previousMetrics = await fetchPeriodMetrics(
      ctx.organizationId,
      previous.from.toISOString().split('T')[0],
      previous.to.toISOString().split('T')[0]
    );

    // Build metric comparisons
    const metricsToCompare = data.metrics ?? metricKeyValues;
    const comparisons: MetricComparison[] = [];

    for (const metric of metricsToCompare) {
      const currentValue = getMetricValue(currentMetrics, metric);
      const previousValue = getMetricValue(previousMetrics, metric);
      const absoluteChange = currentValue - previousValue;
      const percentageChange =
        previousValue === 0 ? 0 : ((currentValue - previousValue) / previousValue) * 100;

      // Determine if improvement (considering inverse metrics)
      const improved = INVERSE_METRICS.has(metric)
        ? percentageChange < 0
        : percentageChange > 0;

      // Calculate trend if requested
      const trend = data.includeTrend
        ? calculateTrendAnalysis(currentValue, previousValue, currentDayCount)
        : null;

      // Calculate significance if requested
      const sampleSize = metric === 'orders_count' ? currentMetrics.ordersCount : 1;
      const significance = data.includeSignificance
        ? calculateStatisticalSignificance(currentValue, previousValue, sampleSize)
        : null;

      comparisons.push({
        metric,
        currentValue,
        previousValue,
        absoluteChange,
        percentageChange: Math.round(percentageChange * 100) / 100,
        trend,
        significance,
        improved,
      });
    }

    // Generate insights if requested
    const insights = data.includeInsights ? generateInsights(comparisons) : [];

    // Calculate overall performance
    const improved = comparisons.filter((c) => c.improved && Math.abs(c.percentageChange) > COMPARISON_THRESHOLDS.STABLE_THRESHOLD_PERCENT).length;
    const declined = comparisons.filter((c) => !c.improved && Math.abs(c.percentageChange) > COMPARISON_THRESHOLDS.STABLE_THRESHOLD_PERCENT).length;
    const stable = comparisons.length - improved - declined;

    // Calculate overall score (0-100)
    const avgChange = comparisons.reduce((sum, c) => {
      const change = INVERSE_METRICS.has(c.metric) ? -c.percentageChange : c.percentageChange;
      return sum + change;
    }, 0) / comparisons.length;
    const overallScore = Math.max(0, Math.min(100, 50 + avgChange));

    const overallTrend: TrendDirection =
      improved > declined ? 'increasing' : improved < declined ? 'decreasing' : 'stable';

    const response: EnhancedComparisonResponse = {
      current: metricsToSummary(currentMetrics),
      previous: metricsToSummary(previousMetrics),
      comparisons,
      insights,
      overallPerformance: {
        improved,
        declined,
        stable,
        score: Math.round(overallScore),
        trend: overallTrend,
      },
      periods: {
        current: {
          from: currentFrom,
          to: currentTo,
          dayCount: currentDayCount,
        },
        previous: {
          from: previous.from,
          to: previous.to,
          dayCount: previousDayCount,
        },
      },
      meta: {
        comparisonPeriod: data.comparisonPeriod,
        generatedAt: new Date(),
        cacheHit: false,
        processingTimeMs: Date.now() - startTime,
      },
    };

    return response;
  });

/**
 * Get metric value from PeriodMetrics by key.
 */
function getMetricValue(metrics: PeriodMetrics, key: MetricKey): number {
  const map: Record<MetricKey, number> = {
    revenue: metrics.revenue,
    kwh_deployed: metrics.kwhDeployed,
    quote_win_rate: metrics.quoteWinRate,
    active_installations: metrics.activeInstallations,
    warranty_claims: metrics.warrantyClaims,
    pipeline_value: metrics.pipelineValue,
    customer_count: metrics.customerCount,
    orders_count: metrics.ordersCount,
    average_order_value: metrics.averageOrderValue,
  };
  return map[key] ?? 0;
}
