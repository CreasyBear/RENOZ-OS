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
import { eq, and, or, desc, asc, sql, gte, lte, inArray, count } from 'drizzle-orm';
import { db } from '@/lib/db';
import { activities, users, customers, orders, opportunities, products, contacts, suppliers } from 'drizzle/schema';
import {
  activityFeedQuerySchema,
  entityActivitiesQuerySchema,
  userActivitiesQuerySchema,
  activityStatsQuerySchema,
  activityExportRequestSchema,
  activityParamsSchema,
  type ActivityStatsResult,
  type ActivityLeaderboardItem,
  type ActivityWithUser,
  type ActivityMetadata,
} from '@/lib/schemas/activities';
import {
  decodeCursor,
  buildCursorCondition,
  buildStandardCursorResponse,
} from '@/lib/db/pagination';
import { withAuth } from '@/lib/server/protected';
import { NotFoundError } from '@/lib/server/errors';
import { PERMISSIONS } from '@/lib/auth/permissions';

// ============================================================================
// METADATA RESOLUTION HELPER
// ============================================================================

/**
 * Resolve UUIDs in metadata to readable names.
 * Transforms metadata fields like customerId, orderId, opportunityId to include names.
 */
async function resolveMetadataUuids(
  metadata: ActivityMetadata | null,
  organizationId: string
): Promise<ActivityMetadata | null> {
  if (!metadata || typeof metadata !== 'object') return metadata;

  const resolved = { ...metadata };
  const customerIds = new Set<string>();
  const orderIds = new Set<string>();
  const opportunityIds = new Set<string>();

  // Collect UUIDs from metadata
  if (metadata.customerId && typeof metadata.customerId === 'string') {
    customerIds.add(metadata.customerId);
  }
  if (metadata.orderId && typeof metadata.orderId === 'string') {
    orderIds.add(metadata.orderId);
  }
  if (metadata.opportunityId && typeof metadata.opportunityId === 'string') {
    opportunityIds.add(metadata.opportunityId);
  }

  // Batch fetch names
  const [customerNames, orderNumbers, opportunityTitles] = await Promise.all([
    customerIds.size > 0
      ? db
          .select({ id: customers.id, name: customers.name })
          .from(customers)
          .where(
            and(
              inArray(customers.id, Array.from(customerIds)),
              eq(customers.organizationId, organizationId)
            )
          )
      : [],
    orderIds.size > 0
      ? db
          .select({ id: orders.id, orderNumber: orders.orderNumber })
          .from(orders)
          .where(
            and(
              inArray(orders.id, Array.from(orderIds)),
              eq(orders.organizationId, organizationId)
            )
          )
      : [],
    opportunityIds.size > 0
      ? db
          .select({ id: opportunities.id, title: opportunities.title })
          .from(opportunities)
          .where(
            and(
              inArray(opportunities.id, Array.from(opportunityIds)),
              eq(opportunities.organizationId, organizationId)
            )
          )
      : [],
  ]);

  // Create lookup maps
  const customerMap = new Map(customerNames.map((c) => [c.id, c.name]));
  const orderMap = new Map(orderNumbers.map((o) => [o.id, o.orderNumber]));
  const opportunityMap = new Map(opportunityTitles.map((o) => [o.id, o.title]));

  // Add resolved names to metadata (keep original UUIDs for reference)
  if (metadata.customerId && typeof metadata.customerId === 'string') {
    const customerName = customerMap.get(metadata.customerId);
    if (customerName) {
      resolved.customerName = customerName;
    }
  }
  if (metadata.orderId && typeof metadata.orderId === 'string') {
    const orderNumber = orderMap.get(metadata.orderId);
    if (orderNumber) {
      resolved.orderNumber = orderNumber;
    }
  }
  if (metadata.opportunityId && typeof metadata.opportunityId === 'string') {
    const opportunityTitle = opportunityMap.get(metadata.opportunityId);
    if (opportunityTitle) {
      resolved.opportunityTitle = opportunityTitle;
    }
  }

  return resolved;
}

// ============================================================================
// ACTIVITY FEED
// ============================================================================

/**
 * Get organization-wide activity feed with filtering and cursor pagination.
 */
