/**
 * Customer Server Functions
 *
 * Comprehensive server-side functions for customer domain operations.
 * Uses Drizzle ORM with Zod validation.
 *
 * SECURITY: All functions use withAuth for authentication and
 * filter by organizationId for multi-tenant isolation.
 *
 * @see src/lib/schemas/customers.ts for validation schemas
 * @see drizzle/schema/customers.ts for database schema
 */

import { createServerFn } from "@tanstack/react-start";
import { eq, and, or, ilike, desc, asc, sql, inArray, gte, lte, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { containsPattern } from "@/lib/db/utils";
import {
  customers,
  contacts,
  addresses,
  customerActivities,
  customerTags,
  customerTagAssignments,
  customerHealthMetrics,
  customerPriorities,
  orders,
  users,
  activities,
} from "drizzle/schema";
import {
  createCustomerSchema,
  updateCustomerSchema,
  customerListQuerySchema,
  customerCursorQuerySchema,
  customerParamsSchema,
  createContactSchema,
  updateContactSchema,
  contactParamsSchema,
  createAddressSchema,
  updateAddressSchema,
  addressParamsSchema,
  createCustomerActivitySchema,
  customerActivityFilterSchema,
  createCustomerTagSchema,
  updateCustomerTagSchema,
  customerTagParamsSchema,
  assignCustomerTagSchema,
  unassignCustomerTagSchema,
  createCustomerHealthMetricSchema,
  customerHealthMetricFilterSchema,
  createCustomerPrioritySchema,
  updateCustomerPrioritySchema,
  bulkUpdateCustomersSchema,
  bulkDeleteCustomersSchema,
  bulkAssignTagsSchema,
  mergeCustomersSchema,
} from "@/lib/schemas/customers";
import {
  decodeCursor,
  buildCursorCondition,
  buildStandardCursorResponse,
} from "@/lib/db/pagination";
import { withAuth } from "@/lib/server/protected";
import { PERMISSIONS } from "@/lib/auth/permissions";

// ============================================================================
// CUSTOMER CRUD
// ============================================================================

/**
 * Get customers with offset pagination (legacy, for backwards compatibility)
 */
export const getCustomers = createServerFn({ method: "GET" })
  .inputValidator(customerListQuerySchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.customer.read });

    const { page, pageSize, sortBy, sortOrder, search, status, type, size, industry, healthScoreMin, healthScoreMax } = data;

    // Build where conditions - ALWAYS include organizationId for isolation
    const conditions = [
      eq(customers.organizationId, ctx.organizationId),
      isNull(customers.deletedAt),
    ];

    if (search) {
      const searchPattern = containsPattern(search);
      conditions.push(
        or(
          ilike(customers.name, searchPattern),
          ilike(customers.email, searchPattern)
        )!
      );
    }
    if (status) {
      conditions.push(eq(customers.status, status));
    }
    if (type) {
      conditions.push(eq(customers.type, type));
    }
    if (size) {
      conditions.push(eq(customers.size, size));
    }
    if (industry) {
      conditions.push(ilike(customers.industry, containsPattern(industry)));
    }
    if (healthScoreMin !== undefined) {
      conditions.push(gte(customers.healthScore, healthScoreMin));
    }
    if (healthScoreMax !== undefined) {
      conditions.push(lte(customers.healthScore, healthScoreMax));
    }

    const whereClause = and(...conditions);

    // Get total count - use COUNT(DISTINCT) to account for potential duplicates from JOINs
    // Since we GROUP BY customers.id, this should match the grouped result count
    const countResult = await db
      .select({ count: sql<number>`COUNT(DISTINCT ${customers.id})` })
      .from(customers)
      .where(whereClause);
    const totalItems = Number(countResult[0]?.count ?? 0);

    // Get paginated results with aggregated order metrics
    const offset = (page - 1) * pageSize;
    const orderDirection = sortOrder === "asc" ? asc : desc;
    
    // Determine order column based on sortBy
    // For aggregated fields, we need to use sql template literals
    let orderByClause;
    if (sortBy === "name") {
      orderByClause = orderDirection(customers.name);
    } else if (sortBy === "lifetimeValue") {
      orderByClause = orderDirection(sql`COALESCE(SUM(${orders.total}), 0)`);
    } else if (sortBy === "totalOrders") {
      orderByClause = orderDirection(sql`COUNT(${orders.id})`);
    } else if (sortBy === "healthScore") {
      orderByClause = orderDirection(customers.healthScore);
    } else if (sortBy === "lastOrderDate") {
      orderByClause = orderDirection(sql`MAX(${orders.orderDate})`);
    } else if (sortBy === "status") {
      orderByClause = orderDirection(customers.status);
    } else {
      // Default to createdAt
      orderByClause = orderDirection(customers.createdAt);
    }

    // Build order aggregation conditions
    const validOrderCondition = and(
      eq(orders.organizationId, ctx.organizationId),
      isNull(orders.deletedAt),
      sql`${orders.status} NOT IN ('draft', 'cancelled')`
    );

    const items = await db
      .select({
        id: customers.id,
        organizationId: customers.organizationId,
        customerCode: customers.customerCode,
        name: customers.name,
        legalName: customers.legalName,
        email: customers.email,
        phone: customers.phone,
        website: customers.website,
        status: customers.status,
        type: customers.type,
        size: customers.size,
        industry: customers.industry,
        taxId: customers.taxId,
        registrationNumber: customers.registrationNumber,
        parentId: customers.parentId,
        creditLimit: customers.creditLimit,
        creditHold: customers.creditHold,
        creditHoldReason: customers.creditHoldReason,
        healthScore: customers.healthScore,
        healthScoreUpdatedAt: customers.healthScoreUpdatedAt,
        // Aggregated order metrics using LEFT JOIN with GROUP BY
        lifetimeValue: sql<number>`COALESCE(SUM(${orders.total}), 0)::numeric`,
        totalOrderValue: sql<number>`COALESCE(SUM(${orders.total}), 0)::numeric`,
        averageOrderValue: sql<number>`COALESCE(AVG(${orders.total}), 0)::numeric`,
        totalOrders: sql<number>`COUNT(${orders.id})::int`,
        firstOrderDate: sql<Date | null>`MIN(${orders.orderDate})`,
        lastOrderDate: sql<Date | null>`MAX(${orders.orderDate})`,
        tags: customers.tags,
        customFields: customers.customFields,
        warrantyExpiryAlertOptOut: customers.warrantyExpiryAlertOptOut,
        createdAt: customers.createdAt,
        updatedAt: customers.updatedAt,
        createdBy: customers.createdBy,
        updatedBy: customers.updatedBy,
        deletedAt: customers.deletedAt,
      })
      .from(customers)
      .leftJoin(
        orders,
        and(
          eq(orders.customerId, customers.id),
          validOrderCondition
        )
      )
      .where(whereClause)
      .groupBy(
        customers.id,
        customers.organizationId,
        customers.customerCode,
        customers.name,
        customers.legalName,
        customers.email,
        customers.phone,
        customers.website,
        customers.status,
        customers.type,
        customers.size,
        customers.industry,
        customers.taxId,
        customers.registrationNumber,
        customers.parentId,
        customers.creditLimit,
        customers.creditHold,
        customers.creditHoldReason,
        customers.healthScore,
        customers.healthScoreUpdatedAt,
        customers.tags,
        customers.customFields,
        customers.warrantyExpiryAlertOptOut,
        customers.createdAt,
        customers.updatedAt,
        customers.createdBy,
        customers.updatedBy,
        customers.deletedAt
      )
      .orderBy(
        orderByClause,
        // Add secondary sort by createdAt (descending) for recently created, unless already sorting by createdAt
        ...(sortBy !== "createdAt" ? [desc(customers.createdAt)] : [])
      )
      .limit(pageSize)
      .offset(offset);

    return {
      items,
      pagination: {
        page,
        pageSize,
        totalItems,
        totalPages: Math.ceil(totalItems / pageSize),
      },
    };
  });

