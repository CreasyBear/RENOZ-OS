/**
 * Dashboard Metrics Server Functions
 *
 * Server functions for dashboard metrics, summaries, and comparisons.
 * Uses Drizzle ORM with Zod validation.
 *
 * PERFORMANCE: Uses hybrid query strategy:
 * - Materialized views for historical data (> 1 day old)
 * - Live table queries for today's data (real-time accuracy)
 * - Redis caching for frequently accessed ranges
 *
 * SECURITY: All functions use withAuth for authentication and
 * filter by organizationId for multi-tenant isolation.
 *
 * @see src/lib/schemas/dashboard/metrics.ts for validation schemas
 * @see drizzle/schema/dashboard/ for database schemas
 * @see dashboard.prd.json DASH-PERF-HYBRID
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
} from 'drizzle/schema';
import { jobAssignments } from 'drizzle/schema/jobs';
import { warrantyClaims } from 'drizzle/schema/warranty/warranty-claims';
import { targets } from 'drizzle/schema/dashboard';
import {
  getDashboardMetricsSchema,
  getMetricsComparisonSchema,
  type MetricValue,
  type DashboardSummary,
  type ChartDataPoint,
  type ActivityItem,
  type DateRangePreset,
} from '@/lib/schemas/dashboard/metrics';
import { DashboardCache } from '@/lib/cache/dashboard-cache';

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
// HYBRID QUERY STRATEGY
// ============================================================================

/**
 * Check if the date range includes today.
 * Used to determine if we need live data for current day accuracy.
 */
function includesToday(to: Date): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const toDate = new Date(to);
  toDate.setHours(0, 0, 0, 0);
  return toDate >= today;
}

/**
 * Get yesterday's date string for MV boundary.
 */
function getYesterdayStr(): string {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return yesterday.toISOString().split('T')[0];
}

/**
 * Get today's date string.
 */
function getTodayStr(): string {
  return new Date().toISOString().split('T')[0];
}

/**
 * Query metrics from materialized views (for historical data).
 * Fast because data is pre-aggregated.
 */
async function queryMetricsFromMV(
  organizationId: string,
  dateFrom: string,
  dateTo: string
): Promise<{
  revenue: number;
  ordersCount: number;
  customerCount: number;
  pipelineValue: number;
  activeJobs: number;
  openClaims: number;
}> {
  // Run all MV queries in parallel for better performance
  const [orderMetricsResult, pipelineMetricsResult, jobMetricsResult, claimMetricsResult] =
    await Promise.all([
      // Query mv_daily_metrics for orders/revenue
      db.execute<{
        orders_count: string;
        revenue: string;
        customer_count: string;
      }>(sql`
        SELECT
          COALESCE(SUM(orders_count), 0) as orders_count,
          COALESCE(SUM(revenue), 0) as revenue,
          COALESCE(SUM(customer_count), 0) as customer_count
        FROM mv_daily_metrics
        WHERE organization_id = ${organizationId}
          AND metric_date >= ${dateFrom}::date
          AND metric_date <= ${dateTo}::date
      `),

      // Query mv_daily_pipeline for pipeline value
      db.execute<{
        total_value: string;
      }>(sql`
        SELECT COALESCE(SUM(total_value), 0) as total_value
        FROM mv_daily_pipeline
        WHERE organization_id = ${organizationId}
          AND metric_date >= ${dateFrom}::date
          AND metric_date <= ${dateTo}::date
          AND stage NOT IN ('won', 'lost')
      `),

      // Query mv_daily_jobs for active jobs
      db.execute<{
        active_count: string;
      }>(sql`
        SELECT COALESCE(SUM(job_count), 0) as active_count
        FROM mv_daily_jobs
        WHERE organization_id = ${organizationId}
          AND metric_date >= ${dateFrom}::date
          AND metric_date <= ${dateTo}::date
          AND status IN ('scheduled', 'in_progress')
      `),

      // Query mv_daily_warranty for open claims
      db.execute<{
        open_count: string;
      }>(sql`
        SELECT COALESCE(SUM(claim_count), 0) as open_count
        FROM mv_daily_warranty
        WHERE organization_id = ${organizationId}
          AND metric_date >= ${dateFrom}::date
          AND metric_date <= ${dateTo}::date
          AND status IN ('submitted', 'under_review', 'approved')
      `),
    ]);

  // Extract first row from each result
  const orderMetrics = orderMetricsResult[0];
  const pipelineMetrics = pipelineMetricsResult[0];
  const jobMetrics = jobMetricsResult[0];
  const claimMetrics = claimMetricsResult[0];

  return {
    revenue: Number(orderMetrics?.revenue ?? 0),
    ordersCount: Number(orderMetrics?.orders_count ?? 0),
    customerCount: Number(orderMetrics?.customer_count ?? 0),
    pipelineValue: Number(pipelineMetrics?.total_value ?? 0),
    activeJobs: Number(jobMetrics?.active_count ?? 0),
    openClaims: Number(claimMetrics?.open_count ?? 0),
  };
}

