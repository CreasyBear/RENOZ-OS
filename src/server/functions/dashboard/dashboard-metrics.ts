/**
 * Dashboard Metrics Server Functions
 *
 * Server functions for dashboard metrics, summaries, and comparisons.
 * Uses Drizzle ORM with Zod validation.
 *
 * SECURITY: All functions use withAuth for authentication and
 * filter by organizationId for multi-tenant isolation.
 *
 * @see src/lib/schemas/dashboard/metrics.ts for validation schemas
 * @see drizzle/schema/dashboard/ for database schemas
 */

import { createServerFn } from '@tanstack/react-start';
import { eq, sql, and, gte, lte, desc, count } from 'drizzle-orm';
import { db } from '@/lib/db';
import { withAuth } from '@/lib/server/protected';
import { PERMISSIONS } from '@/lib/auth/permissions';
import {
  orders,
  customers,
  opportunities,
  activities,
} from '@/../drizzle/schema';
import { targets } from '@/../drizzle/schema/dashboard';
import {
  getDashboardMetricsSchema,
  getMetricsComparisonSchema,
  type MetricValue,
  type DashboardSummary,
  type ChartDataPoint,
  type ActivityItem,
  type DateRangePreset,
} from '@/lib/schemas/dashboard/metrics';

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Calculate date range from preset or custom dates.
 */
function calculateDateRange(params: {
  dateFrom?: string;
  dateTo?: string;
  preset?: string;
}): { from: Date; to: Date; preset: DateRangePreset | null } {
  const to = params.dateTo ? new Date(params.dateTo) : new Date();
  let from: Date;
  let preset: DateRangePreset | null = (params.preset as DateRangePreset) ?? null;

  if (params.dateFrom) {
    from = new Date(params.dateFrom);
    preset = 'custom';
  } else {
    // Default to 30d if no preset
    const presetValue = preset || '30d';
    switch (presetValue) {
      case '7d':
        from = new Date(to);
        from.setDate(from.getDate() - 7);
        break;
      case '30d':
        from = new Date(to);
        from.setDate(from.getDate() - 30);
        break;
      case '90d':
        from = new Date(to);
        from.setDate(from.getDate() - 90);
        break;
      case '365d':
        from = new Date(to);
        from.setFullYear(from.getFullYear() - 1);
        break;
      case 'this_week':
        from = new Date(to);
        from.setDate(from.getDate() - from.getDay());
        break;
      case 'this_month':
        from = new Date(to.getFullYear(), to.getMonth(), 1);
        break;
      case 'this_quarter':
        from = new Date(to.getFullYear(), Math.floor(to.getMonth() / 3) * 3, 1);
        break;
      case 'ytd':
        from = new Date(to.getFullYear(), 0, 1);
        break;
      default:
        from = new Date(to);
        from.setDate(from.getDate() - 30);
        preset = '30d';
    }
  }

  return { from, to, preset };
}

/**
 * Calculate comparison period dates.
 */
