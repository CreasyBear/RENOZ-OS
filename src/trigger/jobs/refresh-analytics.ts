'use server'

/**
 * Refresh Analytics Materialized Views
 *
 * Scheduled job to refresh MV-backed analytics tables.
 * Uses whitelist to prevent SQL injection (aligned with dashboard-refresh.ts).
 */

import { cronTrigger } from '@trigger.dev/sdk';
import { sql } from 'drizzle-orm';
import { client } from '../client';
import { db } from '@/lib/db';

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

export const refreshAnalyticsJob = client.defineJob({
  id: 'refresh-analytics-mvs',
  name: 'Refresh Analytics Materialized Views',
  version: '1.0.0',
  trigger: cronTrigger({
    cron: '0 2 * * *', // Daily at 2am
  }),
  run: async (_payload, io) => {
    await io.logger.info('Refreshing analytics materialized views');

    for (const view of ALLOWED_MV_NAMES) {
      await io.runTask(`refresh-${view}`, async () => {
        await db.execute(sql.raw(`REFRESH MATERIALIZED VIEW ${view}`));
        await io.logger.info(`Refreshed ${view}`);
      });
    }

    return { refreshed: ALLOWED_MV_NAMES.length };
  },
});