/**
 * Get customers with cursor pagination (recommended for large datasets)
 */
export const getCustomersCursor = createServerFn({ method: "GET" })
  .inputValidator(customerCursorQuerySchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.customer.read });

    const { cursor, pageSize, sortOrder, search, status, type, size, industry, healthScoreMin, healthScoreMax } = data;

    // Build where conditions
    const conditions = [
      eq(customers.organizationId, ctx.organizationId),
      sql`${customers.deletedAt} IS NULL`,
    ];

    if (search) {
      const searchPattern = containsPattern(search);
      conditions.push(
        or(
          ilike(customers.name, searchPattern),
          ilike(customers.email, searchPattern)
        )!
      );
    }
    if (status) {
      conditions.push(eq(customers.status, status));
    }
    if (type) {
      conditions.push(eq(customers.type, type));
    }
    if (size) {
      conditions.push(eq(customers.size, size));
    }
    if (industry) {
      conditions.push(ilike(customers.industry, containsPattern(industry)));
    }
    if (healthScoreMin !== undefined) {
      conditions.push(gte(customers.healthScore, healthScoreMin));
    }
    if (healthScoreMax !== undefined) {
      conditions.push(lte(customers.healthScore, healthScoreMax));
    }

    // Add cursor condition if provided
    if (cursor) {
      const cursorPosition = decodeCursor(cursor);
      if (cursorPosition) {
        conditions.push(
          buildCursorCondition(
            customers.createdAt,
            customers.id,
            cursorPosition,
            sortOrder
          )
        );
      }
    }

    const whereClause = and(...conditions);
    const orderDirection = sortOrder === "asc" ? asc : desc;

    // Build order aggregation conditions
    const validOrderCondition = and(
      eq(orders.organizationId, ctx.organizationId),
      isNull(orders.deletedAt),
      sql`${orders.status} NOT IN ('draft', 'cancelled')`
    );

    const results = await db
      .select({
        id: customers.id,
        organizationId: customers.organizationId,
        customerCode: customers.customerCode,
        name: customers.name,
        legalName: customers.legalName,
        email: customers.email,
        phone: customers.phone,
        website: customers.website,
        status: customers.status,
        type: customers.type,
        size: customers.size,
        industry: customers.industry,
        taxId: customers.taxId,
        registrationNumber: customers.registrationNumber,
        parentId: customers.parentId,
        creditLimit: customers.creditLimit,
        creditHold: customers.creditHold,
        creditHoldReason: customers.creditHoldReason,
        healthScore: customers.healthScore,
        healthScoreUpdatedAt: customers.healthScoreUpdatedAt,
        // Aggregated order metrics
        lifetimeValue: sql<number>`COALESCE(SUM(${orders.total}), 0)::numeric`,
        totalOrderValue: sql<number>`COALESCE(SUM(${orders.total}), 0)::numeric`,
        averageOrderValue: sql<number>`COALESCE(AVG(${orders.total}), 0)::numeric`,
        totalOrders: sql<number>`COUNT(${orders.id})::int`,
        firstOrderDate: sql<Date | null>`MIN(${orders.orderDate})`,
        lastOrderDate: sql<Date | null>`MAX(${orders.orderDate})`,
        tags: customers.tags,
        customFields: customers.customFields,
        warrantyExpiryAlertOptOut: customers.warrantyExpiryAlertOptOut,
        createdAt: customers.createdAt,
        updatedAt: customers.updatedAt,
        createdBy: customers.createdBy,
        updatedBy: customers.updatedBy,
        deletedAt: customers.deletedAt,
      })
      .from(customers)
      .leftJoin(
        orders,
        and(
          eq(orders.customerId, customers.id),
          validOrderCondition
        )
      )
      .where(whereClause)
      .groupBy(
        customers.id,
        customers.organizationId,
        customers.customerCode,
        customers.name,
        customers.legalName,
        customers.email,
        customers.phone,
        customers.website,
        customers.status,
        customers.type,
        customers.size,
        customers.industry,
        customers.taxId,
        customers.registrationNumber,
        customers.parentId,
        customers.creditLimit,
        customers.creditHold,
        customers.creditHoldReason,
        customers.healthScore,
        customers.healthScoreUpdatedAt,
        customers.tags,
        customers.customFields,
        customers.warrantyExpiryAlertOptOut,
        customers.createdAt,
        customers.updatedAt,
        customers.createdBy,
        customers.updatedBy,
        customers.deletedAt
      )
      .orderBy(orderDirection(customers.createdAt), orderDirection(customers.id))
      .limit(pageSize + 1);

    return buildStandardCursorResponse(results, pageSize);
  });

