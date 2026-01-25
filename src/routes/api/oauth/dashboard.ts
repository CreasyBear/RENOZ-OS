/**
 * OAuth Dashboard Endpoint
 *
 * GET /api/oauth/dashboard
 */

import { withAuth } from '@/lib/server/protected';
import { db } from '@/lib/db';
import { oauthConnections, oauthSyncLogs } from 'drizzle/schema';
import { and, eq, gte, sql, desc } from 'drizzle-orm';

export async function GET() {
  const ctx = await withAuth();
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const [connectionStats] = await db
    .select({
      totalConnections: sql<number>`count(*)`,
      healthyConnections: sql<number>`count(case when ${oauthConnections.isActive} = true then 1 end)`,
    })
    .from(oauthConnections)
    .where(eq(oauthConnections.organizationId, ctx.organizationId));

  const [syncStats] = await db
    .select({
      totalSyncsToday: sql<number>`count(*)`,
      failedSyncsToday: sql<number>`count(case when ${oauthSyncLogs.status} = 'failed' then 1 end)`,
      avgDurationMs: sql<number>`avg(extract(epoch from (${oauthSyncLogs.completedAt} - ${oauthSyncLogs.startedAt})) * 1000)`,
    })
    .from(oauthSyncLogs)
    .where(
      and(
        eq(oauthSyncLogs.organizationId, ctx.organizationId),
        gte(oauthSyncLogs.createdAt, startOfDay)
      )
    );

  const recentActivity = await db
    .select({
      id: oauthSyncLogs.id,
      createdAt: oauthSyncLogs.createdAt,
      serviceType: oauthSyncLogs.serviceType,
      operation: oauthSyncLogs.operation,
      status: oauthSyncLogs.status,
      errorMessage: oauthSyncLogs.errorMessage,
      metadata: oauthSyncLogs.metadata,
      provider: oauthConnections.provider,
    })
    .from(oauthSyncLogs)
    .leftJoin(oauthConnections, eq(oauthSyncLogs.connectionId, oauthConnections.id))
    .where(eq(oauthSyncLogs.organizationId, ctx.organizationId))
    .orderBy(desc(oauthSyncLogs.createdAt))
    .limit(10);

  const totalConnections = connectionStats?.totalConnections ?? 0;
  const healthyConnections = connectionStats?.healthyConnections ?? 0;
  const unhealthyConnections = totalConnections - healthyConnections;
  const totalSyncsToday = syncStats?.totalSyncsToday ?? 0;
  const failedSyncsToday = syncStats?.failedSyncsToday ?? 0;
  const errorRate = totalSyncsToday > 0 ? failedSyncsToday / totalSyncsToday : 0;

  return new globalThis.Response(
    JSON.stringify({
      metrics: {
        totalConnections,
        healthyConnections,
        unhealthyConnections,
        totalSyncsToday,
        averageResponseTime: syncStats?.avgDurationMs ? syncStats.avgDurationMs / 1000 : 0,
        errorRate,
      },
      recentActivity: recentActivity.map((log) => {
        const status =
          log.status === 'completed'
            ? 'success'
            : log.status === 'completed_with_errors'
              ? 'warning'
              : 'error';

        return {
        id: log.id,
        timestamp: log.createdAt,
        type: log.operation,
        service: log.serviceType,
        provider: log.provider || 'google_workspace',
        status,
        description:
          log.status === 'failed'
            ? log.errorMessage || 'Sync failed'
            : `${log.operation} completed`,
        details: log.metadata,
        };
      }),
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );
}
