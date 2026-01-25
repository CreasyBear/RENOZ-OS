/**
 * Dashboard Refresh Background Jobs
 *
 * Scheduled jobs for refreshing materialized views and cache:
 * 1. refreshDailyMetricsJob: Refreshes order/revenue MVs every 15 minutes
 * 2. refreshCurrentStateJob: Refreshes current state MV every 5 minutes
 * 3. refreshWarrantyMetricsJob: Refreshes warranty claims MV every hour
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
// HELPER FUNCTIONS
// ============================================================================

/**
 * Refresh a materialized view concurrently (zero-lock).
 * Falls back to regular refresh if concurrent refresh fails.
 */
async function refreshMaterializedView(viewName: string): Promise<{ success: boolean; durationMs: number }> {
  const startTime = Date.now();

  try {
    // Use CONCURRENTLY for zero-lock refresh
    await db.execute(sql.raw(`REFRESH MATERIALIZED VIEW CONCURRENTLY ${viewName}`));
    return { success: true, durationMs: Date.now() - startTime };
  } catch (error) {
    // If CONCURRENTLY fails (e.g., no unique index), fall back to regular refresh
    console.warn(`[DashboardRefresh] CONCURRENTLY failed for ${viewName}, falling back to regular refresh`);
    await db.execute(sql.raw(`REFRESH MATERIALIZED VIEW ${viewName}`));
    return { success: true, durationMs: Date.now() - startTime };
  }
}

// ============================================================================
// CRON JOB - Refresh Daily Metrics (Every 15 Minutes)
// ============================================================================

/**
 * Refresh Daily Metrics Job
 *
 * Refreshes order and pipeline materialized views every 15 minutes.
 * These MVs power the historical date range queries in the dashboard.
 */
export const refreshDailyMetricsJob = client.defineJob({
  id: 'refresh-daily-metrics',
  name: 'Refresh Daily Metrics MVs',
  version: '1.0.0',
  trigger: cronTrigger({
    cron: '*/15 * * * *', // Every 15 minutes
  }),
  run: async (_payload, io) => {
    await io.logger.info('Starting daily metrics MV refresh');

    const views = ['mv_daily_metrics', 'mv_daily_pipeline', 'mv_daily_jobs'];
    const results: Record<string, { success: boolean; durationMs: number }> = {};

    for (const view of views) {
      const taskId = `refresh-${view}`;

      try {
        const result = await io.runTask(taskId, async () => {
          await io.logger.info(`Refreshing ${view}`);
          return await refreshMaterializedView(view);
        });

        results[view] = result;
        await io.logger.info(`Refreshed ${view}`, { durationMs: result.durationMs });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        await io.logger.error(`Failed to refresh ${view}`, { error: errorMessage });
        results[view] = { success: false, durationMs: 0 };
      }
    }

    const totalDuration = Object.values(results).reduce((sum, r) => sum + r.durationMs, 0);
    const successfulViews = Object.entries(results)
      .filter(([_, r]) => r.success)
      .map(([name]) => name);

    await io.logger.info('Daily metrics MV refresh completed', {
      totalDuration,
      successfulViews: successfulViews.length,
      totalViews: views.length,
    });

    return {
      views: results,
      totalDuration,
      refreshedAt: new Date().toISOString(),
    };
  },
});

// ============================================================================
// CRON JOB - Refresh Current State (Every 5 Minutes)
// ============================================================================

/**
 * Refresh Current State Job
 *
 * Refreshes the current state materialized view every 5 minutes.
 * This MV powers the "today's metrics" section of the dashboard.
 */