/**
 * Get single customer with 360-degree view (contacts, addresses, activities)
 * Includes aggregated order metrics computed from orders table
 */
export const getCustomerById = createServerFn({ method: "GET" })
  .inputValidator(customerParamsSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.customer.read });

    const { id } = data;

    // Get customer with relations using relational query
    const customer = await db.query.customers.findFirst({
      where: and(
        eq(customers.id, id),
        eq(customers.organizationId, ctx.organizationId),
        sql`${customers.deletedAt} IS NULL`
      ),
      with: {
        contacts: true,
        addresses: true,
        activities: {
          orderBy: desc(customerActivities.createdAt),
          limit: 20,
        },
        tagAssignments: {
          with: {
            tag: true,
          },
        },
        priority: true,
      },
    });

    if (!customer) {
      throw new Error("Customer not found");
    }

    // Get aggregated order metrics
    const validOrderCondition = and(
      eq(orders.organizationId, ctx.organizationId),
      isNull(orders.deletedAt),
      sql`${orders.status} NOT IN ('draft', 'cancelled')`
    );

    // Get order metrics and summaries in parallel
    const [
      orderMetrics,
      recentOrders,
      ordersByStatus,
      plannedActivitySummary,
      auditActivitySummary,
      plannedActivityCountResult,
      auditActivityCountResult,
    ] = await Promise.all([
      // Aggregated order metrics
      db
        .select({
          lifetimeValue: sql<number>`COALESCE(SUM(${orders.total}), 0)::numeric`,
          totalOrderValue: sql<number>`COALESCE(SUM(${orders.total}), 0)::numeric`,
          averageOrderValue: sql<number>`COALESCE(AVG(${orders.total}), 0)::numeric`,
          totalOrders: sql<number>`COUNT(${orders.id})::int`,
          firstOrderDate: sql<Date | null>`MIN(${orders.orderDate})`,
          lastOrderDate: sql<Date | null>`MAX(${orders.orderDate})`,
        })
        .from(orders)
        .where(
          and(
            eq(orders.customerId, id),
            validOrderCondition
          )
        ),
      // Recent orders (last 5)
      db
        .select({
          id: orders.id,
          orderNumber: orders.orderNumber,
          status: orders.status,
          paymentStatus: orders.paymentStatus,
          total: orders.total,
          orderDate: orders.orderDate,
          dueDate: orders.dueDate,
        })
        .from(orders)
        .where(
          and(
            eq(orders.customerId, id),
            eq(orders.organizationId, ctx.organizationId),
            isNull(orders.deletedAt)
          )
        )
        .orderBy(desc(orders.orderDate))
        .limit(5),
      // Orders by status breakdown
      db
        .select({
          status: orders.status,
          count: sql<number>`COUNT(*)::int`,
          totalValue: sql<number>`COALESCE(SUM(${orders.total}), 0)::numeric`,
        })
        .from(orders)
        .where(
          and(
            eq(orders.customerId, id),
            eq(orders.organizationId, ctx.organizationId),
            isNull(orders.deletedAt),
            sql`${orders.status} NOT IN ('draft', 'cancelled')`
          )
        )
        .groupBy(orders.status),
      // Planned activity summary by type (customerActivities table)
      db
        .select({
          activityType: customerActivities.activityType,
          count: sql<number>`COUNT(*)::int`,
          lastActivityDate: sql<Date | null>`MAX(${customerActivities.createdAt}::timestamp)`,
        })
        .from(customerActivities)
        .where(
          and(
            eq(customerActivities.customerId, id),
            eq(customerActivities.organizationId, ctx.organizationId)
          )
        )
        .groupBy(customerActivities.activityType),
      // Audit activity summary by action (activities table)
      // Include both customer activities and order activities
      db
        .select({
          activityType: activities.action,
          count: sql<number>`COUNT(*)::int`,
          lastActivityDate: sql<Date | null>`MAX(${activities.createdAt})`,
        })
        .from(activities)
        .where(
          and(
            eq(activities.organizationId, ctx.organizationId),
            or(
              // Direct customer activities
              and(
                eq(activities.entityType, 'customer'),
                eq(activities.entityId, id)
              ),
              // Order activities where metadata.customerId matches
              and(
                eq(activities.entityType, 'order'),
                sql`${activities.metadata}->>'customerId' = ${id}`
              )
            )!
          )
        )
        .groupBy(activities.action),
      // Planned activity total count
      db
        .select({
          totalCount: sql<number>`COUNT(*)::int`,
        })
        .from(customerActivities)
        .where(
          and(
            eq(customerActivities.customerId, id),
            eq(customerActivities.organizationId, ctx.organizationId)
          )
        ),
      // Audit activity total count
      db
        .select({
          totalCount: sql<number>`COUNT(*)::int`,
        })
        .from(activities)
        .where(
          and(
            eq(activities.organizationId, ctx.organizationId),
            or(
              // Direct customer activities
              and(
                eq(activities.entityType, 'customer'),
                eq(activities.entityId, id)
              ),
              // Order activities where metadata.customerId matches
              and(
                eq(activities.entityType, 'order'),
                sql`${activities.metadata}->>'customerId' = ${id}`
              )
            )!
          )
        ),
    ]);

    // Merge activity summaries from both sources
    const activityTypeMap = new Map<string, { count: number; lastActivityDate: Date | string | null }>();

    // Add planned activities
    plannedActivitySummary.forEach((item) => {
      activityTypeMap.set(item.activityType, {
        count: Number(item.count),
        lastActivityDate: item.lastActivityDate,
      });
    });

    // Merge audit activities (sum counts, take latest date)
    auditActivitySummary.forEach((item) => {
      const existing = activityTypeMap.get(item.activityType);
      if (existing) {
        existing.count += Number(item.count);
        // Take the latest date
        const existingDate = existing.lastActivityDate ? new Date(existing.lastActivityDate) : null;
        const newDate = item.lastActivityDate ? new Date(item.lastActivityDate) : null;
        if (newDate && (!existingDate || newDate > existingDate)) {
          existing.lastActivityDate = item.lastActivityDate;
        }
      } else {
        activityTypeMap.set(item.activityType, {
          count: Number(item.count),
          lastActivityDate: item.lastActivityDate,
        });
      }
    });

    const activitySummary = Array.from(activityTypeMap.entries()).map(([activityType, data]) => ({
      activityType,
      count: data.count,
      lastActivityDate: data.lastActivityDate,
    }));

    const totalActivityCount =
      Number(plannedActivityCountResult[0]?.totalCount ?? 0) +
      Number(auditActivityCountResult[0]?.totalCount ?? 0);

    // Extract first result from orderMetrics array
    const orderMetricsData = orderMetrics[0] ?? {
      lifetimeValue: 0,
      totalOrderValue: 0,
      averageOrderValue: 0,
      totalOrders: 0,
      firstOrderDate: null,
      lastOrderDate: null,
    };

    // Merge order metrics and summaries into customer object
    return {
      ...customer,
      lifetimeValue: orderMetricsData.lifetimeValue,
      totalOrderValue: orderMetricsData.totalOrderValue,
      averageOrderValue: orderMetricsData.averageOrderValue,
      totalOrders: orderMetricsData.totalOrders,
      firstOrderDate: orderMetricsData.firstOrderDate,
      lastOrderDate: orderMetricsData.lastOrderDate,
      // Order summary data
      orderSummary: {
        recentOrders: recentOrders ?? [],
        ordersByStatus: ordersByStatus ?? [],
      },
      // Activity summary data
      activitySummary: {
        byType: activitySummary ?? [],
        totalActivities: totalActivityCount,
      },
    };
  });

