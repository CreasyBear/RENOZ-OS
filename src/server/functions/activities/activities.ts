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
import { eq, and, or, desc, gte, lte, inArray, count, isNotNull, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { activities, customers, opportunities, orders, users } from 'drizzle/schema';
import {
  activityFeedQuerySchema,
  entityActivitiesQuerySchema,
  userActivitiesQuerySchema,
  activityStatsQuerySchema,
  activityExportRequestSchema,
  activityParamsSchema,
  logEntityActivitySchema,
  type ActivityStatsResult,
  type ActivityLeaderboardItem,
  type ActivityWithUser,
  type ActivityMetadata,
  type Activity,
} from '@/lib/schemas/activities';
import {
  decodeCursor,
  buildCursorCondition,
  buildStandardCursorResponse,
  type CursorPaginatedResponse,
} from '@/lib/db/pagination';
import { withAuth } from '@/lib/server/protected';
import { NotFoundError } from '@/lib/server/errors';
import {
  verifyCustomerExists,
  verifyOrderExists,
  verifyOpportunityExists,
} from '@/server/functions/_shared/entity-verification';
import { PERMISSIONS } from '@/lib/auth/permissions';
import { logger } from '@/lib/logger';
import { resolveMetadataUuids } from '@/lib/activities/activity-metadata';

// ============================================================================
// ACTIVITY FEED
// ============================================================================

/**
 * Get organization-wide activity feed with filtering and cursor pagination.
 */
export const getActivityFeed = createServerFn({ method: 'GET' })
  .inputValidator(activityFeedQuerySchema)
  .handler(async ({ data }): Promise<CursorPaginatedResponse<ActivityWithUser>> => {
    const ctx = await withAuth({ permission: PERMISSIONS.customer.read });

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

    // Query with user join - use denormalized entity_name column instead of multiple LEFT JOINs
    // Per SCHEMA-TRACE.md: Use db.select() with typed columns, avoid unnecessary joins
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

    // Collect all UUIDs from metadata across all activities for batch resolution
    const allCustomerIds = new Set<string>();
    const allOrderIds = new Set<string>();
    const allOpportunityIds = new Set<string>();

    results.forEach((r) => {
      const metadata = r.activity.metadata;
      if (metadata && typeof metadata === 'object') {
        if (metadata.customerId && typeof metadata.customerId === 'string') {
          allCustomerIds.add(metadata.customerId);
        }
        if (metadata.orderId && typeof metadata.orderId === 'string') {
          allOrderIds.add(metadata.orderId);
        }
        if (metadata.opportunityId && typeof metadata.opportunityId === 'string') {
          allOpportunityIds.add(metadata.opportunityId);
        }
      }
    });

    // Batch fetch all names at once (wrap empty arrays in Promise.resolve for Promise.all)
    const [customerNames, orderNumbers, opportunityTitles] = await Promise.all([
      allCustomerIds.size > 0
        ? db
            .select({ id: customers.id, name: customers.name })
            .from(customers)
            .where(
              and(
                inArray(customers.id, Array.from(allCustomerIds)),
                eq(customers.organizationId, ctx.organizationId)
              )
            )
        : Promise.resolve([]),
      allOrderIds.size > 0
        ? db
            .select({ id: orders.id, orderNumber: orders.orderNumber })
            .from(orders)
            .where(
              and(
                inArray(orders.id, Array.from(allOrderIds)),
                eq(orders.organizationId, ctx.organizationId)
              )
            )
        : Promise.resolve([]),
      allOpportunityIds.size > 0
        ? db
            .select({ id: opportunities.id, title: opportunities.title })
            .from(opportunities)
            .where(
              and(
                inArray(opportunities.id, Array.from(allOpportunityIds)),
                eq(opportunities.organizationId, ctx.organizationId)
              )
            )
        : Promise.resolve([]),
    ]);

    // Create lookup maps
    const customerMap = new Map(customerNames.map((c) => [c.id, c.name]));
    const orderMap = new Map(orderNumbers.map((o) => [o.id, o.orderNumber]));
    const opportunityMap = new Map(opportunityTitles.map((o) => [o.id, o.title]));

    // Transform results to include user data, entity name, and resolved metadata
    // Use denormalized entity_name column (populated at write time) instead of joins
    const items = results.map((r) => {
      // Use denormalized entity_name column - avoids 6 unnecessary LEFT JOINs
      const entityName = r.activity.entityName ?? null;

      // Resolve UUIDs in metadata using the batch-fetched maps
      let resolvedMetadata = r.activity.metadata;
      if (resolvedMetadata && typeof resolvedMetadata === 'object') {
        resolvedMetadata = { ...resolvedMetadata };
        if (resolvedMetadata.customerId && typeof resolvedMetadata.customerId === 'string') {
          const customerName = customerMap.get(resolvedMetadata.customerId);
          if (customerName) {
            resolvedMetadata.customerName = customerName;
          }
        }
        if (resolvedMetadata.orderId && typeof resolvedMetadata.orderId === 'string') {
          const orderNumber = orderMap.get(resolvedMetadata.orderId);
          if (orderNumber) {
            resolvedMetadata.orderNumber = orderNumber;
          }
        }
        if (resolvedMetadata.opportunityId && typeof resolvedMetadata.opportunityId === 'string') {
          const opportunityTitle = opportunityMap.get(resolvedMetadata.opportunityId);
          if (opportunityTitle) {
            resolvedMetadata.opportunityTitle = opportunityTitle;
          }
        }
      }

      return {
        ...r.activity,
        metadata: resolvedMetadata,
        user: r.user?.id ? r.user : null,
        entityName,
      };
    });

    return buildStandardCursorResponse<ActivityWithUser>(items, pageSize);
  });

// ============================================================================
// ENTITY ACTIVITIES
// ============================================================================

/**
 * Get activity history for a specific entity.
 * For customers, also includes related order activities.
 */
export const getEntityActivities = createServerFn({ method: 'GET' })
  .inputValidator(entityActivitiesQuerySchema)
  .handler(async ({ data }): Promise<CursorPaginatedResponse<ActivityWithUser>> => {
    const ctx = await withAuth({ permission: PERMISSIONS.customer.read });

    const { entityType, entityId, relatedCustomerId, cursor, pageSize } = data;

    // Build where conditions
    // For customers, also include order activities where metadata.customerId matches
    // For orders, when relatedCustomerId provided, also include customer activities (Quick Log, etc.)
    const conditions = [eq(activities.organizationId, ctx.organizationId)];

    if (entityType === 'customer') {
      // Include both customer activities and order activities for this customer
      conditions.push(
        or(
          // Direct customer activities
          and(
            eq(activities.entityType, 'customer'),
            eq(activities.entityId, entityId)
          ),
          // Order activities where metadata.customerId matches
          // Use computed column instead of JSONB extraction for better performance
          and(
            eq(activities.entityType, 'order'),
            eq(activities.customerIdFromMetadata, entityId)
          )
        )!
      );
    } else if (entityType === 'order' && relatedCustomerId) {
      // Include both order activities and customer activities for the order's customer
      conditions.push(
        or(
          and(
            eq(activities.entityType, 'order'),
            eq(activities.entityId, entityId)
          ),
          and(
            eq(activities.entityType, 'customer'),
            eq(activities.entityId, relatedCustomerId)
          )
        )!
      );
    } else {
      // For other entity types, use standard filtering
      conditions.push(eq(activities.entityType, entityType));
      conditions.push(eq(activities.entityId, entityId));
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

    // Query with user join - use denormalized entity_name column instead of multiple LEFT JOINs
    // Per SCHEMA-TRACE.md: Use db.select() with typed columns, avoid unnecessary joins
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

    // Collect all UUIDs from metadata across all activities for batch resolution
    const allCustomerIds = new Set<string>();
    const allOrderIds = new Set<string>();
    const allOpportunityIds = new Set<string>();

    results.forEach((r) => {
      const metadata = r.activity.metadata;
      if (metadata && typeof metadata === 'object') {
        if (metadata.customerId && typeof metadata.customerId === 'string') {
          allCustomerIds.add(metadata.customerId);
        }
        if (metadata.orderId && typeof metadata.orderId === 'string') {
          allOrderIds.add(metadata.orderId);
        }
        if (metadata.opportunityId && typeof metadata.opportunityId === 'string') {
          allOpportunityIds.add(metadata.opportunityId);
        }
      }
    });

    // Batch fetch all names at once (wrap empty arrays in Promise.resolve for Promise.all)
    const [customerNames, orderNumbers, opportunityTitles] = await Promise.all([
      allCustomerIds.size > 0
        ? db
            .select({ id: customers.id, name: customers.name })
            .from(customers)
            .where(
              and(
                inArray(customers.id, Array.from(allCustomerIds)),
                eq(customers.organizationId, ctx.organizationId)
              )
            )
        : Promise.resolve([]),
      allOrderIds.size > 0
        ? db
            .select({ id: orders.id, orderNumber: orders.orderNumber })
            .from(orders)
            .where(
              and(
                inArray(orders.id, Array.from(allOrderIds)),
                eq(orders.organizationId, ctx.organizationId)
              )
            )
        : Promise.resolve([]),
      allOpportunityIds.size > 0
        ? db
            .select({ id: opportunities.id, title: opportunities.title })
            .from(opportunities)
            .where(
              and(
                inArray(opportunities.id, Array.from(allOpportunityIds)),
                eq(opportunities.organizationId, ctx.organizationId)
              )
            )
        : Promise.resolve([]),
    ]);

    // Create lookup maps
    const customerMap = new Map(customerNames.map((c) => [c.id, c.name]));
    const orderMap = new Map(orderNumbers.map((o) => [o.id, o.orderNumber]));
    const opportunityMap = new Map(opportunityTitles.map((o) => [o.id, o.title]));

    // Transform results to include user data, entity name, and resolved metadata
    // Use denormalized entity_name column (populated at write time) instead of joins
    const items = results.map((r) => {
      // Use denormalized entity_name column - avoids 6 unnecessary LEFT JOINs
      const entityName = r.activity.entityName ?? null;

      // Resolve UUIDs in metadata using the batch-fetched maps
      let resolvedMetadata = r.activity.metadata;
      if (resolvedMetadata && typeof resolvedMetadata === 'object') {
        resolvedMetadata = { ...resolvedMetadata };
        if (resolvedMetadata.customerId && typeof resolvedMetadata.customerId === 'string') {
          const customerName = customerMap.get(resolvedMetadata.customerId);
          if (customerName) {
            resolvedMetadata.customerName = customerName;
          }
        }
        if (resolvedMetadata.orderId && typeof resolvedMetadata.orderId === 'string') {
          const orderNumber = orderMap.get(resolvedMetadata.orderId);
          if (orderNumber) {
            resolvedMetadata.orderNumber = orderNumber;
          }
        }
        if (resolvedMetadata.opportunityId && typeof resolvedMetadata.opportunityId === 'string') {
          const opportunityTitle = opportunityMap.get(resolvedMetadata.opportunityId);
          if (opportunityTitle) {
            resolvedMetadata.opportunityTitle = opportunityTitle;
          }
        }
      }

      return {
        ...r.activity,
        metadata: resolvedMetadata,
        user: r.user?.id ? r.user : null,
        entityName,
      };
    });

    return buildStandardCursorResponse<ActivityWithUser>(items, pageSize);
  });

// ============================================================================
// USER ACTIVITIES
// ============================================================================

/**
 * Get all activities performed by a specific user.
 */
export const getUserActivities = createServerFn({ method: 'GET' })
  .inputValidator(userActivitiesQuerySchema)
  .handler(async ({ data }): Promise<CursorPaginatedResponse<Activity>> => {
    const ctx = await withAuth({ permission: PERMISSIONS.customer.read });

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

    return buildStandardCursorResponse<Activity>(results, pageSize);
  });

// ============================================================================
// SINGLE ACTIVITY
// ============================================================================

/**
 * Get a single activity by ID.
 */
export const getActivity = createServerFn({ method: 'GET' })
  .inputValidator(activityParamsSchema)
  .handler(async ({ data }): Promise<ActivityWithUser> => {
    const ctx = await withAuth({ permission: PERMISSIONS.customer.read });

    const { id } = data;

    // Use denormalized entity_name column instead of multiple LEFT JOINs
    // Per SCHEMA-TRACE.md: Use db.select() with typed columns, avoid unnecessary joins
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

    const r = result[0];
    const activity = r.activity;
    const user = r.user?.id ? r.user : null;

    // Use denormalized entity_name column - avoids 6 unnecessary LEFT JOINs
    const entityName = activity.entityName ?? null;

    // Resolve UUIDs in metadata to readable names
    const resolvedMetadata = await resolveMetadataUuids(
      activity.metadata,
      ctx.organizationId
    );

    const activityWithUser: ActivityWithUser = {
      ...activity,
      metadata: resolvedMetadata,
      user,
      entityName,
    };
    return activityWithUser;
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
    const ctx = await withAuth({ permission: PERMISSIONS.customer.read });

    const { dateFrom, dateTo, groupBy } = data;

    const requiresBoundedRange = groupBy === 'day' || groupBy === 'hour';
    const effectiveDateFrom =
      dateFrom ?? (requiresBoundedRange ? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) : undefined);
    const effectiveDateTo = dateTo ?? (requiresBoundedRange ? new Date() : undefined);

    // Build where conditions
    const conditions = [eq(activities.organizationId, ctx.organizationId)];

    if (effectiveDateFrom) {
      conditions.push(gte(activities.createdAt, effectiveDateFrom));
    }
    if (effectiveDateTo) {
      conditions.push(lte(activities.createdAt, effectiveDateTo));
    }

    const whereClause = and(...conditions);

    // Get total count
    const totalResult = await db.select({ count: count() }).from(activities).where(whereClause);
    const total = totalResult[0]?.count ?? 0;

    // Get grouped stats based on groupBy parameter
    let stats: { key: string; count: number }[] = [];

    switch (groupBy) {
      case 'action': {
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
      }

      case 'entityType': {
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
      }

      // COMMS-AUTO-002: Group by source for auto-capture analytics
      case 'source': {
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
      }

      case 'userId': {
        const userStats = await db
          .select({
            key: activities.userId,
            count: count(),
          })
          .from(activities)
          .where(and(whereClause, isNotNull(activities.userId)))
          .groupBy(activities.userId)
          .orderBy(desc(count()))
          .limit(20); // Limit to top 20 users
        stats = userStats.map((s) => ({
          key: s.key ?? 'unknown',
          count: s.count,
        }));
        break;
      }

      case 'day': {
        const dayKeyExpr = sql<Date>`date_trunc('day', ${activities.createdAt})`;
        const dayStats = await db
          .select({
            key: dayKeyExpr,
            count: count(),
          })
          .from(activities)
          .where(whereClause)
          .groupBy(dayKeyExpr)
          .orderBy(dayKeyExpr);

        stats = dayStats.map((s) => {
          const date = new Date(s.key);
          const dayKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
            date.getDate()
          ).padStart(2, '0')}`;
          return { key: dayKey, count: s.count };
        });
        break;
      }

      case 'hour': {
        const hourKeyExpr = sql<number>`extract(hour from ${activities.createdAt})`;
        const hourStats = await db
          .select({
            key: hourKeyExpr,
            count: count(),
          })
          .from(activities)
          .where(whereClause)
          .groupBy(hourKeyExpr)
          .orderBy(hourKeyExpr);

        stats = hourStats.map((s) => ({
          key: String(s.key).padStart(2, '0'),
          count: s.count,
        }));
        break;
      }
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
        from: effectiveDateFrom ?? null,
        to: effectiveDateTo ?? null,
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
    const ctx = await withAuth({ permission: PERMISSIONS.customer.read });

    const { dateFrom, dateTo } = data;

    // Build where conditions
    const conditions = [
      eq(activities.organizationId, ctx.organizationId),
      isNotNull(activities.userId),
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
            .where(and(inArray(users.id, userIds), eq(users.organizationId, ctx.organizationId)))
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
    const ctx = await withAuth({ permission: PERMISSIONS.report.export });

    const { format } = data;

    // STUB: Export functionality not yet implemented
    // When implementing:
    // 1. Create jobs table if not exists
    // 2. Create Trigger.dev task for async export
    // 3. Stream activities to CSV/JSON/PDF based on format
    // 4. Upload to S3/R2 and return signed URL
    // 5. Add job status polling endpoint

    logger.warn('[Activity Export] STUB: Export not implemented', {
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
    const ctx = await withAuth({ permission: PERMISSIONS.customer.read });

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

// ============================================================================
// LOG ENTITY ACTIVITY
// ============================================================================

/**
 * Log a manual activity for any entity type.
 * Creates an activity record with 'note_added' or 'call_logged' action based on type.
 */
export const logEntityActivity = createServerFn({ method: 'POST' })
  .inputValidator(logEntityActivitySchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.customer.read }); // Basic permission

    const { entityType, entityId, activityType, description, outcome, scheduledAt, isFollowUp } = data;

    // Verify entity exists and belongs to org
    if (entityType === 'customer') {
      await verifyCustomerExists(entityId, ctx.organizationId);
    } else if (entityType === 'order') {
      await verifyOrderExists(entityId, ctx.organizationId);
    } else if (entityType === 'opportunity') {
      await verifyOpportunityExists(entityId, ctx.organizationId);
    }
    // Other entity types: no verification (legacy/unsupported)

    // Determine action based on activity type
    const action = activityType === 'call' ? 'call_logged' : 'note_added';

    // Build metadata object (follows pattern from quick-log.ts)
    const metadata: ActivityMetadata = {
      logType: activityType,
      fullNotes: description,
    };

    // Add optional fields
    if (outcome) {
      metadata.notes = outcome; // Use notes field for outcome
    }
    if (scheduledAt) {
      metadata.scheduledDate = scheduledAt.toISOString();
    }
    if (isFollowUp) {
      metadata.reason = 'follow_up'; // Mark as follow-up in reason field
    }

    // Create the activity
    const [activity] = await db
      .insert(activities)
      .values({
        organizationId: ctx.organizationId,
        userId: ctx.user.id,
        entityType,
        entityId,
        action,
        description: `${activityType.charAt(0).toUpperCase() + activityType.slice(1).replace('_', ' ')}: ${description.substring(0, 100)}${description.length > 100 ? '...' : ''}`,
        metadata,
        source: 'manual',
        createdBy: ctx.user.id,
      })
      .returning();

    return { activity };
  });

