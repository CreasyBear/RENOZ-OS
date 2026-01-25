/**
 * Dashboard Refresh Background Jobs
 *
 * Scheduled job for refreshing materialized views used by the dashboard.
 * Consolidated into a single job that refreshes all MVs with appropriate intervals.
 *
 * @see dashboard.prd.json DASH-PERF-BACKGROUND
 * @see docs/plans/2026-01-25-feat-dashboard-performance-infrastructure-plan.md
 */
import { cronTrigger, eventTrigger } from '@trigger.dev/sdk';
import { sql } from 'drizzle-orm';
import { client, dashboardEvents } from '../client';
import type { DashboardMvRefreshedPayload, DashboardCacheInvalidatedPayload } from '../client';
import { db } from '@/lib/db';
import { DashboardCache } from '@/lib/cache/dashboard-cache';

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Whitelist of allowed materialized view names.
 * Prevents SQL injection by only allowing known view names.
 */
const ALLOWED_MV_NAMES = [
  'mv_daily_metrics',
  'mv_daily_pipeline',
  'mv_daily_jobs',
  'mv_daily_warranty',
  'mv_current_state',
] as const;

type AllowedMvName = (typeof ALLOWED_MV_NAMES)[number];

/**
 * MV refresh configuration: which views to refresh at which intervals.
 */
const MV_REFRESH_CONFIG = {
  // Refresh every 5 minutes
  frequent: ['mv_current_state'] as AllowedMvName[],
  // Refresh every 15 minutes
  standard: ['mv_daily_metrics', 'mv_daily_pipeline', 'mv_daily_jobs'] as AllowedMvName[],
  // Refresh every hour
  hourly: ['mv_daily_warranty'] as AllowedMvName[],
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
async function refreshMaterializedView(viewName: AllowedMvName): Promise<{ success: boolean; durationMs: number }> {
  const startTime = Date.now();

  try {
    // Use CONCURRENTLY for zero-lock refresh
    await db.execute(sql.raw(`REFRESH MATERIALIZED VIEW CONCURRENTLY ${viewName}`));
    return { success: true, durationMs: Date.now() - startTime };
  } catch (error) {
    // If CONCURRENTLY fails (e.g., no unique index), fall back to regular refresh
    console.warn(`[DashboardRefresh] CONCURRENTLY failed for ${viewName}, using regular refresh`);
    await db.execute(sql.raw(`REFRESH MATERIALIZED VIEW ${viewName}`));
    return { success: true, durationMs: Date.now() - startTime };
  }
}

// ============================================================================
// CRON JOB - Refresh Dashboard MVs (Every 5 Minutes)
// ============================================================================

/**
 * Unified Dashboard MV Refresh Job
 *
 * Runs every 5 minutes and refreshes MVs based on their configured intervals:
 * - mv_current_state: every run (5 min)
 * - mv_daily_metrics/pipeline/jobs: every 3rd run (~15 min)
 * - mv_daily_warranty: every 12th run (~60 min)
 */
export const refreshDashboardMvsJob = client.defineJob({
  id: 'refresh-dashboard-mvs',
  name: 'Refresh Dashboard MVs',
  version: '2.0.0',
  trigger: cronTrigger({
    cron: '*/5 * * * *', // Every 5 minutes
  }),
  run: async (_payload, io) => {
    await io.logger.info('Starting dashboard MV refresh');

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

    await io.logger.info(`Refreshing ${viewsToRefresh.length} MVs`, { views: viewsToRefresh });

    const results: Record<string, { success: boolean; durationMs: number }> = {};

    for (const view of viewsToRefresh) {
      try {
        const result = await io.runTask(`refresh-${view}`, async () => {
          return await refreshMaterializedView(view);
        });
        results[view] = result;
        await io.logger.info(`Refreshed ${view}`, { durationMs: result.durationMs });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        await io.logger.info(`Failed to refresh ${view}: ${errorMessage}`);
        results[view] = { success: false, durationMs: 0 };
      }
    }

    const totalDuration = Object.values(results).reduce((sum, r) => sum + r.durationMs, 0);

    await io.logger.info('Dashboard MV refresh completed', {
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
// EVENT JOB - On-Demand MV Refresh
// ============================================================================

/**
 * On-Demand MV Refresh Job
 *
 * Triggered by business events that require immediate MV refresh
 * (e.g., bulk order import, pipeline stage change).
 */
export const onDemandMvRefreshJob = client.defineJob({
  id: 'on-demand-mv-refresh',
  name: 'On-Demand MV Refresh',
  version: '1.0.0',
  trigger: eventTrigger({
    name: dashboardEvents.mvRefreshed,
  }),
  run: async (payload: DashboardMvRefreshedPayload, io) => {
    const { views, organizationId } = payload;

    await io.logger.info('Starting on-demand MV refresh', { views, organizationId });

    // Filter to only valid view names
    const validViews = views.filter(isValidViewName);
    if (validViews.length !== views.length) {
      const invalidViews = views.filter(v => !isValidViewName(v));
      await io.logger.info(`Skipping invalid view names: ${invalidViews.join(', ')}`);
    }

    const results: Record<string, { success: boolean; durationMs: number }> = {};

    for (const view of validViews) {
      try {
        const result = await io.runTask(`refresh-${view}`, async () => {
          return await refreshMaterializedView(view);
        });
        results[view] = result;
        await io.logger.info(`Refreshed ${view}`, { durationMs: result.durationMs });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        await io.logger.info(`Failed to refresh ${view}: ${errorMessage}`);
        results[view] = { success: false, durationMs: 0 };
      }
    }

    // If organization specified, invalidate their cache
    if (organizationId) {
      await io.runTask('invalidate-cache', async () => {
        await DashboardCache.invalidateOrg(organizationId);
      });
      await io.logger.info('Invalidated cache for organization', { organizationId });
    }

    const totalDuration = Object.values(results).reduce((sum, r) => sum + r.durationMs, 0);

    return {
      views: results,
      totalDuration,
      refreshedAt: new Date().toISOString(),
    };
  },
});

// ============================================================================
// EVENT JOB - Cache Invalidation
// ============================================================================

/**
 * Cache Invalidation Job
 *
 * Triggered when data changes require cache invalidation.
 */
export const cacheInvalidationJob = client.defineJob({
  id: 'dashboard-cache-invalidation',
  name: 'Dashboard Cache Invalidation',
  version: '1.0.0',
  trigger: eventTrigger({
    name: dashboardEvents.cacheInvalidated,
  }),
  run: async (payload: DashboardCacheInvalidatedPayload, io) => {
    const { organizationId } = payload;

    await io.logger.info('Invalidating cache', { organizationId });

    await io.runTask('invalidate', async () => {
      await DashboardCache.invalidateOrg(organizationId);
    });

    await io.logger.info('Cache invalidation completed');

    return {
      success: true,
      organizationId,
      invalidatedAt: new Date().toISOString(),
    };
  },
});

// ============================================================================
// LEGACY EXPORTS - for backwards compatibility
// ============================================================================

/**
 * @deprecated Use refreshDashboardMvsJob instead
 */
export const refreshDailyMetricsJob = refreshDashboardMvsJob;

/**
 * @deprecated Use refreshDashboardMvsJob instead
 */
export const refreshCurrentStateJob = refreshDashboardMvsJob;

/**
 * @deprecated Use refreshDashboardMvsJob instead
 */
export const refreshWarrantyMetricsJob = refreshDashboardMvsJob;
