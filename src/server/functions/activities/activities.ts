/**
 * Activity Server Functions
 *
 * Server-side functions for activity retrieval, statistics, and export.
 * All functions use withAuth for authentication and filter by organizationId.
 *
 * @see src/lib/schemas/activities.ts for validation schemas
 * @see drizzle/schema/activities.ts for database schema
 * @see _Initiation/_prd/2-domains/activities/activities.prd.json for full spec
 */

import { createServerFn } from '@tanstack/react-start';
import { eq, and, desc, asc, sql, gte, lte, inArray, count } from 'drizzle-orm';
import { db } from '@/lib/db';
import { activities, users } from '@/../drizzle/schema';
import {
  activityFeedQuerySchema,
  entityActivitiesQuerySchema,
  userActivitiesQuerySchema,
  activityStatsQuerySchema,
  activityExportRequestSchema,
  activityParamsSchema,
  type ActivityStatsResult,
  type ActivityLeaderboardItem,
} from '@/lib/schemas/activities';
import {
  decodeCursor,
  buildCursorCondition,
  buildStandardCursorResponse,
} from '@/lib/db/pagination';
import { withAuth } from '@/lib/server/protected';
import { NotFoundError } from '@/lib/server/errors';
import { PERMISSIONS } from '@/lib/constants';

// ============================================================================
// ACTIVITY FEED
// ============================================================================

/**
 * Get organization-wide activity feed with filtering and cursor pagination.
 */
export const getActivityFeed = createServerFn({ method: 'GET' })
  .inputValidator(activityFeedQuerySchema)
  .handler(async ({ data }): Promise<ReturnType<typeof buildStandardCursorResponse>> => {
    const ctx = await withAuth({ permission: PERMISSIONS.CUSTOMERS.READ });

    const { cursor, pageSize, entityType, entityId, action, userId, source, dateFrom, dateTo } =
      data;

    // Build where conditions - ALWAYS include organizationId for isolation
    const conditions = [eq(activities.organizationId, ctx.organizationId)];

    // Apply filters
    if (entityType) {
      conditions.push(eq(activities.entityType, entityType));
    }
    if (entityId) {
      conditions.push(eq(activities.entityId, entityId));
    }
    if (action) {
      conditions.push(eq(activities.action, action));
    }
    if (userId) {
      conditions.push(eq(activities.userId, userId));
    }
    // COMMS-AUTO-002: Filter by source
    if (source) {
      conditions.push(eq(activities.source, source));
    }
    if (dateFrom) {
      conditions.push(gte(activities.createdAt, dateFrom));
    }
    if (dateTo) {
      conditions.push(lte(activities.createdAt, dateTo));
    }

    // Apply cursor if provided
    if (cursor) {
      const cursorPosition = decodeCursor(cursor);
      if (cursorPosition) {
        conditions.push(
          buildCursorCondition(activities.createdAt, activities.id, cursorPosition, 'desc')
        );
      }
    }

    const whereClause = and(...conditions);

    // Query with user join for attribution
    const results = await db
      .select({
        activity: activities,
        user: {
          id: users.id,
          name: users.name,
          email: users.email,
        },
      })
      .from(activities)
      .leftJoin(users, eq(activities.userId, users.id))
      .where(whereClause)
      .orderBy(desc(activities.createdAt), desc(activities.id))
      .limit(pageSize + 1);

    // Transform results to include user data
    const items = results.map((r) => ({
      ...r.activity,
      user: r.user?.id ? r.user : null,
    }));

    return buildStandardCursorResponse(items, pageSize);
  });

// ============================================================================
// ENTITY ACTIVITIES
// ============================================================================

/**
 * Get activity history for a specific entity.
 */
export const getEntityActivities = createServerFn({ method: 'GET' })
  .inputValidator(entityActivitiesQuerySchema)
  .handler(async ({ data }): Promise<ReturnType<typeof buildStandardCursorResponse>> => {
    const ctx = await withAuth({ permission: PERMISSIONS.CUSTOMERS.READ });

    const { entityType, entityId, cursor, pageSize } = data;

    // Build where conditions
    const conditions = [
      eq(activities.organizationId, ctx.organizationId),
      eq(activities.entityType, entityType),
      eq(activities.entityId, entityId),
    ];

    // Apply cursor if provided
    if (cursor) {
      const cursorPosition = decodeCursor(cursor);
      if (cursorPosition) {
        conditions.push(
          buildCursorCondition(activities.createdAt, activities.id, cursorPosition, 'desc')
        );
      }
    }

    const whereClause = and(...conditions);

    // Query with user join
    const results = await db
      .select({
        activity: activities,
        user: {
          id: users.id,
          name: users.name,
          email: users.email,
        },
      })
      .from(activities)
      .leftJoin(users, eq(activities.userId, users.id))
      .where(whereClause)
      .orderBy(desc(activities.createdAt), desc(activities.id))
      .limit(pageSize + 1);

    // Transform results
    const items = results.map((r) => ({
      ...r.activity,
      user: r.user?.id ? r.user : null,
    }));

    return buildStandardCursorResponse(items, pageSize);
  });