/**
 * Create a new customer
 */
export const createCustomer = createServerFn({ method: "POST" })
  .inputValidator(createCustomerSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.customer.create });

    const result = await db
      .insert(customers)
      .values({
        ...data,
        organizationId: ctx.organizationId,
        createdBy: ctx.user.id,
        updatedBy: ctx.user.id,
      })
      .returning();

    return result[0] ?? null;
  });

/**
 * Update an existing customer
 */
export const updateCustomer = createServerFn({ method: "POST" })
  .inputValidator(customerParamsSchema.merge(updateCustomerSchema))
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.customer.update });

    const { id, ...updateData } = data;

    const result = await db
      .update(customers)
      .set({
        ...updateData,
        updatedBy: ctx.user.id,
      })
      .where(
        and(
          eq(customers.id, id),
          eq(customers.organizationId, ctx.organizationId),
          sql`${customers.deletedAt} IS NULL`
        )
      )
      .returning();

    if (result.length === 0) {
      throw new Error("Customer not found");
    }

    return result[0] ?? null;
  });

/**
 * Soft delete a customer
 */
export const deleteCustomer = createServerFn({ method: "POST" })
  .inputValidator(customerParamsSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.customer.delete });

    const { id } = data;

    const result = await db
      .update(customers)
      .set({
        deletedAt: new Date(),
        updatedBy: ctx.user.id,
      })
      .where(
        and(
          eq(customers.id, id),
          eq(customers.organizationId, ctx.organizationId),
          sql`${customers.deletedAt} IS NULL`
        )
      )
      .returning();

    if (result.length === 0) {
      throw new Error("Customer not found");
    }

    return { success: true, id: result[0].id };
  });