function calculateComparisonPeriod(
  currentFrom: Date,
  currentTo: Date,
  comparisonType: string
): { from: Date; to: Date } {
  const daysDiff = Math.ceil(
    (currentTo.getTime() - currentFrom.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (comparisonType === 'previous_year') {
    const from = new Date(currentFrom);
    from.setFullYear(from.getFullYear() - 1);
    const to = new Date(currentTo);
    to.setFullYear(to.getFullYear() - 1);
    return { from, to };
  }

  // Default: previous_period
  const to = new Date(currentFrom);
  to.setDate(to.getDate() - 1);
  const from = new Date(to);
  from.setDate(from.getDate() - daysDiff);
  return { from, to };
}

/**
 * Build metric value with change calculation.
 */
function buildMetricValue(
  current: number,
  previous: number,
  targetValue: number | null
): MetricValue {
  const change = previous === 0 ? 0 : ((current - previous) / previous) * 100;
  const changeAbsolute = current - previous;
  const targetProgress = targetValue ? (current / targetValue) * 100 : null;

  return {
    current,
    change: Math.round(change * 100) / 100,
    changeAbsolute,
    target: targetValue,
    targetProgress: targetProgress ? Math.round(targetProgress * 100) / 100 : null,
  };
}

// ============================================================================
// GET DASHBOARD METRICS
// ============================================================================

/**
 * Get comprehensive dashboard metrics including KPIs, charts, and activity.
 */
export const getDashboardMetrics = createServerFn({ method: 'GET' })
  .inputValidator(getDashboardMetricsSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.dashboard.read });
    const { from, to, preset } = calculateDateRange(data);

    // Build date conditions for orders
    const currentPeriod = and(
      eq(orders.organizationId, ctx.organizationId),
      gte(orders.orderDate, from.toISOString().split('T')[0]),
      lte(orders.orderDate, to.toISOString().split('T')[0])
    );

    // Previous period for comparison
    const comparison = calculateComparisonPeriod(from, to, data.comparePeriod || 'previous_period');
    const previousPeriod = and(
      eq(orders.organizationId, ctx.organizationId),
      gte(orders.orderDate, comparison.from.toISOString().split('T')[0]),
      lte(orders.orderDate, comparison.to.toISOString().split('T')[0])
    );

    // Get current period revenue (using total instead of grandTotal)
    const [currentRevenue] = await db
      .select({
        total: sql<number>`COALESCE(SUM(${orders.total}), 0)`,
        orderCount: count(),
      })
      .from(orders)
      .where(currentPeriod);

    // Get previous period revenue
    const [previousRevenue] = await db
      .select({
        total: sql<number>`COALESCE(SUM(${orders.total}), 0)`,
      })
      .from(orders)
      .where(previousPeriod);

    // Get customer counts
    const [currentCustomers] = await db
      .select({ count: count() })
      .from(customers)
      .where(
        and(
          eq(customers.organizationId, ctx.organizationId),
          sql`${customers.deletedAt} IS NULL`
        )
      );

    // Get pipeline value (opportunities not won or lost)
    const [pipelineData] = await db
      .select({
        total: sql<number>`COALESCE(SUM(${opportunities.value}), 0)`,
      })
      .from(opportunities)
      .where(
        and(
          eq(opportunities.organizationId, ctx.organizationId),
          sql`${opportunities.stage} NOT IN ('won', 'lost')`
        )
      );

    // Get targets for comparison
    const currentTargets = await db
      .select()
      .from(targets)
      .where(
        and(
          eq(targets.organizationId, ctx.organizationId),
          lte(targets.startDate, to.toISOString().split('T')[0]),
          gte(targets.endDate, from.toISOString().split('T')[0])
        )
      );

    const targetMap = new Map(currentTargets.map((t) => [t.metric, Number(t.targetValue)]));

    // Build summary
    const summary: DashboardSummary = {
      revenue: buildMetricValue(
        Number(currentRevenue?.total ?? 0),
        Number(previousRevenue?.total ?? 0),
        targetMap.get('revenue') ?? null
      ),
      kwhDeployed: buildMetricValue(0, 0, targetMap.get('kwh_deployed') ?? null),
      quoteWinRate: buildMetricValue(0, 0, targetMap.get('quote_win_rate') ?? null),
      activeInstallations: buildMetricValue(0, 0, targetMap.get('active_installations') ?? null),
      warrantyClaims: buildMetricValue(0, 0, targetMap.get('warranty_claims') ?? null),
      pipelineValue: buildMetricValue(
        Number(pipelineData?.total ?? 0),
        0,
        targetMap.get('pipeline_value') ?? null
      ),
      customerCount: buildMetricValue(
        Number(currentCustomers?.count ?? 0),
        0,
        targetMap.get('customer_count') ?? null
      ),
      ordersCount: buildMetricValue(
        Number(currentRevenue?.orderCount ?? 0),
        0,
        targetMap.get('orders_count') ?? null
      ),
    };

    // Get recent activity
    const recentActivityData = await db
      .select({
        id: activities.id,
        action: activities.action,
        description: activities.description,
        entityId: activities.entityId,
        entityType: activities.entityType,
        userId: activities.userId,
        createdAt: activities.createdAt,
      })
      .from(activities)
      .where(eq(activities.organizationId, ctx.organizationId))
      .orderBy(desc(activities.createdAt))
      .limit(10);

    const recentActivity: ActivityItem[] = recentActivityData.map((a) => ({
      id: a.id,
      type: mapActivityType(a.action),
      title: a.description ?? 'Activity',
      description: a.description,
      entityId: a.entityId ?? '',
      entityType: a.entityType ?? '',
      userId: a.userId,
      userName: null,
      createdAt: a.createdAt,
    }));

    // Build placeholder charts
    const charts = {
      revenueTrend: [] as ChartDataPoint[],
      kwhDeploymentTrend: [] as ChartDataPoint[],
      productMix: [] as ChartDataPoint[],
      pipelineByStage: [] as ChartDataPoint[],
      quoteConversionFunnel: [] as ChartDataPoint[],
    };

    return {
      summary,
      charts,
      recentActivity,
      dateRange: {
        from,
        to,
        preset,
      },
      comparisonEnabled: !!data.comparePeriod,
      lastUpdated: new Date(),
    };
  });

