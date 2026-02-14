'use server';

/**
 * Dashboard Metrics Server Functions
 *
 * ⚠️ SERVER-ONLY: Uses Drizzle ORM and database access.
 *
 * Server functions for dashboard metrics, summaries, and comparisons.
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
import { eq, sql, and, gte, lte, desc, count, isNull, inArray, not, notInArray, or, ilike } from 'drizzle-orm';
import { db } from '@/lib/db';
import { containsPattern } from '@/lib/db/utils';
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
import {
  targets,
  mvDailyMetrics,
  mvDailyPipeline,
  mvDailyJobs,
  mvDailyWarranty,
} from 'drizzle/schema/dashboard';
import {
  getDashboardMetricsSchema,
  getMetricsComparisonSchema,
  type MetricValue,
  type DashboardSummary,
  type ChartDataPoint,
  type ActivityItem,
  type DateRangePreset,
} from '@/lib/schemas/dashboard/metrics';
import { logger } from '@/lib/logger';
import {
  getInventoryCountsByProductIdsInputSchema,
  getInventoryCountsBySkusInputSchema,
} from '@/lib/schemas/dashboard/tracked-products';
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
 * Falls back to live queries if MVs don't exist.
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
  try {
    // Run all MV queries in parallel for better performance
    // Column names match actual DB per schema-snapshot-matviews.json
    const [orderMetricsRows, pipelineMetricsRows, jobMetricsRows, claimMetricsRows] =
      await Promise.all([
        // Query mv_daily_metrics for orders/revenue (day, orders_total, customers_count)
        db
          .select({
            orders_count: sql<string>`COALESCE(SUM(${mvDailyMetrics.ordersCount}), 0)`,
            revenue: sql<string>`COALESCE(SUM(${mvDailyMetrics.ordersTotal}), 0)`,
            customer_count: sql<string>`COALESCE(SUM(${mvDailyMetrics.customersCount}), 0)`,
          })
          .from(mvDailyMetrics)
          // RAW SQL (Phase 11 Keep): Materialized view date filters. See PHASE11-RAW-SQL-AUDIT.md
          .where(
            and(
              eq(mvDailyMetrics.organizationId, organizationId),
              gte(mvDailyMetrics.day, sql`${dateFrom}::date`),
              lte(mvDailyMetrics.day, sql`${dateTo}::date`)
            )
          ),

        // Query mv_daily_pipeline for pipeline value (exclude won/lost)
        db
          .select({
            total_value: sql<string>`COALESCE(SUM(${mvDailyPipeline.totalValue}), 0)`,
          })
          .from(mvDailyPipeline)
          .where(
            and(
              eq(mvDailyPipeline.organizationId, organizationId),
              gte(mvDailyPipeline.day, sql`${dateFrom}::date`),
              lte(mvDailyPipeline.day, sql`${dateTo}::date`),
              notInArray(mvDailyPipeline.stage, ['won', 'lost'])
            )
          ),

        // Query mv_daily_jobs for active jobs (in_progress + on_hold)
        db
          .select({
            active_count: sql<string>`(COALESCE(SUM(${mvDailyJobs.inProgressJobs}), 0) + COALESCE(SUM(${mvDailyJobs.onHoldJobs}), 0))::text`,
          })
          .from(mvDailyJobs)
          .where(
            and(
              eq(mvDailyJobs.organizationId, organizationId),
              gte(mvDailyJobs.day, sql`${dateFrom}::date`),
              lte(mvDailyJobs.day, sql`${dateTo}::date`)
            )
          ),

        // Query mv_daily_warranty for open claims (submitted + under_review + approved)
        db
          .select({
            open_count: sql<string>`(COALESCE(SUM(${mvDailyWarranty.submittedClaims}), 0) + COALESCE(SUM(${mvDailyWarranty.underReviewClaims}), 0) + COALESCE(SUM(${mvDailyWarranty.approvedClaims}), 0))::text`,
          })
          .from(mvDailyWarranty)
          .where(
            and(
              eq(mvDailyWarranty.organizationId, organizationId),
              gte(mvDailyWarranty.day, sql`${dateFrom}::date`),
              lte(mvDailyWarranty.day, sql`${dateTo}::date`)
            )
          ),
      ]);

    // Extract first row from each result
    const orderMetrics = orderMetricsRows[0];
    const pipelineMetrics = pipelineMetricsRows[0];
    const jobMetrics = jobMetricsRows[0];
    const claimMetrics = claimMetricsRows[0];

    return {
      revenue: Number(orderMetrics?.revenue ?? 0),
      ordersCount: Number(orderMetrics?.orders_count ?? 0),
      customerCount: Number(orderMetrics?.customer_count ?? 0),
      pipelineValue: Number(pipelineMetrics?.total_value ?? 0),
      activeJobs: Number(jobMetrics?.active_count ?? 0),
      openClaims: Number(claimMetrics?.open_count ?? 0),
    };
  } catch (error) {
    // MVs don't exist yet - fall back to live queries
    logger.warn('Materialized views not available, falling back to live queries', { error });
    return queryMetricsLive(organizationId, dateFrom, dateTo);
  }
}

/**
 * Query metrics from live tables (fallback when MVs don't exist).
 */