// ============================================================================
// CONTACTS
// ============================================================================

/**
 * Get contacts for a customer
 */
export const getCustomerContacts = createServerFn({ method: "GET" })
  .inputValidator(customerParamsSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.customer.read });

    const { id: customerId } = data;

    const results = await db
      .select()
      .from(contacts)
      .where(
        and(
          eq(contacts.customerId, customerId),
          eq(contacts.organizationId, ctx.organizationId)
        )
      )
      .orderBy(desc(contacts.isPrimary), asc(contacts.lastName));

    return results;
  });

/**
 * Create a contact
 */
export const createContact = createServerFn({ method: "POST" })
  .inputValidator(createContactSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.customer.update });

    const result = await db
      .insert(contacts)
      .values({
        ...data,
        organizationId: ctx.organizationId,
        createdBy: ctx.user.id,
        updatedBy: ctx.user.id,
      })
      .returning();

    return result[0] ?? null;
  });

/**
 * Update a contact
 */
export const updateContact = createServerFn({ method: "POST" })
  .inputValidator(contactParamsSchema.merge(updateContactSchema))
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.customer.update });

    const { id, ...updateData } = data;

    const result = await db
      .update(contacts)
      .set({
        ...updateData,
        updatedBy: ctx.user.id,
      })
      .where(
        and(
          eq(contacts.id, id),
          eq(contacts.organizationId, ctx.organizationId)
        )
      )
      .returning();

    if (result.length === 0) {
      throw new Error("Contact not found");
    }

    return result[0] ?? null;
  });

/**
 * Delete a contact
 */
export const deleteContact = createServerFn({ method: "POST" })
  .inputValidator(contactParamsSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.customer.update });

    const { id } = data;

    const result = await db
      .delete(contacts)
      .where(
        and(
          eq(contacts.id, id),
          eq(contacts.organizationId, ctx.organizationId)
        )
      )
      .returning();

    if (result.length === 0) {
      throw new Error("Contact not found");
    }

    return { success: true, id: result[0].id };
  });

// ============================================================================
// ADDRESSES
// ============================================================================

/**
 * Get addresses for a customer
 */
export const getCustomerAddresses = createServerFn({ method: "GET" })
  .inputValidator(customerParamsSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.customer.read });

    const { id: customerId } = data;

    const results = await db
      .select()
      .from(addresses)
      .where(
        and(
          eq(addresses.customerId, customerId),
          eq(addresses.organizationId, ctx.organizationId)
        )
      )
      .orderBy(desc(addresses.isPrimary), asc(addresses.type));

    return results;
  });

/**
 * Create an address
 */
export const createAddress = createServerFn({ method: "POST" })
  .inputValidator(createAddressSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.customer.update });

    const result = await db
      .insert(addresses)
      .values({
        ...data,
        organizationId: ctx.organizationId,
      })
      .returning();

    return result[0] ?? null;
  });

/**
 * Update an address
 */
export const updateAddress = createServerFn({ method: "POST" })
  .inputValidator(addressParamsSchema.merge(updateAddressSchema))
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.customer.update });

    const { id, ...updateData } = data;

    const result = await db
      .update(addresses)
      .set(updateData)
      .where(
        and(
          eq(addresses.id, id),
          eq(addresses.organizationId, ctx.organizationId)
        )
      )
      .returning();

    if (result.length === 0) {
      throw new Error("Address not found");
    }

    return result[0] ?? null;
  });

/**
 * Delete an address
 */
export const deleteAddress = createServerFn({ method: "POST" })
  .inputValidator(addressParamsSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.customer.update });

    const { id } = data;

    const result = await db
      .delete(addresses)
      .where(
        and(
          eq(addresses.id, id),
          eq(addresses.organizationId, ctx.organizationId)
        )
      )
      .returning();

    if (result.length === 0) {
      throw new Error("Address not found");
    }

    return { success: true, id: result[0].id };
  });

// ============================================================================
// CUSTOMER ACTIVITIES
// ============================================================================

/**
 * Get activities for a customer (timeline)
 * Includes user attribution for proper display in unified timeline
 */
export const getCustomerActivities = createServerFn({ method: "GET" })
  .inputValidator(customerActivityFilterSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.customer.read });

    const { customerId, contactId, activityType, direction, assignedTo, startDate, endDate } = data;

    const conditions = [
      eq(customerActivities.organizationId, ctx.organizationId),
    ];

    if (customerId) {
      conditions.push(eq(customerActivities.customerId, customerId));
    }
    if (contactId) {
      conditions.push(eq(customerActivities.contactId, contactId));
    }
    if (activityType) {
      conditions.push(eq(customerActivities.activityType, activityType));
    }
    if (direction) {
      conditions.push(eq(customerActivities.direction, direction));
    }
    if (assignedTo) {
      conditions.push(eq(customerActivities.assignedTo, assignedTo));
    }
    if (startDate) {
      conditions.push(gte(customerActivities.createdAt, startDate));
    }
    if (endDate) {
      conditions.push(lte(customerActivities.createdAt, endDate));
    }

    // Query with user join for attribution
    const results = await db
      .select({
        activity: customerActivities,
        user: {
          id: users.id,
          name: users.name,
          email: users.email,
        },
      })
      .from(customerActivities)
      .leftJoin(users, eq(customerActivities.createdBy, users.id))
      .where(and(...conditions))
      .orderBy(desc(customerActivities.createdAt))
      .limit(100);

    // Transform results to include user data
    return results.map((r) => ({
      ...r.activity,
      user: r.user?.id ? r.user : null,
    }));
  });