/**
 * Map activity type string to valid ActivityType enum value.
 */
function mapActivityType(type: string | null): 'quote' | 'installation' | 'warranty' | 'opportunity' | 'customer' | 'order' | 'job' {
  const typeMap: Record<string, 'quote' | 'installation' | 'warranty' | 'opportunity' | 'customer' | 'order' | 'job'> = {
    quote: 'quote',
    installation: 'installation',
    warranty: 'warranty',
    opportunity: 'opportunity',
    customer: 'customer',
    order: 'order',
    job: 'job',
  };
  return typeMap[type ?? ''] ?? 'customer';
}

// ============================================================================
// GET METRICS COMPARISON
// ============================================================================

/**
 * Get detailed metrics comparison between two periods.
 */
export const getMetricsComparison = createServerFn({ method: 'GET' })
  .inputValidator(getMetricsComparisonSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.dashboard.read });

    const currentFrom = new Date(data.dateFrom);
    const currentTo = new Date(data.dateTo);
    const previous = calculateComparisonPeriod(currentFrom, currentTo, data.comparisonType);

    // Get current period data
    const currentPeriodCondition = and(
      eq(orders.organizationId, ctx.organizationId),
      gte(orders.orderDate, data.dateFrom),
      lte(orders.orderDate, data.dateTo)
    );

    const [currentStats] = await db
      .select({
        revenue: sql<number>`COALESCE(SUM(${orders.total}), 0)`,
        ordersCount: count(),
      })
      .from(orders)
      .where(currentPeriodCondition);

    // Get previous period data
    const previousPeriodCondition = and(
      eq(orders.organizationId, ctx.organizationId),
      gte(orders.orderDate, previous.from.toISOString().split('T')[0]),
      lte(orders.orderDate, previous.to.toISOString().split('T')[0])
    );

    const [previousStats] = await db
      .select({
        revenue: sql<number>`COALESCE(SUM(${orders.total}), 0)`,
        ordersCount: count(),
      })
      .from(orders)
      .where(previousPeriodCondition);

    // Build summary for current period
    const current: DashboardSummary = {
      revenue: buildMetricValue(Number(currentStats?.revenue ?? 0), 0, null),
      kwhDeployed: buildMetricValue(0, 0, null),
      quoteWinRate: buildMetricValue(0, 0, null),
      activeInstallations: buildMetricValue(0, 0, null),
      warrantyClaims: buildMetricValue(0, 0, null),
      pipelineValue: buildMetricValue(0, 0, null),
      customerCount: buildMetricValue(0, 0, null),
      ordersCount: buildMetricValue(Number(currentStats?.ordersCount ?? 0), 0, null),
    };

    // Build summary for previous period
    const previousSummary: DashboardSummary = {
      revenue: buildMetricValue(Number(previousStats?.revenue ?? 0), 0, null),
      kwhDeployed: buildMetricValue(0, 0, null),
      quoteWinRate: buildMetricValue(0, 0, null),
      activeInstallations: buildMetricValue(0, 0, null),
      warrantyClaims: buildMetricValue(0, 0, null),
      pipelineValue: buildMetricValue(0, 0, null),
      customerCount: buildMetricValue(0, 0, null),
      ordersCount: buildMetricValue(Number(previousStats?.ordersCount ?? 0), 0, null),
    };

    // Calculate changes
    const changes: Record<string, number> = {
      revenue:
        Number(previousStats?.revenue) === 0
          ? 0
          : ((Number(currentStats?.revenue) - Number(previousStats?.revenue)) /
              Number(previousStats?.revenue)) *
            100,
      ordersCount:
        Number(previousStats?.ordersCount) === 0
          ? 0
          : ((Number(currentStats?.ordersCount) - Number(previousStats?.ordersCount)) /
              Number(previousStats?.ordersCount)) *
            100,
    };

    return {
      current,
      previous: previousSummary,
      changes,
      insights: [],
      comparisonPeriod: {
        currentFrom,
        currentTo,
        previousFrom: previous.from,
        previousTo: previous.to,
      },
    };
  });
