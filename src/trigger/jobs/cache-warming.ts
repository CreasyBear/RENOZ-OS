'use server'

/**
 * Cache Warming Background Tasks (Trigger.dev v3)
 *
 * Scheduled tasks for proactively warming the dashboard cache:
 * 1. warmDashboardCacheTask: Warms cache for all active organizations
 * 2. warmOrgCacheTask: Warms cache for a specific organization (event-triggered)
 *
 * @see dashboard.prd.json DASH-PERF-CACHE
 * @see docs/plans/2026-01-25-feat-dashboard-performance-infrastructure-plan.md
 * @see https://trigger.dev/docs/v3/tasks
 */
import { task, schedules, logger } from "@trigger.dev/sdk/v3";
import { sql, and, eq, gte, lte, count, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { DashboardCache } from "@/lib/cache/dashboard-cache";
import { organizations } from "drizzle/schema/settings/organizations";
import {
  mvDailyMetrics,
  mvDailyPipeline,
  mvDailyJobs,
  mvDailyWarranty,
} from "drizzle/schema/dashboard/materialized-views";
import { customers } from "drizzle/schema";

// ============================================================================
// TYPES
// ============================================================================

interface DashboardMetricsSummary {
  orders: { count: number; revenue: number };
  pipeline: { value: number; count: number };
  jobs: { active: number; scheduled: number };
  claims: { open: number; total: number };
  customers: { total: number; new: number };
}

interface DateRange {
  label: string;
  from: Date;
  to: Date;
}

export interface WarmDashboardCacheResult {
  organizationCount: number;
  dateRanges: string[];
  warmedCount?: number;
  errorCount?: number;
  durationMs: number;
  warmedAt: string;
}

export interface WarmOrgCachePayload {
  organizationId: string;
  dateRanges?: string[];
}

export interface WarmOrgCacheResult {
  success: boolean;
  organizationId: string;
  dateRanges: string[];
  warmedCount: number;
  durationMs: number;
  warmedAt: string;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get date ranges to warm cache for.
 * Focuses on commonly accessed ranges: today, this week, this month.
 */
function getCacheWarmDateRanges(): DateRange[] {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  // Start of this week (Monday)
  const startOfWeek = new Date(today);
  const dayOfWeek = today.getDay();
  const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  startOfWeek.setDate(today.getDate() - daysFromMonday);

  // Start of this month
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

  // Start of last 7 days
  const last7Days = new Date(today);
  last7Days.setDate(today.getDate() - 6);

  // Start of last 30 days
  const last30Days = new Date(today);
  last30Days.setDate(today.getDate() - 29);

  return [
    { label: "today", from: today, to: now },
    { label: "thisWeek", from: startOfWeek, to: now },
    { label: "thisMonth", from: startOfMonth, to: now },
    { label: "last7Days", from: last7Days, to: now },
    { label: "last30Days", from: last30Days, to: now },
  ];
}

/**
 * Fetch dashboard metrics from materialized views for a date range.
 * Uses the MVs we created for fast aggregation.
 */
async function fetchMetricsFromMV(
  organizationId: string,
  dateFrom: Date,
  dateTo: Date
): Promise<DashboardMetricsSummary> {
  const dateFromStr = dateFrom.toISOString().split("T")[0];
  const dateToStr = dateTo.toISOString().split("T")[0];

  // Query the materialized views (column names match schema-snapshot-matviews.json)
  const [ordersResult] = await db
    .select({
      orders_count: sql<string>`COALESCE(SUM(${mvDailyMetrics.ordersCount}), 0)`,
      revenue: sql<string>`COALESCE(SUM(${mvDailyMetrics.ordersTotal}), 0)`,
    })
    .from(mvDailyMetrics)
    .where(
      and(
        eq(mvDailyMetrics.organizationId, organizationId),
        gte(mvDailyMetrics.day, sql`${dateFromStr}::date`),
        lte(mvDailyMetrics.day, sql`${dateToStr}::date`)
      )
    );

  const [pipelineResult] = await db
    .select({
      opportunity_count: sql<string>`COALESCE(SUM(${mvDailyPipeline.opportunitiesCount}), 0)`,
      total_value: sql<string>`COALESCE(SUM(${mvDailyPipeline.totalValue}), 0)`,
    })
    .from(mvDailyPipeline)
    .where(
      and(
        eq(mvDailyPipeline.organizationId, organizationId),
        gte(mvDailyPipeline.day, sql`${dateFromStr}::date`),
        lte(mvDailyPipeline.day, sql`${dateToStr}::date`)
      )
    );

  const [jobsResult] = await db
    .select({
      scheduled: sql<string>`GREATEST(0, COALESCE(SUM(${mvDailyJobs.totalJobs}), 0) - COALESCE(SUM(${mvDailyJobs.completedJobs}), 0) - COALESCE(SUM(${mvDailyJobs.cancelledJobs}), 0) - COALESCE(SUM(${mvDailyJobs.inProgressJobs}), 0) - COALESCE(SUM(${mvDailyJobs.onHoldJobs}), 0))::text`,
      in_progress: sql<string>`(COALESCE(SUM(${mvDailyJobs.inProgressJobs}), 0) + COALESCE(SUM(${mvDailyJobs.onHoldJobs}), 0))::text`,
    })
    .from(mvDailyJobs)
    .where(
      and(
        eq(mvDailyJobs.organizationId, organizationId),
        gte(mvDailyJobs.day, sql`${dateFromStr}::date`),
        lte(mvDailyJobs.day, sql`${dateToStr}::date`)
      )
    );

  const [claimsResult] = await db
    .select({
      open_count: sql<string>`(COALESCE(SUM(${mvDailyWarranty.submittedClaims}), 0) + COALESCE(SUM(${mvDailyWarranty.underReviewClaims}), 0) + COALESCE(SUM(${mvDailyWarranty.approvedClaims}), 0))::text`,
      total_count: sql<string>`COALESCE(SUM(${mvDailyWarranty.totalClaims}), 0)`,
    })
    .from(mvDailyWarranty)
    .where(
      and(
        eq(mvDailyWarranty.organizationId, organizationId),
        gte(mvDailyWarranty.day, sql`${dateFromStr}::date`),
        lte(mvDailyWarranty.day, sql`${dateToStr}::date`)
      )
    );

  // Total customers: mv_current_state has no total_customers; use customers table
  const [totalCustomersResult] = await db
    .select({ count: count() })
    .from(customers)
    .where(
      and(
        eq(customers.organizationId, organizationId),
        isNull(customers.deletedAt)
      )
    );

  // New customers this period
  const [newCustomersResult] = await db
    .select({ count: count() })
    .from(customers)
    .where(
      and(
        eq(customers.organizationId, organizationId),
        gte(customers.createdAt, sql`${dateFromStr}::date`),
        lte(customers.createdAt, sql`${dateToStr}::date`),
        isNull(customers.deletedAt)
      )
    );

  return {
    orders: {
      count: Number(ordersResult?.orders_count ?? 0),
      revenue: Number(ordersResult?.revenue ?? 0),
    },
    pipeline: {
      value: Number(pipelineResult?.total_value ?? 0),
      count: Number(pipelineResult?.opportunity_count ?? 0),
    },
    jobs: {
      active: Number(jobsResult?.in_progress ?? 0),
      scheduled: Number(jobsResult?.scheduled ?? 0),
    },
    claims: {
      open: Number(claimsResult?.open_count ?? 0),
      total: Number(claimsResult?.total_count ?? 0),
    },
    customers: {
      total: Number(totalCustomersResult?.count ?? 0),
      new: newCustomersResult?.count ?? 0,
    },
  };
}

/**
 * Get active organizations that have had recent activity.
 * Only warm cache for orgs that are likely to access the dashboard.
 */
async function getActiveOrganizations(): Promise<string[]> {
  // Get organizations with activity in the last 30 days
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const activeOrgs = await db
    .select({ id: organizations.id })
    .from(organizations)
    .where(
      and(
        sql`${organizations.deletedAt} IS NULL`,
        // Has activity based on orders, opportunities, or jobs
        sql`EXISTS (
          SELECT 1 FROM orders WHERE orders.organization_id = ${organizations.id}
          AND orders.created_at >= ${thirtyDaysAgo.toISOString()}
        ) OR EXISTS (
          SELECT 1 FROM opportunities WHERE opportunities.organization_id = ${organizations.id}
          AND opportunities.created_at >= ${thirtyDaysAgo.toISOString()}
        )`
      )
    )
    .limit(100); // Limit to prevent overwhelming the system

  return activeOrgs.map((org) => org.id);
}

// ============================================================================
// TASK: Warm Dashboard Cache (Every 30 Minutes During Business Hours)
// ============================================================================

/**
 * Warm Dashboard Cache Task
 *
 * Warms the cache for active organizations during business hours.
 * Runs every 30 minutes Mon-Fri 7am-7pm.
 */
export const warmDashboardCacheTask = schedules.task({
  id: "warm-dashboard-cache",
  cron: "*/30 7-19 * * 1-5",
  run: async (): Promise<WarmDashboardCacheResult> => {
    const startTime = Date.now();
    logger.info("Starting dashboard cache warming");

    // Get active organizations
    const orgIds = await getActiveOrganizations();

    logger.info(`Found ${orgIds.length} active organizations to warm`);

    if (orgIds.length === 0) {
      return {
        organizationCount: 0,
        dateRanges: [] as string[],
        durationMs: Date.now() - startTime,
        warmedAt: new Date().toISOString(),
      };
    }

    const dateRanges = getCacheWarmDateRanges();
    let warmedCount = 0;
    let errorCount = 0;

    for (const orgId of orgIds) {
      for (const range of dateRanges) {
        try {
          const metrics = await fetchMetricsFromMV(orgId, range.from, range.to);

          // Cache the metrics
          await DashboardCache.setMetrics(
            {
              orgId,
              dateFrom: range.from.toISOString().split("T")[0],
              dateTo: range.to.toISOString().split("T")[0],
              preset: range.label,
            },
            metrics
          );

          warmedCount++;
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          logger.warn(`Failed to warm cache for ${orgId}/${range.label}`, {
            error: errorMessage,
          });
          errorCount++;
        }
      }

      // Also warm the current state cache
      try {
        const [currentState] = await db.execute(sql`
          SELECT * FROM mv_current_state WHERE organization_id = ${orgId}
        `);

        if (currentState) {
          await DashboardCache.setCurrentState(orgId, currentState);
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        logger.warn(`Failed to warm current state for ${orgId}`, {
          error: errorMessage,
        });
      }
    }

    const durationMs = Date.now() - startTime;

    logger.info("Dashboard cache warming completed", {
      organizationCount: orgIds.length,
      warmedCount,
      errorCount,
      durationMs,
    });

    return {
      organizationCount: orgIds.length,
      dateRanges: dateRanges.map((r) => r.label),
      warmedCount,
      errorCount,
      durationMs,
      warmedAt: new Date().toISOString(),
    };
  },
});


// ============================================================================
// TASK: On-Demand Organization Cache Warming
// ============================================================================

/**
 * Warm Organization Cache Task
 *
 * Triggered when a user logs in or after significant data changes
 * to pre-populate the cache for their organization.
 */
export const warmOrgCacheTask = task({
  id: "warm-org-cache",
  retry: {
    maxAttempts: 2,
  },
  run: async (payload: WarmOrgCachePayload): Promise<WarmOrgCacheResult> => {
    const { organizationId, dateRanges: requestedRanges } = payload;
    const startTime = Date.now();

    logger.info("Starting on-demand cache warming", {
      organizationId,
      requestedRanges,
    });

    const allDateRanges = getCacheWarmDateRanges();
    const rangesToWarm = requestedRanges?.length
      ? allDateRanges.filter((r) => requestedRanges.includes(r.label))
      : allDateRanges;

    logger.info(
      `Warming ${rangesToWarm.length} date ranges for organization ${organizationId}`
    );

    let warmedCount = 0;

    for (const range of rangesToWarm) {
      try {
        const metrics = await fetchMetricsFromMV(
          organizationId,
          range.from,
          range.to
        );

        await DashboardCache.setMetrics(
          {
            orgId: organizationId,
            dateFrom: range.from.toISOString().split("T")[0],
            dateTo: range.to.toISOString().split("T")[0],
            preset: range.label,
          },
          metrics
        );

        warmedCount++;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        logger.warn(
          `Failed to warm cache for ${organizationId}/${range.label}`,
          {
            error: errorMessage,
          }
        );
      }
    }

    // Also warm the current state cache
    try {
      const [currentState] = await db.execute(sql`
        SELECT * FROM mv_current_state WHERE organization_id = ${organizationId}
      `);

      if (currentState) {
        await DashboardCache.setCurrentState(organizationId, currentState);
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      logger.warn(`Failed to warm current state for ${organizationId}`, {
        error: errorMessage,
      });
    }

    const durationMs = Date.now() - startTime;

    logger.info("On-demand cache warming completed", {
      organizationId,
      warmedCount,
      durationMs,
    });

    return {
      success: true,
      organizationId,
      dateRanges: rangesToWarm.map((r) => r.label),
      warmedCount,
      durationMs,
      warmedAt: new Date().toISOString(),
    };
  },
});

// ============================================================================
// LEGACY EXPORTS - for backward compatibility
// ============================================================================

/**
 * @deprecated Use warmDashboardCacheTask instead
 */
export const warmDashboardCacheJob = warmDashboardCacheTask;

/**
 * @deprecated Use warmOrgCacheTask instead
 */
export const warmOrgCacheJob = warmOrgCacheTask;