// ============================================================================
// USER ACTIVITIES
// ============================================================================

/**
 * Get all activities performed by a specific user.
 */
export const getUserActivities = createServerFn({ method: 'GET' })
  .inputValidator(userActivitiesQuerySchema)
  .handler(async ({ data }): Promise<ReturnType<typeof buildStandardCursorResponse>> => {
    const ctx = await withAuth({ permission: PERMISSIONS.CUSTOMERS.READ });

    const { userId, cursor, pageSize } = data;

    // Build where conditions
    const conditions = [
      eq(activities.organizationId, ctx.organizationId),
      eq(activities.userId, userId),
    ];

    // Apply cursor if provided
    if (cursor) {
      const cursorPosition = decodeCursor(cursor);
      if (cursorPosition) {
        conditions.push(
          buildCursorCondition(activities.createdAt, activities.id, cursorPosition, 'desc')
        );
      }
    }

    const whereClause = and(...conditions);

    // Query activities
    const results = await db
      .select()
      .from(activities)
      .where(whereClause)
      .orderBy(desc(activities.createdAt), desc(activities.id))
      .limit(pageSize + 1);

    return buildStandardCursorResponse(results, pageSize);
  });

// ============================================================================
// SINGLE ACTIVITY
// ============================================================================

/**
 * Get a single activity by ID.
 */
export const getActivity = createServerFn({ method: 'GET' })
  .inputValidator(activityParamsSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.CUSTOMERS.READ });

    const { id } = data;

    const result = await db
      .select({
        activity: activities,
        user: {
          id: users.id,
          name: users.name,
          email: users.email,
        },
      })
      .from(activities)
      .leftJoin(users, eq(activities.userId, users.id))
      .where(and(eq(activities.id, id), eq(activities.organizationId, ctx.organizationId)))
      .limit(1);

    if (result.length === 0) {
      throw new NotFoundError('Activity not found', 'activity');
    }

    const activity = result[0].activity;
    const user = result[0].user?.id ? result[0].user : null;

    return {
      ...activity,
      user,
    } as any;
  });

// ============================================================================
// ACTIVITY STATISTICS
// ============================================================================

/**
 * Get activity statistics for the organization.
 */
export const getActivityStats = createServerFn({ method: 'GET' })
  .inputValidator(activityStatsQuerySchema)
  .handler(async ({ data }): Promise<ActivityStatsResult> => {
    const ctx = await withAuth({ permission: PERMISSIONS.CUSTOMERS.READ });

    const { dateFrom, dateTo, groupBy } = data;

    // Build where conditions
    const conditions = [eq(activities.organizationId, ctx.organizationId)];

    if (dateFrom) {
      conditions.push(gte(activities.createdAt, dateFrom));
    }
    if (dateTo) {
      conditions.push(lte(activities.createdAt, dateTo));
    }

    const whereClause = and(...conditions);

    // Get total count
    const totalResult = await db.select({ count: count() }).from(activities).where(whereClause);
    const total = totalResult[0]?.count ?? 0;

    // Get grouped stats based on groupBy parameter
    let stats: { key: string; count: number }[] = [];

    switch (groupBy) {
      case 'action':
        const actionStats = await db
          .select({
            key: activities.action,
            count: count(),
          })
          .from(activities)
          .where(whereClause)
          .groupBy(activities.action)
          .orderBy(desc(count()));
        stats = actionStats.map((s) => ({ key: s.key, count: s.count }));
        break;

      case 'entityType':
        const entityStats = await db
          .select({
            key: activities.entityType,
            count: count(),
          })
          .from(activities)
          .where(whereClause)
          .groupBy(activities.entityType)
          .orderBy(desc(count()));
        stats = entityStats.map((s) => ({ key: s.key, count: s.count }));
        break;

      // COMMS-AUTO-002: Group by source for auto-capture analytics
      case 'source':
        const sourceStats = await db
          .select({
            key: activities.source,
            count: count(),
          })
          .from(activities)
          .where(whereClause)
          .groupBy(activities.source)
          .orderBy(desc(count()));
        stats = sourceStats.map((s) => ({ key: s.key, count: s.count }));
        break;

      case 'userId':
        const userStats = await db
          .select({
            key: activities.userId,
            count: count(),
          })
          .from(activities)
          .where(and(whereClause, sql`${activities.userId} IS NOT NULL`))
          .groupBy(activities.userId)
          .orderBy(desc(count()))
          .limit(20); // Limit to top 20 users
        stats = userStats.map((s) => ({
          key: s.key ?? 'unknown',
          count: s.count,
        }));
        break;

      case 'day':
        const dayStats = await db
          .select({
            key: sql<string>`to_char(${activities.createdAt}, 'YYYY-MM-DD')`,
            count: count(),
          })
          .from(activities)
          .where(whereClause)
          .groupBy(sql`to_char(${activities.createdAt}, 'YYYY-MM-DD')`)
          .orderBy(asc(sql`to_char(${activities.createdAt}, 'YYYY-MM-DD')`));
        stats = dayStats.map((s) => ({ key: s.key, count: s.count }));
        break;

      case 'hour':
        const hourStats = await db
          .select({
            key: sql<string>`to_char(${activities.createdAt}, 'HH24')`,
            count: count(),
          })
          .from(activities)
          .where(whereClause)
          .groupBy(sql`to_char(${activities.createdAt}, 'HH24')`)
          .orderBy(asc(sql`to_char(${activities.createdAt}, 'HH24')`));
        stats = hourStats.map((s) => ({ key: s.key, count: s.count }));
        break;
    }

    // Calculate percentages
    const statsWithPercentage = stats.map((s) => ({
      ...s,
      percentage: total > 0 ? Math.round((s.count / total) * 10000) / 100 : 0,
    }));

    return {
      stats: statsWithPercentage,
      total,
      dateRange: {
        from: dateFrom ?? null,
        to: dateTo ?? null,
      },
    };
  });