async function queryMetricsLive(
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
  const [ordersResult, customersResult, pipelineResult, jobsResult, claimsResult] = await Promise.all([
    // Orders and revenue
    db
      .select({
        total: sql<number>`COALESCE(SUM(${orders.total}), 0)`,
        count: count(),
      })
      .from(orders)
      .where(
        and(
          eq(orders.organizationId, organizationId),
          sql`${orders.orderDate} >= ${dateFrom}::date`,
          sql`${orders.orderDate} <= ${dateTo}::date`,
          isNull(orders.deletedAt)
        )
      ),

    // New customers
    db
      .select({ count: count() })
      .from(customers)
      .where(
        and(
          eq(customers.organizationId, organizationId),
          sql`${customers.createdAt} >= ${dateFrom}::date`,
          sql`${customers.createdAt} <= ${dateTo}::date`,
          isNull(customers.deletedAt)
        )
      ),

    // Pipeline value (current state, not date-filtered)
    db
      .select({
        total: sql<number>`COALESCE(SUM(${opportunities.value}), 0)`,
      })
      .from(opportunities)
      .where(
        and(
          eq(opportunities.organizationId, organizationId),
          not(inArray(opportunities.stage, ['won', 'lost'])),
          isNull(opportunities.deletedAt)
        )
      ),

    // Active jobs (current state)
    db
      .select({ count: count() })
      .from(jobAssignments)
      .where(
        and(
          eq(jobAssignments.organizationId, organizationId),
          inArray(jobAssignments.status, ['scheduled', 'in_progress'])
        )
      ),

    // Open warranty claims (current state)
    db
      .select({ count: count() })
      .from(warrantyClaims)
      .where(
        and(
          eq(warrantyClaims.organizationId, organizationId),
          inArray(warrantyClaims.status, ['submitted', 'under_review', 'approved'])
        )
      ),
  ]);

  return {
    revenue: Number(ordersResult[0]?.total ?? 0),
    ordersCount: Number(ordersResult[0]?.count ?? 0),
    customerCount: Number(customersResult[0]?.count ?? 0),
    pipelineValue: Number(pipelineResult[0]?.total ?? 0),
    activeJobs: Number(jobsResult[0]?.count ?? 0),
    openClaims: Number(claimsResult[0]?.count ?? 0),
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
            isNull(orders.deletedAt)
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
            isNull(customers.deletedAt)
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
            not(inArray(opportunities.stage, ['won', 'lost'])),
            isNull(opportunities.deletedAt)
          )
        ),

      // Active jobs (current state)
      db
        .select({ count: count() })
        .from(jobAssignments)
        .where(
          and(
            eq(jobAssignments.organizationId, organizationId),
            inArray(jobAssignments.status, ['scheduled', 'in_progress'])
          )
        ),

      // Open claims (current state)
      db
        .select({ count: count() })
        .from(warrantyClaims)
        .where(
          and(
            eq(warrantyClaims.organizationId, organizationId),
            inArray(warrantyClaims.status, ['submitted', 'under_review', 'approved'])
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
  // Type annotation removed to avoid Zod schema inference conflicts with metadata Record<string, unknown>
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.dashboard.read });
    const { from, to, preset } = calculateDateRange(data);

    const dateFromStr = from.toISOString().split('T')[0];
    const dateToStr = to.toISOString().split('T')[0];
    const needsFreshData = includesToday(to);

    // Try cache first (skip for ranges that include today - need fresh data)
    const cacheKey = {
      orgId: ctx.organizationId,
      dateFrom: dateFromStr,
      dateTo: dateToStr,
      preset: preset ?? undefined,
    };

    // Only use cache for purely historical ranges (no today's data)
    if (!needsFreshData) {
      const cached = await DashboardCache.getMetrics<DashboardMetricsResponse>(cacheKey);
      if (cached) {
        const dr = cached.dateRange;
        return {
          ...cached,
          dateRange: {
            from: dr.from instanceof Date ? dr.from.toISOString() : dr.from,
            to: dr.to instanceof Date ? dr.to.toISOString() : dr.to,
            preset: dr.preset,
          },
          lastUpdated: cached.lastUpdated instanceof Date
            ? cached.lastUpdated.toISOString()
            : cached.lastUpdated,
          cacheHit: true as const,
        };
      }
    }

    // Get current period, previous period, targets, and recent activity in parallel
    const comparison = calculateComparisonPeriod(from, to, data.comparePeriod || 'previous_period');
    const [currentMetrics, previousMetrics, currentTargets, recentActivityData] = await Promise.all([
      getMetricsHybrid(ctx.organizationId, from, to),
      queryMetricsFromMV(
        ctx.organizationId,
        comparison.from.toISOString().split('T')[0],
        comparison.to.toISOString().split('T')[0]
      ),
      db
        .select()
        .from(targets)
        .where(
          and(
            eq(targets.organizationId, ctx.organizationId),
            lte(targets.startDate, dateToStr),
            gte(targets.endDate, dateFromStr)
          )
        ),
      db
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
        .limit(10),
    ]);

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
        from: from.toISOString(),
        to: to.toISOString(),
        preset,
      },
      comparisonEnabled: !!data.comparePeriod,
      lastUpdated: new Date().toISOString(),
      cacheHit: false as const,
    };

    // Cache the result (only for historical ranges)
    if (!needsFreshData) {
      await DashboardCache.setMetrics(cacheKey, result);
    }

    logger.debug('[getDashboardMetrics] returning', {
      orgId: ctx.organizationId,
      dateRange: { from: dateFromStr, to: dateToStr },
      hasSummary: !!result.summary,
    });
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

