/**
 * AI Insights Server Functions
 *
 * Generates intelligent insights from dashboard metrics data.
 * Currently uses rule-based pattern matching with hooks for future AI integration.
 *
 * Features:
 * - Pattern recognition from metrics data
 * - Anomaly detection based on statistical thresholds
 * - Trend analysis and predictions
 * - Actionable recommendations
 *
 * @see _Initiation/_prd/2-domains/dashboard/dashboard.prd.json - DASH-AI-INSIGHTS
 */

import { createServerFn } from '@tanstack/react-start';
import { withAuth } from '@/lib/server/protected';
import { PERMISSIONS } from '@/lib/auth/permissions';
import {
  GetInsightsRequestSchema,
  GenerateInsightsRequestSchema,
  type GetInsightsResponse,
  type GenerateInsightsResponse,
  type Insight,
  type TrendPrediction,
  type InsightCategory,
  type InsightPriority,
  INSIGHT_THRESHOLDS,
} from '@/lib/schemas/dashboard/ai-insights';
import { getEnhancedComparison } from './comparison';

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Generate a unique ID for insights.
 */
function generateInsightId(): string {
  return `insight_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Determine priority based on change percentage.
 */
function getPriorityFromChange(changePercent: number): InsightPriority {
  const absChange = Math.abs(changePercent);
  if (absChange >= INSIGHT_THRESHOLDS.CRITICAL_CHANGE) return 'critical';
  if (absChange >= INSIGHT_THRESHOLDS.SIGNIFICANT_CHANGE) return 'high';
  if (absChange >= INSIGHT_THRESHOLDS.NOTABLE_CHANGE) return 'medium';
  return 'low';
}

/**
 * Check if a metric change represents improvement or decline.
 * Some metrics like "warranty_claims" are inverted (lower is better).
 */
function isImprovement(metricId: string, changePercent: number): boolean {
  const inverseMetrics = new Set(['warranty_claims', 'customer_churn', 'avg_resolution_time']);
  const isInverse = inverseMetrics.has(metricId);
  return isInverse ? changePercent < 0 : changePercent > 0;
}

/**
 * Generate human-readable metric name.
 */
function formatMetricName(metricId: string): string {
  const nameMap: Record<string, string> = {
    revenue: 'Revenue',
    orders_count: 'Total Orders',
    customer_count: 'Customer Count',
    pipeline_value: 'Pipeline Value',
    average_order_value: 'Average Order Value',
    quote_win_rate: 'Quote Win Rate',
    kwh_deployed: 'kWh Deployed',
    active_installations: 'Active Installations',
    warranty_claims: 'Warranty Claims',
  };
  return nameMap[metricId] || metricId.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Generate insights from metric comparison data.
 */
function generateMetricInsights(
  metrics: Array<{
    id: string;
    currentValue: number;
    previousValue: number;
    changePercent: number;
  }>
): Insight[] {
  const insights: Insight[] = [];
  const now = new Date();

  for (const metric of metrics) {
    const absChange = Math.abs(metric.changePercent);

    // Skip if change is too small
    if (absChange < INSIGHT_THRESHOLDS.NOTABLE_CHANGE) continue;

    const improved = isImprovement(metric.id, metric.changePercent);
    const priority = getPriorityFromChange(metric.changePercent);
    const metricName = formatMetricName(metric.id);

    // Create insight based on change direction and magnitude
    if (absChange >= INSIGHT_THRESHOLDS.CRITICAL_CHANGE) {
      insights.push({
        id: generateInsightId(),
        category: improved ? 'achievement' : 'risk',
        priority,
        title: improved
          ? `${metricName} Surging`
          : `${metricName} Alert`,
        description: improved
          ? `${metricName} has increased by ${metric.changePercent.toFixed(1)}% compared to the previous period. This represents exceptional performance.`
          : `${metricName} has dropped by ${Math.abs(metric.changePercent).toFixed(1)}% compared to the previous period. This requires immediate attention.`,
        metrics: [
          {
            id: metric.id,
            name: metricName,
            currentValue: metric.currentValue,
            previousValue: metric.previousValue,
            changePercent: metric.changePercent,
          },
        ],
        actions: [
          {
            id: 'view_details',
            label: 'View Details',
            type: 'navigate',
            url: `/dashboard?metric=${metric.id}`,
          },
        ],
        confidence: 'high',
        source: 'rule_based',
        createdAt: now,
        dismissedAt: null,
        viewedAt: null,
      });
    } else if (absChange >= INSIGHT_THRESHOLDS.SIGNIFICANT_CHANGE) {
      insights.push({
        id: generateInsightId(),
        category: 'trend',
        priority,
        title: `${metricName} ${improved ? 'Growing' : 'Declining'}`,
        description: `${metricName} has ${improved ? 'increased' : 'decreased'} by ${Math.abs(metric.changePercent).toFixed(1)}% compared to the previous period.`,
        metrics: [
          {
            id: metric.id,
            name: metricName,
            currentValue: metric.currentValue,
            previousValue: metric.previousValue,
            changePercent: metric.changePercent,
          },
        ],
        actions: [
          {
            id: 'view_trend',
            label: 'View Trend',
            type: 'navigate',
            url: `/dashboard?metric=${metric.id}&view=trend`,
          },
        ],
        confidence: 'high',
        source: 'rule_based',
        createdAt: now,
        dismissedAt: null,
        viewedAt: null,
      });
    }
  }

  return insights;
}

/**
 * Generate pattern insights by looking for correlations.
 */
function generatePatternInsights(
  metrics: Array<{
    id: string;
    currentValue: number;
    previousValue: number;
    changePercent: number;
  }>
): Insight[] {
  const insights: Insight[] = [];
  const now = new Date();

  // Look for correlated changes
  const revenueMetric = metrics.find((m) => m.id === 'revenue');
  const ordersMetric = metrics.find((m) => m.id === 'orders_count');
  // Note: average_order_value metric can be added here for AOV-specific insights

  // Pattern: Revenue up but orders flat/down = higher AOV
  if (
    revenueMetric &&
    ordersMetric &&
    revenueMetric.changePercent > 10 &&
    ordersMetric.changePercent < 5
  ) {
    insights.push({
      id: generateInsightId(),
      category: 'pattern',
      priority: 'medium',
      title: 'Higher Value Orders Detected',
      description:
        'Revenue is growing faster than order count, indicating customers are placing larger orders. Consider promoting upsells and bundles.',
      metrics: [
        {
          id: 'revenue',
          name: 'Revenue',
          currentValue: revenueMetric.currentValue,
          previousValue: revenueMetric.previousValue,
          changePercent: revenueMetric.changePercent,
        },
        {
          id: 'orders_count',
          name: 'Orders',
          currentValue: ordersMetric.currentValue,
          previousValue: ordersMetric.previousValue,
          changePercent: ordersMetric.changePercent,
        },
      ],
      actions: [
        {
          id: 'view_aov',
          label: 'Analyze Order Values',
          type: 'navigate',
          url: '/reports/order-analysis',
        },
      ],
      confidence: 'medium',
      source: 'rule_based',
      createdAt: now,
      dismissedAt: null,
      viewedAt: null,
    });
  }

  // Pattern: Revenue down but pipeline up = future recovery likely
  const pipelineMetric = metrics.find((m) => m.id === 'pipeline_value');
  if (
    revenueMetric &&
    pipelineMetric &&
    revenueMetric.changePercent < -5 &&
    pipelineMetric.changePercent > 10
  ) {
    insights.push({
      id: generateInsightId(),
      category: 'opportunity',
      priority: 'medium',
      title: 'Strong Pipeline Despite Revenue Dip',
      description:
        'While current revenue is down, your pipeline value is growing, suggesting a potential recovery in the coming weeks.',
      metrics: [
        {
          id: 'revenue',
          name: 'Revenue',
          currentValue: revenueMetric.currentValue,
          previousValue: revenueMetric.previousValue,
          changePercent: revenueMetric.changePercent,
        },
        {
          id: 'pipeline_value',
          name: 'Pipeline Value',
          currentValue: pipelineMetric.currentValue,
          previousValue: pipelineMetric.previousValue,
          changePercent: pipelineMetric.changePercent,
        },
      ],
      actions: [
        {
          id: 'view_pipeline',
          label: 'View Pipeline',
          type: 'navigate',
          url: '/pipeline',
        },
      ],
      confidence: 'medium',
      source: 'rule_based',
      createdAt: now,
      dismissedAt: null,
      viewedAt: null,
    });
  }

  return insights;
}

/**
 * Generate recommendation insights.
 */
function generateRecommendationInsights(
  metrics: Array<{
    id: string;
    currentValue: number;
    previousValue: number;
    changePercent: number;
  }>
): Insight[] {
  const insights: Insight[] = [];
  const now = new Date();

  // Recommendation: If customer count growing but revenue flat
  const customerMetric = metrics.find((m) => m.id === 'customer_count');
  const revenueMetric = metrics.find((m) => m.id === 'revenue');

  if (
    customerMetric &&
    revenueMetric &&
    customerMetric.changePercent > 10 &&
    Math.abs(revenueMetric.changePercent) < 5
  ) {
    insights.push({
      id: generateInsightId(),
      category: 'recommendation',
      priority: 'medium',
      title: 'Monetization Opportunity',
      description:
        'Your customer base is growing but revenue remains flat. Consider reviewing pricing, upsell opportunities, or customer engagement strategies.',
      actions: [
        {
          id: 'view_customers',
          label: 'Analyze Customers',
          type: 'navigate',
          url: '/customers?segment=new',
        },
        {
          id: 'view_pricing',
          label: 'Review Pricing',
          type: 'navigate',
          url: '/settings/pricing',
        },
      ],
      confidence: 'medium',
      source: 'rule_based',
      createdAt: now,
      dismissedAt: null,
      viewedAt: null,
    });
  }

  return insights;
}

/**
 * Generate simple trend predictions based on current data.
 * Note: This is a placeholder for more sophisticated ML-based predictions.
 */
function generateTrendPredictions(
  metrics: Array<{
    id: string;
    currentValue: number;
    previousValue: number;
    changePercent: number;
  }>
): TrendPrediction[] {
  const predictions: TrendPrediction[] = [];

  for (const metric of metrics) {
    // Only predict for metrics with significant movement
    if (Math.abs(metric.changePercent) < 5) continue;

    const direction =
      metric.changePercent > 2 ? 'up' : metric.changePercent < -2 ? 'down' : 'stable';

    // Simple linear extrapolation (placeholder for more sophisticated models)
    const momentum = metric.changePercent / 100;
    const predictedValue = metric.currentValue * (1 + momentum * 0.5);

    predictions.push({
      metricId: metric.id,
      metricName: formatMetricName(metric.id),
      direction,
      predictedValue,
      confidenceInterval: {
        lower: predictedValue * 0.85,
        upper: predictedValue * 1.15,
      },
      timeframe: 'next_month',
      confidence: Math.abs(momentum) > 0.1 ? 'medium' : 'low',
    });
  }

  return predictions;
}

// ============================================================================
// SERVER FUNCTIONS
// ============================================================================

/**
 * Generate AI-powered insights from dashboard metrics.
 */
export const generateInsights = createServerFn({ method: 'POST' })
  .inputValidator(GenerateInsightsRequestSchema)
  .handler(async ({ data }): Promise<GenerateInsightsResponse> => {
    const startTime = Date.now();
    // Auth check for permission validation
    await withAuth({ permission: PERMISSIONS.dashboard.read });

    // Format dates as YYYY-MM-DD strings for the comparison API
    const dateFromStr = data.dateFrom.toISOString().split('T')[0];
    const dateToStr = data.dateTo.toISOString().split('T')[0];

    // Get comparison data to analyze
    // Cast metrics to the expected type (metricKeySchema enum values)
    const comparisonData = await getEnhancedComparison({
      data: {
        dateFrom: dateFromStr,
        dateTo: dateToStr,
        comparisonPeriod: data.comparisonPeriod || 'previous_period',
        metrics: data.metrics as (
          | 'revenue'
          | 'kwh_deployed'
          | 'quote_win_rate'
          | 'active_installations'
          | 'warranty_claims'
          | 'pipeline_value'
          | 'customer_count'
          | 'orders_count'
          | 'average_order_value'
        )[] | undefined,
        includeTrend: true,
        includeSignificance: true,
        includeInsights: false, // We generate our own insights
      },
    });

    // Transform comparison data to metric array
    const metrics = comparisonData.comparisons.map((m) => ({
      id: m.metric,
      currentValue: m.currentValue,
      previousValue: m.previousValue,
      changePercent: m.percentageChange,
    }));

    // Generate insights from multiple sources
    const metricInsights = generateMetricInsights(metrics);
    const patternInsights = generatePatternInsights(metrics);
    const recommendationInsights = data.includeRecommendations
      ? generateRecommendationInsights(metrics)
      : [];

    // Combine all insights
    const allInsights = [...metricInsights, ...patternInsights, ...recommendationInsights];

    // Sort by priority (critical first, then high, etc.)
    const priorityOrder: Record<InsightPriority, number> = {
      critical: 0,
      high: 1,
      medium: 2,
      low: 3,
    };
    allInsights.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

    // Generate predictions if requested
    const predictions = data.includeTrendPrediction ? generateTrendPredictions(metrics) : [];

    // Count by priority
    const criticalCount = allInsights.filter((i) => i.priority === 'critical').length;
    const highCount = allInsights.filter((i) => i.priority === 'high').length;

    return {
      insights: allInsights,
      predictions,
      anomalies: [], // Placeholder for anomaly detection
      summary: {
        totalGenerated: allInsights.length,
        criticalCount,
        highCount,
      },
      processingTime: Date.now() - startTime,
    };
  });

/**
 * Get cached insights for the dashboard.
 * This returns previously generated insights rather than regenerating.
 */
export const getInsights = createServerFn({ method: 'GET' })
  .inputValidator(GetInsightsRequestSchema)
  .handler(async ({ data }): Promise<GetInsightsResponse> => {
    const ctx = await withAuth({ permission: PERMISSIONS.dashboard.read });
    const now = new Date();

    // For now, generate fresh insights on each request
    // In production, this would fetch from a cache or database
    const dateFrom = data.dateFrom || new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const dateTo = data.dateTo || now;

    const generated = await generateInsights({
      data: {
        organizationId: ctx.organizationId,
        dateFrom,
        dateTo,
        includeRecommendations: true,
        includeTrendPrediction: false,
        includeAnomalyDetection: false,
      },
    });

    // Filter by categories if specified
    let filteredInsights = generated.insights;
    if (data.categories && data.categories.length > 0) {
      filteredInsights = filteredInsights.filter((i) => data.categories!.includes(i.category));
    }

    // Filter by priorities if specified
    if (data.priorities && data.priorities.length > 0) {
      filteredInsights = filteredInsights.filter((i) => data.priorities!.includes(i.priority));
    }

    // Apply pagination
    const total = filteredInsights.length;
    const offset = data.offset || 0;
    const limit = data.limit || 10;
    filteredInsights = filteredInsights.slice(offset, offset + limit);

    // Calculate summary
    const byCategory: Record<InsightCategory, number> = {
      pattern: 0,
      anomaly: 0,
      trend: 0,
      opportunity: 0,
      risk: 0,
      recommendation: 0,
      achievement: 0,
    };

    const byPriority: Record<InsightPriority, number> = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
    };

    for (const insight of generated.insights) {
      byCategory[insight.category]++;
      byPriority[insight.priority]++;
    }

    return {
      insights: filteredInsights,
      total,
      summary: {
        byCategory,
        byPriority,
        unviewed: generated.insights.filter((i) => !i.viewedAt).length,
      },
      generatedAt: now,
    };
  });