/**
 * Create an activity
 */
export const createCustomerActivity = createServerFn({ method: "POST" })
  .inputValidator(createCustomerActivitySchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.customer.update });

    const result = await db
      .insert(customerActivities)
      .values({
        ...data,
        organizationId: ctx.organizationId,
        createdBy: ctx.user.id,
      })
      .returning();

    return result[0] ?? null;
  });

// ============================================================================
// CUSTOMER TAGS
// ============================================================================

/**
 * Get all tags for the organization
 */
export const getCustomerTags = createServerFn({ method: "GET" })
  .handler(async () => {
    const ctx = await withAuth({ permission: PERMISSIONS.customer.read });

    const results = await db
      .select()
      .from(customerTags)
      .where(eq(customerTags.organizationId, ctx.organizationId))
      .orderBy(desc(customerTags.usageCount), asc(customerTags.name));

    return results;
  });

/**
 * Create a tag
 */
export const createCustomerTag = createServerFn({ method: "POST" })
  .inputValidator(createCustomerTagSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.customer.update });

    const result = await db
      .insert(customerTags)
      .values({
        ...data,
        organizationId: ctx.organizationId,
        createdBy: ctx.user.id,
      })
      .returning();

    return result[0] ?? null;
  });

/**
 * Update a tag
 */
export const updateCustomerTag = createServerFn({ method: "POST" })
  .inputValidator(customerTagParamsSchema.merge(updateCustomerTagSchema))
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.customer.update });

    const { id, ...updateData } = data;

    const result = await db
      .update(customerTags)
      .set(updateData)
      .where(
        and(
          eq(customerTags.id, id),
          eq(customerTags.organizationId, ctx.organizationId)
        )
      )
      .returning();

    if (result.length === 0) {
      throw new Error("Tag not found");
    }

    return result[0] ?? null;
  });

/**
 * Delete a tag
 */
export const deleteCustomerTag = createServerFn({ method: "POST" })
  .inputValidator(customerTagParamsSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.customer.update });

    const { id } = data;

    const result = await db
      .delete(customerTags)
      .where(
        and(
          eq(customerTags.id, id),
          eq(customerTags.organizationId, ctx.organizationId)
        )
      )
      .returning();

    if (result.length === 0) {
      throw new Error("Tag not found");
    }

    return { success: true, id: result[0].id };
  });

/**
 * Assign a tag to a customer
 */
export const assignCustomerTag = createServerFn({ method: "POST" })
  .inputValidator(assignCustomerTagSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.customer.update });

    const { customerId, tagId, notes } = data;

    // Check if assignment already exists
    const existing = await db
      .select()
      .from(customerTagAssignments)
      .where(
        and(
          eq(customerTagAssignments.customerId, customerId),
          eq(customerTagAssignments.tagId, tagId)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      throw new Error("Tag already assigned to this customer");
    }

    const result = await db
      .insert(customerTagAssignments)
      .values({
        customerId,
        tagId,
        notes,
        organizationId: ctx.organizationId,
        assignedBy: ctx.user.id,
      })
      .returning();

    // Increment usage count
    await db
      .update(customerTags)
      .set({
        usageCount: sql`${customerTags.usageCount} + 1`,
      })
      .where(eq(customerTags.id, tagId));

    return result[0] ?? null;
  });

/**
 * Unassign a tag from a customer
 */
export const unassignCustomerTag = createServerFn({ method: "POST" })
  .inputValidator(unassignCustomerTagSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.customer.update });

    const { customerId, tagId } = data;

    const result = await db
      .delete(customerTagAssignments)
      .where(
        and(
          eq(customerTagAssignments.customerId, customerId),
          eq(customerTagAssignments.tagId, tagId),
          eq(customerTagAssignments.organizationId, ctx.organizationId)
        )
      )
      .returning();

    if (result.length === 0) {
      throw new Error("Tag assignment not found");
    }

    // Decrement usage count
    await db
      .update(customerTags)
      .set({
        usageCount: sql`GREATEST(${customerTags.usageCount} - 1, 0)`,
      })
      .where(eq(customerTags.id, tagId));

    return { success: true };
  });

// ============================================================================
// CUSTOMER HEALTH
// ============================================================================

/**
 * Get health metrics history for a customer
 */
export const getCustomerHealthMetrics = createServerFn({ method: "GET" })
  .inputValidator(customerHealthMetricFilterSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.customer.read });

    const { customerId, startDate, endDate } = data;

    const conditions = [
      eq(customerHealthMetrics.customerId, customerId),
      eq(customerHealthMetrics.organizationId, ctx.organizationId),
    ];

    if (startDate) {
      conditions.push(gte(customerHealthMetrics.metricDate, startDate));
    }
    if (endDate) {
      conditions.push(lte(customerHealthMetrics.metricDate, endDate));
    }

    const results = await db
      .select()
      .from(customerHealthMetrics)
      .where(and(...conditions))
      .orderBy(desc(customerHealthMetrics.metricDate))
      .limit(365);

    return results;
  });