// ============================================================================
// GET INVENTORY COUNTS BY SKU
// ============================================================================

/**
 * Get inventory counts for specific SKU patterns.
 * Used for dashboard widgets showing key product stock levels.
 *
 * @example
 * // Get counts for battery units and mounting kits
 * const result = await getInventoryCountsBySkus({
 *   data: {
 *     skuPatterns: [
 *       { key: 'batteries', patterns: ['lv-5kwh100ah'] },
 *       { key: 'kits', patterns: ['lv-top', 'lv-bottom'] },
 *     ]
 *   }
 * });
 */
export const getInventoryCountsBySkus = createServerFn({ method: 'GET' })
  .inputValidator(getInventoryCountsBySkusInputSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.inventory.read });

    // Import inventory and products tables
    const { inventory, products } = await import('drizzle/schema');

    const results: Record<string, { totalQuantity: number; productCount: number; products: Array<{ sku: string; name: string; quantity: number }> }> = {};

    // Query for each SKU pattern group
    for (const { key, patterns } of data.skuPatterns) {
      // Build OR conditions for all patterns (case-insensitive, safe from pattern injection)
      const patternConditions = patterns.map((pattern) => ilike(products.sku, containsPattern(pattern)));
      const skuCondition = patternConditions.length > 0 ? or(...patternConditions)! : sql`1=0`;

      const inventoryData = await db
        .select({
          sku: products.sku,
          name: products.name,
          quantityOnHand: sql<number>`COALESCE(SUM(${inventory.quantityOnHand}), 0)::int`,
        })
        .from(products)
        .leftJoin(
          inventory,
          and(
            eq(inventory.productId, products.id),
            eq(inventory.organizationId, ctx.organizationId)
          )
        )
        .where(
          and(
            eq(products.organizationId, ctx.organizationId),
            isNull(products.deletedAt),
            skuCondition
          )
        )
        .groupBy(products.id, products.sku, products.name);

      const totalQuantity = inventoryData.reduce((sum, item) => sum + Number(item.quantityOnHand), 0);

      results[key] = {
        totalQuantity,
        productCount: inventoryData.length,
        products: inventoryData.map((item) => ({
          sku: item.sku ?? '',
          name: item.name,
          quantity: Number(item.quantityOnHand),
        })),
      };
    }

    return results;
  });

// ============================================================================
// GET INVENTORY COUNTS BY PRODUCT IDS
// ============================================================================

/**
 * Get inventory counts for specific product IDs.
 * Simpler version that takes exact product IDs instead of SKU patterns.
 * Used by the tracked products feature on the dashboard.
 *
 * @example
 * const result = await getInventoryCountsByProductIds({
 *   data: { productIds: ['uuid-1', 'uuid-2'] }
 * });
 * // Returns: { 'uuid-1': { totalQuantity: 10, ... }, 'uuid-2': { ... } }
 */
export const getInventoryCountsByProductIds = createServerFn({ method: 'GET' })
  .inputValidator(getInventoryCountsByProductIdsInputSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.inventory.read });

    if (data.productIds.length === 0) {
      return {};
    }

    // Import inventory and products tables
    const { inventory, products } = await import('drizzle/schema');
    const { inArray } = await import('drizzle-orm');

    // Query inventory for the specified product IDs
    const inventoryData = await db
      .select({
        productId: products.id,
        sku: products.sku,
        name: products.name,
        quantityOnHand: sql<number>`COALESCE(SUM(${inventory.quantityOnHand}), 0)::int`,
        quantityAvailable: sql<number>`COALESCE(SUM(${inventory.quantityAvailable}), 0)::int`,
      })
      .from(products)
      .leftJoin(
        inventory,
        and(
          eq(inventory.productId, products.id),
          eq(inventory.organizationId, ctx.organizationId)
        )
      )
      .where(
        and(
          eq(products.organizationId, ctx.organizationId),
          isNull(products.deletedAt),
          inArray(products.id, data.productIds)
        )
      )
      .groupBy(products.id, products.sku, products.name);

    // Build result map keyed by product ID
    const results: Record<
      string,
      {
        productId: string;
        sku: string;
        name: string;
        totalQuantity: number;
        availableQuantity: number;
      }
    > = {};

    for (const item of inventoryData) {
      results[item.productId] = {
        productId: item.productId,
        sku: item.sku ?? '',
        name: item.name,
        totalQuantity: Number(item.quantityOnHand),
        availableQuantity: Number(item.quantityAvailable),
      };
    }

    return results;
  });