export const getActivityFeed = createServerFn({ method: 'GET' })
  .inputValidator(activityFeedQuerySchema)
  .handler(async ({ data }): Promise<ReturnType<typeof buildStandardCursorResponse>> => {
    try {
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

    // Query with user join and entity joins for names
    const results = await db
      .select({
        activity: activities,
        user: {
          id: users.id,
          name: users.name,
          email: users.email,
        },
        // Entity names from different tables
        customerName: customers.name,
        orderNumber: orders.orderNumber,
        opportunityTitle: opportunities.title,
        productName: products.name,
        contactName: sql<string | null>`CASE WHEN ${contacts.firstName} IS NOT NULL AND ${contacts.lastName} IS NOT NULL THEN CONCAT(${contacts.firstName}, ' ', ${contacts.lastName}) ELSE NULL END`,
        supplierName: suppliers.name,
      })
      .from(activities)
      .leftJoin(users, eq(activities.userId, users.id))
      .leftJoin(customers, and(
        eq(activities.entityType, 'customer'),
        eq(activities.entityId, customers.id),
        eq(customers.organizationId, ctx.organizationId)
      ))
      .leftJoin(orders, and(
        eq(activities.entityType, 'order'),
        eq(activities.entityId, orders.id),
        eq(orders.organizationId, ctx.organizationId)
      ))
      .leftJoin(opportunities, and(
        eq(activities.entityType, 'opportunity'),
        eq(activities.entityId, opportunities.id),
        eq(opportunities.organizationId, ctx.organizationId)
      ))
      .leftJoin(products, and(
        eq(activities.entityType, 'product'),
        eq(activities.entityId, products.id),
        eq(products.organizationId, ctx.organizationId)
      ))
      .leftJoin(contacts, and(
        eq(activities.entityType, 'contact'),
        eq(activities.entityId, contacts.id),
        eq(contacts.organizationId, ctx.organizationId)
      ))
      .leftJoin(suppliers, and(
        eq(activities.entityType, 'supplier'),
        eq(activities.entityId, suppliers.id),
        eq(suppliers.organizationId, ctx.organizationId)
      ))
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
    const items = results.map((r) => {
      // Determine entity name based on entityType
      let entityName: string | null = null;
      switch (r.activity.entityType) {
        case 'customer':
          entityName = r.customerName ?? null;
          break;
        case 'order':
          entityName = r.orderNumber ?? null;
          break;
        case 'opportunity':
          entityName = r.opportunityTitle ?? null;
          break;
        case 'product':
          entityName = r.productName ?? null;
          break;
        case 'contact':
          entityName = r.contactName ?? null;
          break;
        case 'supplier':
          entityName = r.supplierName ?? null;
          break;
        default:
          entityName = null;
      }

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

    return buildStandardCursorResponse(items, pageSize);
    } catch (error) {
      console.error('[getActivityFeed] Error:', error);
      throw error;
    }
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
  .handler(async ({ data }): Promise<ReturnType<typeof buildStandardCursorResponse>> => {
    const ctx = await withAuth({ permission: PERMISSIONS.customer.read });

    const { entityType, entityId, cursor, pageSize } = data;

    // Build where conditions
    // For customers, also include order activities where metadata.customerId matches
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
          and(
            eq(activities.entityType, 'order'),
            sql`${activities.metadata}->>'customerId' = ${entityId}`
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

    // Query with user join and entity joins for names
    const results = await db
      .select({
        activity: activities,
        user: {
          id: users.id,
          name: users.name,
          email: users.email,
        },
        // Entity names from different tables
        customerName: customers.name,
        orderNumber: orders.orderNumber,
        opportunityTitle: opportunities.title,
        productName: products.name,
        contactName: sql<string | null>`CASE WHEN ${contacts.firstName} IS NOT NULL AND ${contacts.lastName} IS NOT NULL THEN CONCAT(${contacts.firstName}, ' ', ${contacts.lastName}) ELSE NULL END`,
        supplierName: suppliers.name,
      })
      .from(activities)
      .leftJoin(users, eq(activities.userId, users.id))
      .leftJoin(customers, and(
        eq(activities.entityType, 'customer'),
        eq(activities.entityId, customers.id),
        eq(customers.organizationId, ctx.organizationId)
      ))
      .leftJoin(orders, and(
        eq(activities.entityType, 'order'),
        eq(activities.entityId, orders.id),
        eq(orders.organizationId, ctx.organizationId)
      ))
      .leftJoin(opportunities, and(
        eq(activities.entityType, 'opportunity'),
        eq(activities.entityId, opportunities.id),
        eq(opportunities.organizationId, ctx.organizationId)
      ))
      .leftJoin(products, and(
        eq(activities.entityType, 'product'),
        eq(activities.entityId, products.id),
        eq(products.organizationId, ctx.organizationId)
      ))
      .leftJoin(contacts, and(
        eq(activities.entityType, 'contact'),
        eq(activities.entityId, contacts.id),
        eq(contacts.organizationId, ctx.organizationId)
      ))
      .leftJoin(suppliers, and(
        eq(activities.entityType, 'supplier'),
        eq(activities.entityId, suppliers.id),
        eq(suppliers.organizationId, ctx.organizationId)
      ))
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
    const items = results.map((r) => {
      // Determine entity name based on entityType
      let entityName: string | null = null;
      switch (r.activity.entityType) {
        case 'customer':
          entityName = r.customerName ?? null;
          break;
        case 'order':
          entityName = r.orderNumber ?? null;
          break;
        case 'opportunity':
          entityName = r.opportunityTitle ?? null;
          break;
        case 'product':
          entityName = r.productName ?? null;
          break;
        case 'contact':
          entityName = r.contactName ?? null;
          break;
        case 'supplier':
          entityName = r.supplierName ?? null;
          break;
        default:
          entityName = null;
      }

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
    const ctx = await withAuth({ permission: PERMISSIONS.customer.read });

    const { id } = data;

    const result = await db
      .select({
        activity: activities,
        user: {
          id: users.id,
          name: users.name,
          email: users.email,
        },
        // Entity names from different tables
        customerName: customers.name,
        orderNumber: orders.orderNumber,
        opportunityTitle: opportunities.title,
        productName: products.name,
        contactName: sql<string | null>`CASE WHEN ${contacts.firstName} IS NOT NULL AND ${contacts.lastName} IS NOT NULL THEN CONCAT(${contacts.firstName}, ' ', ${contacts.lastName}) ELSE NULL END`,
        supplierName: suppliers.name,
      })
      .from(activities)
      .leftJoin(users, eq(activities.userId, users.id))
      .leftJoin(customers, and(
        eq(activities.entityType, 'customer'),
        eq(activities.entityId, customers.id),
        eq(customers.organizationId, ctx.organizationId)
      ))
      .leftJoin(orders, and(
        eq(activities.entityType, 'order'),
        eq(activities.entityId, orders.id),
        eq(orders.organizationId, ctx.organizationId)
      ))
      .leftJoin(opportunities, and(
        eq(activities.entityType, 'opportunity'),
        eq(activities.entityId, opportunities.id),
        eq(opportunities.organizationId, ctx.organizationId)
      ))
      .leftJoin(products, and(
        eq(activities.entityType, 'product'),
        eq(activities.entityId, products.id),
        eq(products.organizationId, ctx.organizationId)
      ))
      .leftJoin(contacts, and(
        eq(activities.entityType, 'contact'),
        eq(activities.entityId, contacts.id),
        eq(contacts.organizationId, ctx.organizationId)
      ))
      .leftJoin(suppliers, and(
        eq(activities.entityType, 'supplier'),
        eq(activities.entityId, suppliers.id),
        eq(suppliers.organizationId, ctx.organizationId)
      ))
      .where(and(eq(activities.id, id), eq(activities.organizationId, ctx.organizationId)))
      .limit(1);

    if (result.length === 0) {
      throw new NotFoundError('Activity not found', 'activity');
    }

    const r = result[0];
    const activity = r.activity;
    const user = r.user?.id ? r.user : null;

    // Determine entity name based on entityType
    let entityName: string | null = null;
    switch (activity.entityType) {
      case 'customer':
        entityName = r.customerName ?? null;
        break;
      case 'order':
        entityName = r.orderNumber ?? null;
        break;
      case 'opportunity':
        entityName = r.opportunityTitle ?? null;
        break;
      case 'product':
        entityName = r.productName ?? null;
        break;
      case 'contact':
        entityName = r.contactName ?? null;
        break;
      case 'supplier':
        entityName = r.supplierName ?? null;
        break;
      default:
        entityName = null;
    }

    // Resolve UUIDs in metadata to readable names
    const resolvedMetadata = await resolveMetadataUuids(
      activity.metadata,
      ctx.organizationId
    );

    return {
      ...activity,
      metadata: resolvedMetadata,
      user,
      entityName,
    } as ActivityWithUser;
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
    const ctx = await withAuth({ permission: PERMISSIONS.customer.read });

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
    const ctx = await withAuth({ permission: PERMISSIONS.report.export });

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