/**
 * Record health metrics for a customer
 */
export const createCustomerHealthMetric = createServerFn({ method: "POST" })
  .inputValidator(createCustomerHealthMetricSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.customer.update });

    const result = await db
      .insert(customerHealthMetrics)
      .values({
        ...data,
        organizationId: ctx.organizationId,
      })
      .onConflictDoUpdate({
        target: [customerHealthMetrics.customerId, customerHealthMetrics.metricDate],
        set: {
          recencyScore: data.recencyScore,
          frequencyScore: data.frequencyScore,
          monetaryScore: data.monetaryScore,
          engagementScore: data.engagementScore,
          overallScore: data.overallScore,
        },
      })
      .returning();

    // Update customer's current health score
    if (data.overallScore !== undefined) {
      await db
        .update(customers)
        .set({
          healthScore: Math.round(data.overallScore),
          healthScoreUpdatedAt: new Date().toISOString(),
        })
        .where(eq(customers.id, data.customerId));
    }

    return result[0] ?? null;
  });

// ============================================================================
// CUSTOMER PRIORITY
// ============================================================================

/**
 * Get or create customer priority settings
 */
export const getCustomerPriority = createServerFn({ method: "GET" })
  .inputValidator(customerParamsSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.customer.read });

    const { id: customerId } = data;

    const result = await db
      .select()
      .from(customerPriorities)
      .where(
        and(
          eq(customerPriorities.customerId, customerId),
          eq(customerPriorities.organizationId, ctx.organizationId)
        )
      )
      .limit(1);

    return result[0] || null;
  });

/**
 * Set customer priority settings
 */
export const setCustomerPriority = createServerFn({ method: "POST" })
  .inputValidator(createCustomerPrioritySchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.customer.update });

    const result = await db
      .insert(customerPriorities)
      .values({
        ...data,
        organizationId: ctx.organizationId,
      })
      .onConflictDoUpdate({
        target: customerPriorities.customerId,
        set: {
          priorityLevel: data.priorityLevel,
          accountManager: data.accountManager,
          serviceLevel: data.serviceLevel,
          contractValue: data.contractValue,
          contractStartDate: data.contractStartDate,
          contractEndDate: data.contractEndDate,
          specialTerms: data.specialTerms,
        },
      })
      .returning();

    return result[0] ?? null;
  });

/**
 * Update customer priority settings
 */
export const updateCustomerPriority = createServerFn({ method: "POST" })
  .inputValidator(customerParamsSchema.merge(updateCustomerPrioritySchema))
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.customer.update });

    const { id: customerId, ...updateData } = data;

    const result = await db
      .update(customerPriorities)
      .set(updateData)
      .where(
        and(
          eq(customerPriorities.customerId, customerId),
          eq(customerPriorities.organizationId, ctx.organizationId)
        )
      )
      .returning();

    if (result.length === 0) {
      throw new Error("Customer priority settings not found");
    }

    return result[0] ?? null;
  });

// ============================================================================
// BULK OPERATIONS
// ============================================================================

/**
 * Bulk update multiple customers
 */
export const bulkUpdateCustomers = createServerFn({ method: "POST" })
  .inputValidator(bulkUpdateCustomersSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.customer.update });

    const { customerIds, updates } = data;

    const result = await db
      .update(customers)
      .set({
        ...updates,
        updatedBy: ctx.user.id,
      })
      .where(
        and(
          inArray(customers.id, customerIds),
          eq(customers.organizationId, ctx.organizationId),
          sql`${customers.deletedAt} IS NULL`
        )
      )
      .returning();

    return { success: true, updated: result.length };
  });

/**
 * Bulk soft delete multiple customers
 */
export const bulkDeleteCustomers = createServerFn({ method: "POST" })
  .inputValidator(bulkDeleteCustomersSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.customer.delete });

    const { customerIds } = data;

    const result = await db
      .update(customers)
      .set({
        deletedAt: new Date(),
        updatedBy: ctx.user.id,
      })
      .where(
        and(
          inArray(customers.id, customerIds),
          eq(customers.organizationId, ctx.organizationId),
          sql`${customers.deletedAt} IS NULL`
        )
      )
      .returning();

    return { success: true, deleted: result.length };
  });

/**
 * Bulk assign tags to multiple customers
 */