/**
 * Query today's metrics from live tables (for real-time accuracy).
 */
async function queryTodayMetricsLive(
  organizationId: string
): Promise<{
  revenue: number;
  ordersCount: number;
  customerCount: number;
  pipelineValue: number;
  activeJobs: number;
  openClaims: number;
}> {
  const today = getTodayStr();

  // Run all live queries in parallel for better performance
  const [todayOrdersResult, todayCustomersResult, pipelineDataResult, activeJobsResult, openClaimsResult] =
    await Promise.all([
      // Today's orders
      db
        .select({
          total: sql<number>`COALESCE(SUM(${orders.total}), 0)`,
          orderCount: count(),
        })
        .from(orders)
        .where(
          and(
            eq(orders.organizationId, organizationId),
            sql`DATE(${orders.orderDate}) = ${today}::date`,
            sql`${orders.deletedAt} IS NULL`
          )
        ),

      // Today's new customers
      db
        .select({ count: count() })
        .from(customers)
        .where(
          and(
            eq(customers.organizationId, organizationId),
            sql`DATE(${customers.createdAt}) = ${today}::date`,
            sql`${customers.deletedAt} IS NULL`
          )
        ),

      // Current pipeline value (always live - it's current state)
      db
        .select({
          total: sql<number>`COALESCE(SUM(${opportunities.value}), 0)`,
        })
        .from(opportunities)
        .where(
          and(
            eq(opportunities.organizationId, organizationId),
            sql`${opportunities.stage} NOT IN ('won', 'lost')`,
            sql`${opportunities.deletedAt} IS NULL`
          )
        ),

      // Active jobs (current state)
      db
        .select({ count: count() })
        .from(jobAssignments)
        .where(
          and(
            eq(jobAssignments.organizationId, organizationId),
            sql`${jobAssignments.status} IN ('scheduled', 'in_progress')`
          )
        ),

      // Open claims (current state)
      db
        .select({ count: count() })
        .from(warrantyClaims)
        .where(
          and(
            eq(warrantyClaims.organizationId, organizationId),
            sql`${warrantyClaims.status} IN ('submitted', 'under_review', 'approved')`
          )
        ),
    ]);

  // Extract first row from each result
  const todayOrders = todayOrdersResult[0];
  const todayCustomers = todayCustomersResult[0];
  const pipelineData = pipelineDataResult[0];
  const activeJobs = activeJobsResult[0];
  const openClaims = openClaimsResult[0];

  return {
    revenue: Number(todayOrders?.total ?? 0),
    ordersCount: Number(todayOrders?.orderCount ?? 0),
    customerCount: Number(todayCustomers?.count ?? 0),
    pipelineValue: Number(pipelineData?.total ?? 0),
    activeJobs: Number(activeJobs?.count ?? 0),
    openClaims: Number(openClaims?.count ?? 0),
  };
}

