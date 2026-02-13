'use server'

/**
 * Dashboard Refresh Background Tasks (Trigger.dev v3)
 *
 * Scheduled tasks for refreshing materialized views used by the dashboard.
 * Consolidated into a single task that refreshes all MVs with appropriate intervals.
 *
 * @see dashboard.prd.json DASH-PERF-BACKGROUND
 * @see docs/plans/2026-01-25-feat-dashboard-performance-infrastructure-plan.md
 * @see https://trigger.dev/docs/v3/tasks
 */
import { task, schedules, logger } from "@trigger.dev/sdk/v3";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { logger as appLogger } from "@/lib/logger";
import { DashboardCache } from "@/lib/cache/dashboard-cache";

// ============================================================================
// TYPES
// ============================================================================

export interface DashboardMvRefreshedPayload {
  views: string[];
  organizationId?: string;
}

export interface DashboardCacheInvalidatedPayload {
  organizationId: string;
}

export interface MvRefreshResult {
  views: Record<string, { success: boolean; durationMs: number }>;
  totalDuration: number;
  refreshedAt: string;
}

export interface CacheInvalidationResult {
  success: boolean;
  organizationId: string;
  invalidatedAt: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Whitelist of allowed materialized view names.
 * Prevents SQL injection by only allowing known view names.
 */
const ALLOWED_MV_NAMES = [
  "mv_daily_metrics",
  "mv_daily_pipeline",
  "mv_daily_jobs",
  "mv_daily_warranty",
  "mv_current_state",
] as const;

type AllowedMvName = (typeof ALLOWED_MV_NAMES)[number];

/**
 * MV refresh configuration: which views to refresh at which intervals.
 */
const MV_REFRESH_CONFIG = {
  // Refresh every 5 minutes
  frequent: ["mv_current_state"] as AllowedMvName[],
  // Refresh every 15 minutes
  standard: [
    "mv_daily_metrics",
    "mv_daily_pipeline",
    "mv_daily_jobs",
  ] as AllowedMvName[],
  // Refresh every hour
  hourly: ["mv_daily_warranty"] as AllowedMvName[],
} as const;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Validate that a view name is in our whitelist.
 */
function isValidViewName(viewName: string): viewName is AllowedMvName {
  return ALLOWED_MV_NAMES.includes(viewName as AllowedMvName);
}

/**
 * Refresh a materialized view concurrently (zero-lock).
 * Falls back to regular refresh if concurrent refresh fails.
 */
async function refreshMaterializedView(
  viewName: AllowedMvName
): Promise<{ success: boolean; durationMs: number }> {
  const startTime = Date.now();

  try {
    // Use CONCURRENTLY for zero-lock refresh
    await db.execute(sql.raw(`REFRESH MATERIALIZED VIEW CONCURRENTLY ${viewName}`));
    return { success: true, durationMs: Date.now() - startTime };
  } catch {
    // If CONCURRENTLY fails (e.g., no unique index), fall back to regular refresh
    appLogger.warn('[DashboardRefresh] CONCURRENTLY failed, using regular refresh', { viewName });
    await db.execute(sql.raw(`REFRESH MATERIALIZED VIEW ${viewName}`));
    return { success: true, durationMs: Date.now() - startTime };
  }
}

// ============================================================================
// TASK: Refresh Dashboard MVs (Every 5 Minutes)
// ============================================================================

/**
 * Unified Dashboard MV Refresh Task
 *
 * Runs every 5 minutes and refreshes MVs based on their configured intervals:
 * - mv_current_state: every run (5 min)
 * - mv_daily_metrics/pipeline/jobs: every 3rd run (~15 min)
 * - mv_daily_warranty: every 12th run (~60 min)
 */
export const refreshDashboardMvsTask = schedules.task({
  id: "refresh-dashboard-mvs",
  cron: "*/5 * * * *",
  run: async (): Promise<MvRefreshResult> => {
    logger.info("Starting dashboard MV refresh");

    // Get current minute to determine which MVs to refresh
    const minute = new Date().getMinutes();
    const viewsToRefresh: AllowedMvName[] = [];

    // Always refresh frequent MVs (current state)
    viewsToRefresh.push(...MV_REFRESH_CONFIG.frequent);

    // Refresh standard MVs every 15 minutes (at 0, 15, 30, 45)
    if (minute % 15 === 0) {
      viewsToRefresh.push(...MV_REFRESH_CONFIG.standard);
    }

    // Refresh hourly MVs at the top of each hour
    if (minute === 0) {
      viewsToRefresh.push(...MV_REFRESH_CONFIG.hourly);
    }

    logger.info(`Refreshing ${viewsToRefresh.length} MVs`, {
      views: viewsToRefresh,
    });

    const results: Record<string, { success: boolean; durationMs: number }> = {};

    for (const view of viewsToRefresh) {
      try {
        const result = await refreshMaterializedView(view);
        results[view] = result;
        logger.info(`Refreshed ${view}`, { durationMs: result.durationMs });
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        logger.info(`Failed to refresh ${view}: ${errorMessage}`);
        results[view] = { success: false, durationMs: 0 };
      }
    }

    const totalDuration = Object.values(results).reduce(
      (sum, r) => sum + r.durationMs,
      0
    );

    logger.info("Dashboard MV refresh completed", {
      refreshedCount: viewsToRefresh.length,
      totalDuration,
    });

    return {
      views: results,
      totalDuration,
      refreshedAt: new Date().toISOString(),
    };
  },
});


// ============================================================================
// TASK: On-Demand MV Refresh
// ============================================================================

/**
 * On-Demand MV Refresh Task
 *
 * Triggered by business events that require immediate MV refresh
 * (e.g., bulk order import, pipeline stage change).
 */
export const onDemandMvRefreshTask = task({
  id: "on-demand-mv-refresh",
  retry: {
    maxAttempts: 2,
  },
  run: async (payload: DashboardMvRefreshedPayload): Promise<MvRefreshResult> => {
    const { views, organizationId } = payload;

    logger.info("Starting on-demand MV refresh", { views, organizationId });

    // Filter to only valid view names
    const validViews = views.filter(isValidViewName);
    if (validViews.length !== views.length) {
      const invalidViews = views.filter((v) => !isValidViewName(v));
      logger.info(`Skipping invalid view names: ${invalidViews.join(", ")}`);
    }

    const results: Record<string, { success: boolean; durationMs: number }> = {};

    for (const view of validViews) {
      try {
        const result = await refreshMaterializedView(view);
        results[view] = result;
        logger.info(`Refreshed ${view}`, { durationMs: result.durationMs });
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        logger.info(`Failed to refresh ${view}: ${errorMessage}`);
        results[view] = { success: false, durationMs: 0 };
      }
    }

    // If organization specified, invalidate their cache
    if (organizationId) {
      await DashboardCache.invalidateOrg(organizationId);
      logger.info("Invalidated cache for organization", { organizationId });
    }

    const totalDuration = Object.values(results).reduce(
      (sum, r) => sum + r.durationMs,
      0
    );

    return {
      views: results,
      totalDuration,
      refreshedAt: new Date().toISOString(),
    };
  },
});

// ============================================================================
// TASK: Cache Invalidation
// ============================================================================

/**
 * Cache Invalidation Task
 *
 * Triggered when data changes require cache invalidation.
 */
export const cacheInvalidationTask = task({
  id: "dashboard-cache-invalidation",
  retry: {
    maxAttempts: 2,
  },
  run: async (
    payload: DashboardCacheInvalidatedPayload
  ): Promise<CacheInvalidationResult> => {
    const { organizationId } = payload;

    logger.info("Invalidating cache", { organizationId });

    await DashboardCache.invalidateOrg(organizationId);

    logger.info("Cache invalidation completed");

    return {
      success: true,
      organizationId,
      invalidatedAt: new Date().toISOString(),
    };
  },
});

// ============================================================================
// LEGACY EXPORTS - for backward compatibility
// ============================================================================

/**
 * @deprecated Use refreshDashboardMvsTask instead
 */
export const refreshDashboardMvsJob = refreshDashboardMvsTask;

/**
 * @deprecated Use onDemandMvRefreshTask instead
 */
export const onDemandMvRefreshJob = onDemandMvRefreshTask;

/**
 * @deprecated Use cacheInvalidationTask instead
 */
export const cacheInvalidationJob = cacheInvalidationTask;

/**
 * @deprecated Use refreshDashboardMvsTask instead
 */
export const refreshDailyMetricsJob = refreshDashboardMvsTask;

/**
 * @deprecated Use refreshDashboardMvsTask instead
 */
export const refreshCurrentStateJob = refreshDashboardMvsTask;

/**
 * @deprecated Use refreshDashboardMvsTask instead
 */
export const refreshWarrantyMetricsJob = refreshDashboardMvsTask;