export const bulkAssignTags = createServerFn({ method: "POST" })
  .inputValidator(bulkAssignTagsSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.customer.update });

    const { customerIds, tagIds } = data;

    // Create all assignments
    const assignments = customerIds.flatMap((customerId) =>
      tagIds.map((tagId) => ({
        customerId,
        tagId,
        organizationId: ctx.organizationId,
        assignedBy: ctx.user.id,
      }))
    );

    // Insert with conflict handling (skip existing)
    const result = await db
      .insert(customerTagAssignments)
      .values(assignments)
      .onConflictDoNothing()
      .returning();

    // Update usage counts
    if (result.length > 0) {
      const tagCounts = result.reduce((acc, assignment) => {
        acc[assignment.tagId] = (acc[assignment.tagId] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      for (const [tagId, count] of Object.entries(tagCounts)) {
        await db
          .update(customerTags)
          .set({
            usageCount: sql`${customerTags.usageCount} + ${count}`,
          })
          .where(eq(customerTags.id, tagId));
      }
    }

    return { success: true, assigned: result.length };
  });

// ============================================================================
// MERGE OPERATIONS
// ============================================================================

/**
 * Merge duplicate customers into a primary customer
 *
 * This operation:
 * 1. Moves all contacts, addresses, activities from duplicates to primary
 * 2. Moves all tag assignments from duplicates to primary
 * 3. Optionally merges field values based on fieldResolutions
 * 4. Soft-deletes the duplicate customers
 */
export const mergeCustomers = createServerFn({ method: "POST" })
  .inputValidator(mergeCustomersSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.customer.delete });

    const { primaryCustomerId, duplicateCustomerIds, fieldResolutions } = data;

    // Verify all customers exist and belong to org
    const allCustomerIds = [primaryCustomerId, ...duplicateCustomerIds];
    const existingCustomers = await db
      .select()
      .from(customers)
      .where(
        and(
          inArray(customers.id, allCustomerIds),
          eq(customers.organizationId, ctx.organizationId),
          sql`${customers.deletedAt} IS NULL`
        )
      );

    if (existingCustomers.length !== allCustomerIds.length) {
      throw new Error("One or more customers not found");
    }

    const primary = existingCustomers.find((c) => c.id === primaryCustomerId);
    if (!primary) {
      throw new Error("Primary customer not found");
    }

    // Move contacts to primary customer
    await db
      .update(contacts)
      .set({ customerId: primaryCustomerId })
      .where(inArray(contacts.customerId, duplicateCustomerIds));

    // Move addresses to primary customer
    await db
      .update(addresses)
      .set({ customerId: primaryCustomerId })
      .where(inArray(addresses.customerId, duplicateCustomerIds));

    // Move activities to primary customer
    await db
      .update(customerActivities)
      .set({ customerId: primaryCustomerId })
      .where(inArray(customerActivities.customerId, duplicateCustomerIds));

    // Move tag assignments (with conflict handling)
    const duplicateAssignments = await db
      .select()
      .from(customerTagAssignments)
      .where(inArray(customerTagAssignments.customerId, duplicateCustomerIds));

    for (const assignment of duplicateAssignments) {
      await db
        .insert(customerTagAssignments)
        .values({
          customerId: primaryCustomerId,
          tagId: assignment.tagId,
          organizationId: ctx.organizationId,
          assignedBy: ctx.user.id,
          notes: assignment.notes,
        })
        .onConflictDoNothing();
    }

    // Delete old assignments
    await db
      .delete(customerTagAssignments)
      .where(inArray(customerTagAssignments.customerId, duplicateCustomerIds));

    // Move health metrics to primary
    await db
      .update(customerHealthMetrics)
      .set({ customerId: primaryCustomerId })
      .where(inArray(customerHealthMetrics.customerId, duplicateCustomerIds));

    // Move priority settings (keep primary's if exists)
    const primaryHasPriority = await db
      .select()
      .from(customerPriorities)
      .where(eq(customerPriorities.customerId, primaryCustomerId))
      .limit(1);

    if (primaryHasPriority.length === 0) {
      // Move first duplicate's priority to primary
      const duplicatePriority = await db
        .select()
        .from(customerPriorities)
        .where(inArray(customerPriorities.customerId, duplicateCustomerIds))
        .limit(1);

      if (duplicatePriority.length > 0) {
        await db
          .update(customerPriorities)
          .set({ customerId: primaryCustomerId })
          .where(eq(customerPriorities.id, duplicatePriority[0].id));
      }
    }

    // Delete remaining duplicate priorities
    await db
      .delete(customerPriorities)
      .where(inArray(customerPriorities.customerId, duplicateCustomerIds));

    // Apply field resolutions if provided (merge specific fields)
    if (fieldResolutions) {
      const duplicates = existingCustomers.filter((c) =>
        duplicateCustomerIds.includes(c.id)
      );
      const updates: Partial<typeof primary> = {};

      for (const [field, resolution] of Object.entries(fieldResolutions)) {
        if (resolution === "duplicate" && duplicates.length > 0) {
          // Use first duplicate's value
          const duplicateValue = duplicates[0][field as keyof typeof primary];
          if (duplicateValue !== undefined) {
            (updates as Record<string, unknown>)[field] = duplicateValue;
          }
        } else if (resolution === "merge") {
          // Merge arrays (for tags) or concatenate strings
          const primaryValue = primary[field as keyof typeof primary];
          const duplicateValues = duplicates
            .map((d) => d[field as keyof typeof primary])
            .filter(Boolean);

          if (Array.isArray(primaryValue)) {
            const merged = [...new Set([...primaryValue, ...duplicateValues.flat()])];
            (updates as Record<string, unknown>)[field] = merged;
          }
        }
        // "primary" resolution keeps primary value (no action needed)
      }

      if (Object.keys(updates).length > 0) {
        await db
          .update(customers)
          .set({ ...updates, updatedBy: ctx.user.id })
          .where(eq(customers.id, primaryCustomerId));
      }
    }

    // Soft-delete duplicate customers
    await db
      .update(customers)
      .set({
        deletedAt: new Date(),
        updatedBy: ctx.user.id,
      })
      .where(inArray(customers.id, duplicateCustomerIds));

    return {
      success: true,
      primaryCustomerId,
      mergedCount: duplicateCustomerIds.length,
    };
  });

// Re-export from functions module for hooks that expect all customer ops in one place
export { bulkUpdateHealthScores } from './functions/customers';