/**
 * Hybrid query: combines MV data for historical + live data for today.
 */
async function getMetricsHybrid(
  organizationId: string,
  dateFrom: Date,
  dateTo: Date
): Promise<{
  revenue: number;
  ordersCount: number;
  customerCount: number;
  pipelineValue: number;
  activeJobs: number;
  openClaims: number;
  dataSource: 'mv' | 'hybrid' | 'live';
}> {
  const dateFromStr = dateFrom.toISOString().split('T')[0];
  const dateToStr = dateTo.toISOString().split('T')[0];
  const needsToday = includesToday(dateTo);
  const yesterdayStr = getYesterdayStr();
  const todayStr = getTodayStr();

  // If date range is entirely in the past, use MV only
  if (!needsToday) {
    const mvMetrics = await queryMetricsFromMV(organizationId, dateFromStr, dateToStr);
    return { ...mvMetrics, dataSource: 'mv' };
  }

  // If date range is only today, use live only
  if (dateFromStr === todayStr) {
    const liveMetrics = await queryTodayMetricsLive(organizationId);
    return { ...liveMetrics, dataSource: 'live' };
  }

  // Hybrid: MV for historical (up to yesterday) + live for today
  const [mvMetrics, todayMetrics] = await Promise.all([
    queryMetricsFromMV(organizationId, dateFromStr, yesterdayStr),
    queryTodayMetricsLive(organizationId),
  ]);

  return {
    revenue: mvMetrics.revenue + todayMetrics.revenue,
    ordersCount: mvMetrics.ordersCount + todayMetrics.ordersCount,
    customerCount: mvMetrics.customerCount + todayMetrics.customerCount,
    // Pipeline and jobs/claims are current state, so use live values
    pipelineValue: todayMetrics.pipelineValue,
    activeJobs: todayMetrics.activeJobs,
    openClaims: todayMetrics.openClaims,
    dataSource: 'hybrid',
  };
}

// ============================================================================
// GET DASHBOARD METRICS
// ============================================================================

/**
 * Get comprehensive dashboard metrics including KPIs, charts, and activity.
 *
 * PERFORMANCE: Uses hybrid query strategy:
 * 1. Check Redis cache first (5min TTL)
 * 2. If cache miss, use MVs for historical data + live tables for today
 * 3. Cache the result for future requests
 */