// ============================================================================
// ACTIVITY LEADERBOARD
// ============================================================================

/**
 * Get top users by activity count (leaderboard).
 */
export const getActivityLeaderboard = createServerFn({ method: 'GET' })
  .inputValidator(activityStatsQuerySchema)
  .handler(async ({ data }): Promise<ActivityLeaderboardItem[]> => {
    const ctx = await withAuth({ permission: PERMISSIONS.CUSTOMERS.READ });

    const { dateFrom, dateTo } = data;

    // Build where conditions
    const conditions = [
      eq(activities.organizationId, ctx.organizationId),
      sql`${activities.userId} IS NOT NULL`,
    ];

    if (dateFrom) {
      conditions.push(gte(activities.createdAt, dateFrom));
    }
    if (dateTo) {
      conditions.push(lte(activities.createdAt, dateTo));
    }

    const whereClause = and(...conditions);

    // Query top users with their activity counts
    const results = await db
      .select({
        userId: activities.userId,
        activityCount: count(),
      })
      .from(activities)
      .where(whereClause)
      .groupBy(activities.userId)
      .orderBy(desc(count()))
      .limit(10);

    // Get user details
    const userIds = results.map((r) => r.userId).filter((id): id is string => id !== null);

    const userDetails =
      userIds.length > 0
        ? await db
            .select({
              id: users.id,
              name: users.name,
              email: users.email,
            })
            .from(users)
            .where(inArray(users.id, userIds))
        : [];

    // Build leaderboard with user details
    const userMap = new Map(userDetails.map((u) => [u.id, u]));

    return results.map((r, index) => {
      const user = r.userId ? userMap.get(r.userId) : null;
      return {
        userId: r.userId ?? '',
        userName: user?.name ?? null,
        userEmail: user?.email ?? 'Unknown',
        activityCount: r.activityCount,
        rank: index + 1,
      };
    });
  });

// ============================================================================
// ACTIVITY EXPORT
// ============================================================================

/**
 * Request activity export (creates async job).
 * Returns job ID for status polling.
 *
 * @status NOT_IMPLEMENTED - This endpoint is stubbed for API completeness.
 * @todo Implement with Trigger.dev background jobs when needed.
 * @see https://trigger.dev/docs for async job implementation
 */
export const requestActivityExport = createServerFn({ method: 'POST' })
  .inputValidator(activityExportRequestSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.REPORTS.EXPORT });

    const { format } = data;

    // STUB: Export functionality not yet implemented
    // When implementing:
    // 1. Create jobs table if not exists
    // 2. Create Trigger.dev task for async export
    // 3. Stream activities to CSV/JSON/PDF based on format
    // 4. Upload to S3/R2 and return signed URL
    // 5. Add job status polling endpoint

    console.warn('[Activity Export] STUB: Export not implemented', {
      format,
      organizationId: ctx.organizationId,
      requestedBy: ctx.user.id,
    });

    // Return explicit "not implemented" status instead of fake job
    return {
      jobId: null,
      status: 'not_implemented' as const,
      message:
        'Activity export is not yet available. This feature is planned for a future release.',
    };
  });

// ============================================================================
// RECENT ACTIVITY COUNT
// ============================================================================

/**
 * Get recent activity count for dashboard widgets.
 */
export const getRecentActivityCount = createServerFn({ method: 'GET' })
  .inputValidator(activityStatsQuerySchema.pick({ dateFrom: true, dateTo: true }).optional())
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.CUSTOMERS.READ });

    // Default to last 24 hours if no date range provided
    const dateFrom = data?.dateFrom ?? new Date(Date.now() - 24 * 60 * 60 * 1000);
    const dateTo = data?.dateTo ?? new Date();

    const conditions = [
      eq(activities.organizationId, ctx.organizationId),
      gte(activities.createdAt, dateFrom),
      lte(activities.createdAt, dateTo),
    ];

    const result = await db
      .select({ count: count() })
      .from(activities)
      .where(and(...conditions));

    return {
      count: result[0]?.count ?? 0,
      dateRange: { from: dateFrom, to: dateTo },
    };
  });