export const refreshCurrentStateJob = client.defineJob({
  id: 'refresh-current-state',
  name: 'Refresh Current State MV',
  version: '1.0.0',
  trigger: cronTrigger({
    cron: '*/5 * * * *', // Every 5 minutes
  }),
  run: async (_payload, io) => {
    await io.logger.info('Starting current state MV refresh');

    const result = await io.runTask('refresh-mv-current-state', async () => {
      return await refreshMaterializedView('mv_current_state');
    });

    await io.logger.info('Current state MV refresh completed', {
      durationMs: result.durationMs,
    });

    return {
      success: result.success,
      durationMs: result.durationMs,
      refreshedAt: new Date().toISOString(),
    };
  },
});

// ============================================================================
// CRON JOB - Refresh Warranty Metrics (Every Hour)
// ============================================================================

/**
 * Refresh Warranty Metrics Job
 *
 * Refreshes the warranty claims materialized view every hour.
 * Less frequent than other MVs since warranty data changes less often.
 */
export const refreshWarrantyMetricsJob = client.defineJob({
  id: 'refresh-warranty-metrics',
  name: 'Refresh Warranty Metrics MV',
  version: '1.0.0',
  trigger: cronTrigger({
    cron: '0 * * * *', // Every hour at minute 0
  }),
  run: async (_payload, io) => {
    await io.logger.info('Starting warranty metrics MV refresh');

    const result = await io.runTask('refresh-mv-daily-warranty', async () => {
      return await refreshMaterializedView('mv_daily_warranty');
    });

    await io.logger.info('Warranty metrics MV refresh completed', {
      durationMs: result.durationMs,
    });

    return {
      success: result.success,
      durationMs: result.durationMs,
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
 * Triggered when specific business events occur that require immediate
 * MV refresh (e.g., bulk order import, pipeline stage change).
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

    await io.logger.info('Starting on-demand MV refresh', {
      views,
      organizationId,
    });

    const results: Record<string, { success: boolean; durationMs: number }> = {};

    for (const view of views) {
      const taskId = `refresh-${view}`;

      try {
        const result = await io.runTask(taskId, async () => {
          await io.logger.info(`Refreshing ${view}`);
          return await refreshMaterializedView(view);
        });

        results[view] = result;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        await io.logger.error(`Failed to refresh ${view}`, { error: errorMessage });
        results[view] = { success: false, durationMs: 0 };
      }
    }

    // If organization specified, invalidate their cache
    if (organizationId) {
      await io.runTask('invalidate-cache', async () => {
        await DashboardCache.invalidateOrg(organizationId);
        await io.logger.info('Invalidated cache for organization', { organizationId });
      });
    }

    const totalDuration = Object.values(results).reduce((sum, r) => sum + r.durationMs, 0);

    await io.logger.info('On-demand MV refresh completed', {
      totalDuration,
      views: Object.keys(results),
    });

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
 * Invalidates dashboard cache for a specific organization.
 */
export const cacheInvalidationJob = client.defineJob({
  id: 'dashboard-cache-invalidation',
  name: 'Dashboard Cache Invalidation',
  version: '1.0.0',
  trigger: eventTrigger({
    name: dashboardEvents.cacheInvalidated,
  }),
  run: async (payload: DashboardCacheInvalidatedPayload, io) => {
    const { organizationId, cacheTypes } = payload;

    await io.logger.info('Starting cache invalidation', {
      organizationId,
      cacheTypes,
    });

    // Invalidate specific cache types or all
    if (cacheTypes.includes('all')) {
      await io.runTask('invalidate-all', async () => {
        await DashboardCache.invalidateOrg(organizationId);
      });
    } else {
      for (const cacheType of cacheTypes) {
        await io.runTask(`invalidate-${cacheType}`, async () => {
          await DashboardCache.invalidateType(
            organizationId,
            cacheType as keyof typeof import('@/lib/cache/dashboard-cache').DASHBOARD_CACHE_KEYS
          );
        });
      }
    }

    await io.logger.info('Cache invalidation completed', {
      organizationId,
      cacheTypes,
    });

    return {
      success: true,
      organizationId,
      cacheTypes,
      invalidatedAt: new Date().toISOString(),
    };
  },
});