export const getDashboardMetrics = createServerFn({ method: 'GET' })
  .inputValidator(getDashboardMetricsSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.dashboard.read });
    const { from, to, preset } = calculateDateRange(data);

    const dateFromStr = from.toISOString().split('T')[0];
    const dateToStr = to.toISOString().split('T')[0];

    // Try cache first (skip for ranges that include today - need fresh data)
    const cacheKey = {
      orgId: ctx.organizationId,
      dateFrom: dateFromStr,
      dateTo: dateToStr,
      preset: preset ?? undefined,
    };

    // Only use cache for purely historical ranges (no today's data)
    const needsFreshData = includesToday(to);
    if (!needsFreshData) {
      const cached = await DashboardCache.getMetrics<DashboardMetricsResponse>(cacheKey);
      if (cached) {
        return {
          ...cached,
          cacheHit: true as const,
        };
      }
    }

    // Get current period metrics using hybrid strategy
    const currentMetrics = await getMetricsHybrid(ctx.organizationId, from, to);

    // Previous period for comparison (always historical, so use MV)
    const comparison = calculateComparisonPeriod(from, to, data.comparePeriod || 'previous_period');
    const previousMetrics = await queryMetricsFromMV(
      ctx.organizationId,
      comparison.from.toISOString().split('T')[0],
      comparison.to.toISOString().split('T')[0]
    );

    // Get targets for comparison
    const currentTargets = await db
      .select()
      .from(targets)
      .where(
        and(
          eq(targets.organizationId, ctx.organizationId),
          lte(targets.startDate, dateToStr),
          gte(targets.endDate, dateFromStr)
        )
      );

    const targetMap = new Map(currentTargets.map((t) => [t.metric, Number(t.targetValue)]));

    // Build summary with hybrid metrics
    const summary: DashboardSummary = {
      revenue: buildMetricValue(
        currentMetrics.revenue,
        previousMetrics.revenue,
        targetMap.get('revenue') ?? null
      ),
      kwhDeployed: buildMetricValue(0, 0, targetMap.get('kwh_deployed') ?? null),
      quoteWinRate: buildMetricValue(0, 0, targetMap.get('quote_win_rate') ?? null),
      activeInstallations: buildMetricValue(
        currentMetrics.activeJobs,
        previousMetrics.activeJobs,
        targetMap.get('active_installations') ?? null
      ),
      warrantyClaims: buildMetricValue(
        currentMetrics.openClaims,
        previousMetrics.openClaims,
        targetMap.get('warranty_claims') ?? null
      ),
      pipelineValue: buildMetricValue(
        currentMetrics.pipelineValue,
        previousMetrics.pipelineValue,
        targetMap.get('pipeline_value') ?? null
      ),
      customerCount: buildMetricValue(
        currentMetrics.customerCount,
        previousMetrics.customerCount,
        targetMap.get('customer_count') ?? null
      ),
      ordersCount: buildMetricValue(
        currentMetrics.ordersCount,
        previousMetrics.ordersCount,
        targetMap.get('orders_count') ?? null
      ),
    };

    // Get recent activity (always live - it's a feed)
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

    // Build placeholder charts (to be implemented with MV data)
    const charts = {
      revenueTrend: [] as ChartDataPoint[],
      kwhDeploymentTrend: [] as ChartDataPoint[],
      productMix: [] as ChartDataPoint[],
      pipelineByStage: [] as ChartDataPoint[],
      quoteConversionFunnel: [] as ChartDataPoint[],
    };

    const result = {
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
      cacheHit: false as const,
    };

    // Cache the result (only for historical ranges)
    if (!needsFreshData) {
      await DashboardCache.setMetrics(cacheKey, result);
    }

    return result;
  });

/**
 * Response type for getDashboardMetrics (internal use for caching).
 */
interface DashboardMetricsResponse {
  summary: DashboardSummary;
  charts: {
    revenueTrend: ChartDataPoint[];
    kwhDeploymentTrend: ChartDataPoint[];
    productMix: ChartDataPoint[];
    pipelineByStage: ChartDataPoint[];
    quoteConversionFunnel: ChartDataPoint[];
  };
  recentActivity: ActivityItem[];
  dateRange: {
    from: Date;
    to: Date;
    preset: DateRangePreset | null;
  };
  comparisonEnabled: boolean;
  lastUpdated: Date;
  cacheHit: boolean;
  dataSource?: 'mv' | 'hybrid' | 'live';
}

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

    // Get current and previous period data in parallel
    const currentPeriodCondition = and(
      eq(orders.organizationId, ctx.organizationId),
      gte(orders.orderDate, data.dateFrom),
      lte(orders.orderDate, data.dateTo)
    );

    const previousPeriodCondition = and(
      eq(orders.organizationId, ctx.organizationId),
      gte(orders.orderDate, previous.from.toISOString().split('T')[0]),
      lte(orders.orderDate, previous.to.toISOString().split('T')[0])
    );

    const [currentStatsResult, previousStatsResult] = await Promise.all([
      db
        .select({
          revenue: sql<number>`COALESCE(SUM(${orders.total}), 0)`,
          ordersCount: count(),
        })
        .from(orders)
        .where(currentPeriodCondition),

      db
        .select({
          revenue: sql<number>`COALESCE(SUM(${orders.total}), 0)`,
          ordersCount: count(),
        })
        .from(orders)
        .where(previousPeriodCondition),
    ]);

    const currentStats = currentStatsResult[0];
    const previousStats = previousStatsResult[0];

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
