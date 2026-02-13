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

import { createServerFn } from '@tanstack/react-start';
import { setResponseStatus } from '@tanstack/react-start/server';
import { cache } from 'react';
import { eq, and, ilike, desc, asc, sql, inArray, gte, lte, isNull, count, sum, max, min, avg, notInArray } from 'drizzle-orm';
import { db } from '@/lib/db';
import { containsPattern } from '@/lib/db/utils';
import { enqueueSearchIndexOutbox } from '@/server/functions/_shared/search-index-outbox';
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
} from 'drizzle/schema';
import { auditLogs } from 'drizzle/schema/_shared/audit-logs';
import { createActivityLoggerWithContext } from '@/server/middleware/activity-context';
import { customersLogger } from '@/lib/logger';
import { computeChanges } from '@/lib/activity-logger';
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
  bulkUpdateHealthScoresSchema,
  mergeCustomersSchema,
} from '@/lib/schemas/customers';
import {
  decodeCursor,
  buildCursorCondition,
  buildStandardCursorResponse,
} from '@/lib/db/pagination';
import { withAuth } from '@/lib/server/protected';
import { PERMISSIONS } from '@/lib/auth/permissions';
import { NotFoundError, ValidationError, ConflictError, ServerError } from '@/lib/server/errors';

// ============================================================================
// ACTIVITY LOGGING HELPERS
// ============================================================================

/**
 * Fields to exclude from activity change tracking (system-managed)
 */
const CUSTOMER_EXCLUDED_FIELDS: string[] = ['updatedAt', 'updatedBy', 'createdAt', 'createdBy', 'deletedAt'];

// ============================================================================
// CUSTOMER CRUD
// ============================================================================

/**
 * Get customers with offset pagination (legacy, for backwards compatibility)
 */
export const getCustomers = createServerFn({ method: 'GET' })
  .inputValidator(customerListQuerySchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.customer.read });

    const {
      page,
      pageSize,
      sortBy,
      sortOrder,
      search,
      status,
      type,
      size,
      industry,
      healthScoreMin,
      healthScoreMax,
    } = data;

    // Build where conditions - ALWAYS include organizationId for isolation
    const conditions = [
      eq(customers.organizationId, ctx.organizationId),
      isNull(customers.deletedAt),
    ];

    if (search) {
      conditions.push(ilike(customers.name, containsPattern(search)));
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

    // Pagination setup
    const offset = (page - 1) * pageSize;
    const orderColumn = sortBy === 'name' ? customers.name : customers.createdAt;
    const orderDirection = sortOrder === 'asc' ? asc : desc;

    // Build order aggregation conditions
    const validOrderCondition = and(
      eq(orders.organizationId, ctx.organizationId),
      isNull(orders.deletedAt),
      notInArray(orders.status, ['draft', 'cancelled'])
    );

    // Run count and paginated results in parallel to eliminate waterfall
    const [countResult, items] = await Promise.all([
      db
        .select({ count: count() })
        .from(customers)
        .where(whereClause),
      db
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
          // Pattern matches financial-dashboard.ts getTopCustomersByRevenue
          // Use Drizzle aggregation functions - handle nulls in JS
          lifetimeValue: sum(orders.total),
          totalOrderValue: sum(orders.total),
          averageOrderValue: avg(orders.total),
          totalOrders: count(orders.id),
          firstOrderDate: min(orders.orderDate),
          lastOrderDate: max(orders.orderDate),
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
        .orderBy(orderDirection(orderColumn))
        .limit(pageSize)
        .offset(offset),
    ]);

    const totalItems = Number(countResult[0]?.count ?? 0);

    // Transform aggregation results: Drizzle functions return null when no rows match
    // Convert to 0 to match previous COALESCE behavior
    const transformedItems = items.map((item) => ({
      ...item,
      lifetimeValue: Number(item.lifetimeValue ?? 0),
      totalOrderValue: Number(item.totalOrderValue ?? 0),
      averageOrderValue: Number(item.averageOrderValue ?? 0),
      totalOrders: Number(item.totalOrders ?? 0),
      // Dates can remain null
    }));

    return {
      items: transformedItems,
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
export const getCustomersCursor = createServerFn({ method: 'GET' })
  .inputValidator(customerCursorQuerySchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.customer.read });

    const {
      cursor,
      pageSize,
      sortOrder,
      search,
      status,
      type,
      size,
      industry,
      healthScoreMin,
      healthScoreMax,
    } = data;

    // Build where conditions
    const conditions = [
      eq(customers.organizationId, ctx.organizationId),
      isNull(customers.deletedAt),
    ];

    if (search) {
      conditions.push(ilike(customers.name, containsPattern(search)));
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
          buildCursorCondition(customers.createdAt, customers.id, cursorPosition, sortOrder)
        );
      }
    }

    // Build order aggregation conditions (same as getCustomers for consistency)
    // Only count valid orders (not draft/cancelled) for lifetime metrics
    const validOrderCondition = and(
      eq(orders.organizationId, ctx.organizationId),
      isNull(orders.deletedAt),
      notInArray(orders.status, ['draft', 'cancelled'])
    );

    const whereClause = and(...conditions);
    const orderDirection = sortOrder === 'asc' ? asc : desc;

    // Select only needed columns for list view (matches CustomerTableData interface)
    // ✅ FIXED P0: Compute lifetime metrics on-the-fly using LEFT JOIN + GROUP BY
    // This ensures consistency with getCustomers offset pagination
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
        healthScore: customers.healthScore,
        healthScoreUpdatedAt: customers.healthScoreUpdatedAt,
        // Compute metrics on-the-fly from orders (consistent with getCustomers)
        // Use Drizzle aggregation functions - handle nulls in JS
        lifetimeValue: sum(orders.total),
        totalOrders: count(orders.id),
        lastOrderDate: max(orders.orderDate),
        tags: customers.tags,
        createdAt: customers.createdAt,
        updatedAt: customers.updatedAt,
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
        customers.healthScore,
        customers.healthScoreUpdatedAt,
        customers.tags,
        customers.createdAt,
        customers.updatedAt,
        customers.deletedAt
      )
      .orderBy(orderDirection(customers.createdAt), orderDirection(customers.id))
      .limit(pageSize + 1);

    // Transform aggregation results: Drizzle functions return null when no rows match
    // Convert to 0 to match previous COALESCE behavior
    const transformedResults = results.map((item) => ({
      ...item,
      lifetimeValue: Number(item.lifetimeValue ?? 0),
      totalOrders: Number(item.totalOrders ?? 0),
      // lastOrderDate can remain null
    }));

    return buildStandardCursorResponse(transformedResults, pageSize);
  });

/**
 * Cached customer fetch for per-request deduplication.
 * Use when same customer may be fetched multiple times in one request.
 */
const _getCustomerByIdCached = cache(
  async (id: string, organizationId: string) =>
    db.query.customers.findFirst({
      where: and(
        eq(customers.id, id),
        eq(customers.organizationId, organizationId),
        isNull(customers.deletedAt)
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
    })
);

/**
 * Get single customer with 360-degree view (contacts, addresses, activities)
 */
export const getCustomerById = createServerFn({ method: 'GET' })
  .inputValidator(customerParamsSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.customer.read });

    const customer = await _getCustomerByIdCached(data.id, ctx.organizationId);

    if (!customer) {
      setResponseStatus(404);
      throw new NotFoundError('Customer not found', 'customer');
    }

    return customer;
  });

/**
 * Create a new customer
 */
export const createCustomer = createServerFn({ method: 'POST' })
  .inputValidator(createCustomerSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.customer.create });
    const logger = createActivityLoggerWithContext(ctx);

    try {
      const created = await db.transaction(async (tx) => {
        const [newCustomer] = await tx
          .insert(customers)
          .values({
            ...data,
            organizationId: ctx.organizationId,
            createdBy: ctx.user.id,
            updatedBy: ctx.user.id,
          })
          .returning();

        await enqueueSearchIndexOutbox(
        {
          organizationId: ctx.organizationId,
          entityType: 'customer',
          entityId: newCustomer.id,
          action: 'upsert',
          payload: {
            title: newCustomer.name,
            subtitle: newCustomer.email ?? undefined,
            description: newCustomer.phone ?? undefined,
          },
        },
        tx
      );

      // Log customer creation (fire-and-forget after transaction)
      logger.logAsync({
        entityType: 'customer',
        entityId: newCustomer.id,
        action: 'created',
        changes: computeChanges({
          before: null,
          after: newCustomer,
          excludeFields: CUSTOMER_EXCLUDED_FIELDS as never[],
        }),
        description: `Created customer: ${newCustomer.name}`,
      });

        return newCustomer;
      });

      return created;
    } catch (error: unknown) {
      const pgError = error as { code?: string };
      if (pgError?.code === '23505') {
        setResponseStatus(409);
        throw new ConflictError('A customer with this email or identifier already exists');
      }
      if (error instanceof ValidationError) throw error;
      customersLogger.error('createCustomer DB error', error);
      setResponseStatus(500);
      throw new ServerError('Failed to create customer', 500, 'INTERNAL_ERROR');
    }
  });

/**
 * Update an existing customer
 */
export const updateCustomer = createServerFn({ method: 'POST' })
  .inputValidator(customerParamsSchema.merge(updateCustomerSchema))
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.customer.update });
    const logger = createActivityLoggerWithContext(ctx);

    const { id, ...updateData } = data;

    // Fetch before state for change tracking
    const before = await db.query.customers.findFirst({
      where: and(
        eq(customers.id, id),
        eq(customers.organizationId, ctx.organizationId),
        isNull(customers.deletedAt)
      ),
    });

    if (!before) {
      throw new NotFoundError('Customer not found', 'customer');
    }

    const updated = await db.transaction(async (tx) => {
      const result = await tx
        .update(customers)
        .set({
          ...updateData,
          updatedBy: ctx.user.id,
        })
        .where(
          and(
            eq(customers.id, id),
            eq(customers.organizationId, ctx.organizationId),
            isNull(customers.deletedAt)
          )
        )
        .returning();

      if (result.length === 0) {
        throw new NotFoundError('Customer not found', 'customer');
      }

      await enqueueSearchIndexOutbox(
        {
          organizationId: ctx.organizationId,
          entityType: 'customer',
          entityId: result[0].id,
          action: 'upsert',
          payload: {
            title: result[0].name,
            subtitle: result[0].email ?? undefined,
            description: result[0].phone ?? undefined,
          },
        },
        tx
      );

      return result[0] ?? null;
    });

    // Log customer update (fire-and-forget after transaction)
    const changes = computeChanges({
      before,
      after: updated,
      excludeFields: CUSTOMER_EXCLUDED_FIELDS as never[],
    });

    // Only log if there are actual changes
    if (changes.fields && changes.fields.length > 0) {
      logger.logAsync({
        entityType: 'customer',
        entityId: updated.id,
        action: 'updated',
        changes,
        description: `Updated customer: ${updated.name}`,
      });
    }

    return updated;
  });

/**
 * Soft delete a customer
 */
export const deleteCustomer = createServerFn({ method: 'POST' })
  .inputValidator(customerParamsSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.customer.delete });
    const logger = createActivityLoggerWithContext(ctx);

    const { id } = data;

    // Fetch customer before deletion for activity log
    const customerToDelete = await db.query.customers.findFirst({
      where: and(
        eq(customers.id, id),
        eq(customers.organizationId, ctx.organizationId),
        isNull(customers.deletedAt)
      ),
    });

    if (!customerToDelete) {
      throw new NotFoundError('Customer not found', 'customer');
    }

    // Wrap child count check + soft delete in a transaction to prevent TOCTOU race
    const deleted = await db.transaction(async (tx) => {
      // Business rule - prevent deleting customer with children (checked inside tx)
      const childrenCount = await tx
        .select({ count: count() })
        .from(customers)
        .where(
          and(
            eq(customers.parentId, id),
            eq(customers.organizationId, ctx.organizationId),
            isNull(customers.deletedAt)
          )
        );

      if (childrenCount[0]?.count > 0) {
        throw new ConflictError(
          `Cannot delete customer "${customerToDelete.name}" because it has ${childrenCount[0].count} child customer(s). Please reassign or delete children first.`
        );
      }

      const result = await tx
        .update(customers)
        .set({
          deletedAt: new Date(),
          updatedBy: ctx.user.id,
        })
        .where(
          and(
            eq(customers.id, id),
            eq(customers.organizationId, ctx.organizationId),
            isNull(customers.deletedAt)
          )
        )
        .returning();

      if (result.length === 0) {
        throw new NotFoundError('Customer not found', 'customer');
      }

      await enqueueSearchIndexOutbox(
        {
          organizationId: ctx.organizationId,
          entityType: 'customer',
          entityId: result[0].id,
          action: 'delete',
        },
        tx
      );

      return { success: true, id: result[0].id };
    });

    // Log customer deletion (fire-and-forget after transaction)
    logger.logAsync({
      entityType: 'customer',
      entityId: id,
      action: 'deleted',
      changes: computeChanges({
        before: customerToDelete,
        after: null,
        excludeFields: CUSTOMER_EXCLUDED_FIELDS as never[],
      }),
      description: `Deleted customer: ${customerToDelete.name}`,
    });

    return deleted;
  });

// ============================================================================
// CONTACTS
// ============================================================================

/**
 * Get contacts for a customer
 */
export const getCustomerContacts = createServerFn({ method: 'GET' })
  .inputValidator(customerParamsSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.customer.read });

    const { id: customerId } = data;

    const results = await db
      .select()
      .from(contacts)
      .where(
        and(eq(contacts.customerId, customerId), eq(contacts.organizationId, ctx.organizationId))
      )
      .orderBy(desc(contacts.isPrimary), asc(contacts.lastName));

    return results;
  });

/**
 * Create a contact
 */
export const createContact = createServerFn({ method: 'POST' })
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
export const updateContact = createServerFn({ method: 'POST' })
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
      .where(and(eq(contacts.id, id), eq(contacts.organizationId, ctx.organizationId)))
      .returning();

    if (result.length === 0) {
      throw new NotFoundError('Contact not found', 'contact');
    }

    return result[0] ?? null;
  });

/**
 * Delete a contact
 */
export const deleteContact = createServerFn({ method: 'POST' })
  .inputValidator(contactParamsSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.customer.update });

    const { id } = data;

    const result = await db
      .delete(contacts)
      .where(and(eq(contacts.id, id), eq(contacts.organizationId, ctx.organizationId)))
      .returning();

    if (result.length === 0) {
      throw new NotFoundError('Contact not found', 'contact');
    }

    return { success: true, id: result[0].id };
  });

// ============================================================================
// ADDRESSES
// ============================================================================

/**
 * Get addresses for a customer
 */
export const getCustomerAddresses = createServerFn({ method: 'GET' })
  .inputValidator(customerParamsSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.customer.read });

    const { id: customerId } = data;

    const results = await db
      .select()
      .from(addresses)
      .where(
        and(eq(addresses.customerId, customerId), eq(addresses.organizationId, ctx.organizationId))
      )
      .orderBy(desc(addresses.isPrimary), asc(addresses.type));

    return results;
  });

/**
 * Create an address
 */
export const createAddress = createServerFn({ method: 'POST' })
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
export const updateAddress = createServerFn({ method: 'POST' })
  .inputValidator(addressParamsSchema.merge(updateAddressSchema))
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.customer.update });

    const { id, ...updateData } = data;

    const result = await db
      .update(addresses)
      .set(updateData)
      .where(and(eq(addresses.id, id), eq(addresses.organizationId, ctx.organizationId)))
      .returning();

    if (result.length === 0) {
      throw new NotFoundError('Address not found', 'address');
    }

    return result[0] ?? null;
  });

/**
 * Delete an address
 */
export const deleteAddress = createServerFn({ method: 'POST' })
  .inputValidator(addressParamsSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.customer.update });

    const { id } = data;

    const result = await db
      .delete(addresses)
      .where(and(eq(addresses.id, id), eq(addresses.organizationId, ctx.organizationId)))
      .returning();

    if (result.length === 0) {
      throw new NotFoundError('Address not found', 'address');
    }

    return { success: true, id: result[0].id };
  });

// ============================================================================
// CUSTOMER ACTIVITIES
// ============================================================================

/**
 * Get activities for a customer (timeline)
 */
export const getCustomerActivities = createServerFn({ method: 'GET' })
  .inputValidator(customerActivityFilterSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.customer.read });

    const { customerId, contactId, activityType, direction, assignedTo, startDate, endDate } = data;

    const conditions = [eq(customerActivities.organizationId, ctx.organizationId)];

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

    // Select only needed columns for activity list view
    const results = await db
      .select({
        id: customerActivities.id,
        organizationId: customerActivities.organizationId,
        customerId: customerActivities.customerId,
        contactId: customerActivities.contactId,
        activityType: customerActivities.activityType,
        direction: customerActivities.direction,
        subject: customerActivities.subject,
        description: customerActivities.description,
        outcome: customerActivities.outcome,
        duration: customerActivities.duration,
        scheduledAt: customerActivities.scheduledAt,
        completedAt: customerActivities.completedAt,
        assignedTo: customerActivities.assignedTo,
        metadata: customerActivities.metadata,
        createdAt: customerActivities.createdAt,
        createdBy: customerActivities.createdBy,
      })
      .from(customerActivities)
      .where(and(...conditions))
      .orderBy(desc(customerActivities.createdAt))
      .limit(100);

    return results;
  });

/**
 * Create an activity
 */
export const createCustomerActivity = createServerFn({ method: 'POST' })
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
export const getCustomerTags = createServerFn({ method: 'GET' }).handler(async () => {
  const ctx = await withAuth({ permission: PERMISSIONS.customer.read });

  const results = await db
    .select()
    .from(customerTags)
    .where(eq(customerTags.organizationId, ctx.organizationId))
    .orderBy(desc(customerTags.usageCount), asc(customerTags.name))
    .limit(200);

  return results;
});

/**
 * Create a tag
 */
export const createCustomerTag = createServerFn({ method: 'POST' })
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
export const updateCustomerTag = createServerFn({ method: 'POST' })
  .inputValidator(customerTagParamsSchema.merge(updateCustomerTagSchema))
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.customer.update });

    const { id, ...updateData } = data;

    const result = await db
      .update(customerTags)
      .set(updateData)
      .where(and(eq(customerTags.id, id), eq(customerTags.organizationId, ctx.organizationId)))
      .returning();

    if (result.length === 0) {
      throw new NotFoundError('Tag not found', 'customerTag');
    }

    return result[0] ?? null;
  });

/**
 * Delete a tag
 */
export const deleteCustomerTag = createServerFn({ method: 'POST' })
  .inputValidator(customerTagParamsSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.customer.update });

    const { id } = data;

    const result = await db
      .delete(customerTags)
      .where(and(eq(customerTags.id, id), eq(customerTags.organizationId, ctx.organizationId)))
      .returning();

    if (result.length === 0) {
      throw new NotFoundError('Tag not found', 'customerTag');
    }

    return { success: true, id: result[0].id };
  });

/**
 * Assign a tag to a customer
 * ✅ P2 FIX: Wrapped in transaction for atomicity (prevents race conditions)
 */
export const assignCustomerTag = createServerFn({ method: 'POST' })
  .inputValidator(assignCustomerTagSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.customer.update });

    const { customerId, tagId, notes } = data;

    // ✅ Wrap entire operation in transaction for atomicity
    return await db.transaction(async (tx) => {
      // Check if assignment already exists (include org filter for tenant isolation)
      const existing = await tx
        .select()
        .from(customerTagAssignments)
        .where(
          and(
            eq(customerTagAssignments.customerId, customerId),
            eq(customerTagAssignments.tagId, tagId),
            eq(customerTagAssignments.organizationId, ctx.organizationId)
          )
        )
        .limit(1);

      if (existing.length > 0) {
        throw new ConflictError('Tag already assigned to this customer');
      }

      // Insert assignment
      const [result] = await tx
        .insert(customerTagAssignments)
        .values({
          customerId,
          tagId,
          notes,
          organizationId: ctx.organizationId,
          assignedBy: ctx.user.id,
        })
        .returning();

      // Update usage count atomically
      // Note: Using SQL for arithmetic operations ensures atomicity at database level
      // Drizzle doesn't provide arithmetic operators, and this prevents race conditions
      // SECURITY: Filter by organizationId to prevent cross-tenant tag updates
      await tx
        .update(customerTags)
        .set({
          usageCount: sql`${customerTags.usageCount} + 1`,
        })
        .where(and(eq(customerTags.id, tagId), eq(customerTags.organizationId, ctx.organizationId)));

      return result;
    });
  });

/**
 * Unassign a tag from a customer
 * ✅ P2 FIX: Wrapped in transaction for atomicity (prevents race conditions)
 */
export const unassignCustomerTag = createServerFn({ method: 'POST' })
  .inputValidator(unassignCustomerTagSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.customer.update });

    const { customerId, tagId } = data;

    // ✅ Wrap entire operation in transaction for atomicity
    return await db.transaction(async (tx) => {
      const result = await tx
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
        throw new NotFoundError('Tag assignment not found', 'customerTagAssignment');
      }

      // Update usage count atomically
      // Note: Using SQL for arithmetic operations ensures atomicity at database level
      // GREATEST() prevents negative counts - Drizzle doesn't provide this function
      await tx
        .update(customerTags)
        .set({
          usageCount: sql`GREATEST(${customerTags.usageCount} - 1, 0)`,
        })
        .where(and(eq(customerTags.id, tagId), eq(customerTags.organizationId, ctx.organizationId)));

      return { success: true };
    });
  });

// ============================================================================
// CUSTOMER HEALTH
// ============================================================================

/**
 * Get health metrics history for a customer
 */
export const getCustomerHealthMetrics = createServerFn({ method: 'GET' })
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
export const createCustomerHealthMetric = createServerFn({ method: 'POST' })
  .inputValidator(createCustomerHealthMetricSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.customer.update });

    // C24: Wrap UPSERT + UPDATE customer in transaction for atomicity
    const result = await db.transaction(async (tx) => {
      const [metric] = await tx
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

      // Update customer's current health score (include org filter for tenant isolation)
      if (data.overallScore !== undefined) {
        await tx
          .update(customers)
          .set({
            healthScore: Math.round(data.overallScore),
            healthScoreUpdatedAt: new Date().toISOString(),
          })
          .where(
            and(
              eq(customers.id, data.customerId),
              eq(customers.organizationId, ctx.organizationId)
            )
          );
      }

      return metric;
    });

    return result;
  });

// ============================================================================
// CUSTOMER PRIORITY
// ============================================================================

/**
 * Get or create customer priority settings
 */
export const getCustomerPriority = createServerFn({ method: 'GET' })
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
export const setCustomerPriority = createServerFn({ method: 'POST' })
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
export const updateCustomerPriority = createServerFn({ method: 'POST' })
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
      throw new NotFoundError('Customer priority settings not found', 'customerPriority');
    }

    return result[0] ?? null;
  });

// ============================================================================
// BULK OPERATIONS
// ============================================================================

/**
 * Bulk update multiple customers
 */
export const bulkUpdateCustomers = createServerFn({ method: 'POST' })
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
          isNull(customers.deletedAt)
        )
      )
      .returning();

    return { success: true, updated: result.length };
  });

/**
 * Bulk soft delete multiple customers
 */
export const bulkDeleteCustomers = createServerFn({ method: 'POST' })
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
          isNull(customers.deletedAt)
        )
      )
      .returning();

    return { success: true, deleted: result.length };
  });

/**
 * Bulk assign tags to multiple customers
 */
export const bulkAssignTags = createServerFn({ method: 'POST' })
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
      const tagCounts = result.reduce(
        (acc, assignment) => {
          acc[assignment.tagId] = (acc[assignment.tagId] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      );

      if (Object.keys(tagCounts).length > 0) {
        const tagIds = Object.keys(tagCounts);
        // RAW SQL (Phase 11 Keep): Bulk CASE WHEN for tag usage_count. Drizzle cannot express. See PHASE11-RAW-SQL-AUDIT.md
        await db.execute(sql`
          UPDATE customer_tags
          SET usage_count = usage_count + CASE id
            ${sql.join(
              Object.entries(tagCounts).map(([tagId, count]) =>
                sql`WHEN ${tagId}::uuid THEN ${count}`
              ),
              sql` `
            )}
          END
          WHERE id = ANY(${tagIds}::uuid[])
        `);
      }
    }

    return { success: true, assigned: result.length };
  });

/**
 * Bulk update health scores for multiple customers
 * Includes audit logging for rollback capability
 */
export const bulkUpdateHealthScores = createServerFn({ method: 'POST' })
  .inputValidator(bulkUpdateHealthScoresSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.customer.update });

    const { customerIds, healthScore, reason } = data;
    const now = new Date().toISOString();

    // C25: Wrap SELECT + UPDATEs + INSERT audit in transaction for atomicity
    const txResult = await db.transaction(async (tx) => {
      // Fetch existing health scores for audit logging
      const existingCustomers = await tx
        .select({
          id: customers.id,
          healthScore: customers.healthScore,
          healthScoreUpdatedAt: customers.healthScoreUpdatedAt,
        })
        .from(customers)
        .where(
          and(
            inArray(customers.id, customerIds),
            eq(customers.organizationId, ctx.organizationId),
            isNull(customers.deletedAt)
          )
        );

      if (existingCustomers.length !== customerIds.length) {
        throw new NotFoundError('Some customers not found', 'customer');
      }

      // Build oldValues for audit log
      const oldValues = existingCustomers.reduce(
        (acc, customer) => {
          acc[customer.id] = {
            healthScore: customer.healthScore,
            healthScoreUpdatedAt: customer.healthScoreUpdatedAt,
          };
          return acc;
        },
        {} as Record<string, { healthScore: number | null; healthScoreUpdatedAt: string | null }>
      );

      // Update health scores
      const result = await tx
        .update(customers)
        .set({
          healthScore,
          healthScoreUpdatedAt: now,
          updatedBy: ctx.user.id,
        })
        .where(
          and(
            inArray(customers.id, customerIds),
            eq(customers.organizationId, ctx.organizationId),
            isNull(customers.deletedAt)
          )
        )
        .returning();

      // Audit log for rollback capability
      const [auditLog] = await tx
        .insert(auditLogs)
        .values({
          organizationId: ctx.organizationId,
          userId: ctx.user.id,
          action: 'customer.bulk_update_health_scores',
          entityType: 'customer',
          entityId: null, // Bulk operation, no single entity
          oldValues: oldValues,
          newValues: {
            healthScore,
            healthScoreUpdatedAt: now,
            reason: reason ?? null,
            customerIds,
            count: result.length,
          },
          metadata: {
            affectedCount: result.length,
            operationType: 'bulk_health_score_update',
            reason: reason ?? undefined,
          },
        })
        .returning();

      return {
        result,
        auditLog,
      };
    });

    return {
      success: true,
      updated: txResult.result.length,
      auditLogId: txResult.auditLog.id, // Return audit log ID for rollback
      results: txResult.result.map((r) => ({
        customerId: r.id,
        success: true,
      })),
      errors: [] as Array<{ customerId: string; error: string }>,
    };
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
export const mergeCustomers = createServerFn({ method: 'POST' })
  .inputValidator(mergeCustomersSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.customer.delete });
    const logger = createActivityLoggerWithContext(ctx);

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
          isNull(customers.deletedAt)
        )
      );

    if (existingCustomers.length !== allCustomerIds.length) {
      throw new NotFoundError('One or more customers not found', 'customer');
    }

    const primary = existingCustomers.find((c) => c.id === primaryCustomerId);
    if (!primary) {
      throw new NotFoundError('Primary customer not found', 'customer');
    }

    // Store primary customer before state for change tracking
    const primaryBefore = { ...primary };

    // Wrap entire merge operation in transaction for atomicity
    await db.transaction(async (tx) => {
      // Move contacts to primary customer (defense-in-depth: org filter)
      await tx
        .update(contacts)
        .set({ customerId: primaryCustomerId })
        .where(and(
          inArray(contacts.customerId, duplicateCustomerIds),
          eq(contacts.organizationId, ctx.organizationId)
        ));

      // Move addresses to primary customer (defense-in-depth: org filter)
      await tx
        .update(addresses)
        .set({ customerId: primaryCustomerId })
        .where(and(
          inArray(addresses.customerId, duplicateCustomerIds),
          eq(addresses.organizationId, ctx.organizationId)
        ));

      // Move activities to primary customer (defense-in-depth: org filter)
      await tx
        .update(customerActivities)
        .set({ customerId: primaryCustomerId })
        .where(and(
          inArray(customerActivities.customerId, duplicateCustomerIds),
          eq(customerActivities.organizationId, ctx.organizationId)
        ));

      // Move tag assignments (with conflict handling)
      const duplicateAssignments = await tx
        .select()
        .from(customerTagAssignments)
        .where(and(
          inArray(customerTagAssignments.customerId, duplicateCustomerIds),
          eq(customerTagAssignments.organizationId, ctx.organizationId)
        ));

      if (duplicateAssignments.length > 0) {
        await tx
          .insert(customerTagAssignments)
          .values(
            duplicateAssignments.map((assignment) => ({
              customerId: primaryCustomerId,
              tagId: assignment.tagId,
              organizationId: ctx.organizationId,
              assignedBy: ctx.user.id,
              notes: assignment.notes,
            }))
          )
          .onConflictDoNothing();
      }

      // Delete old assignments (defense-in-depth: org filter)
      await tx
        .delete(customerTagAssignments)
        .where(and(
          inArray(customerTagAssignments.customerId, duplicateCustomerIds),
          eq(customerTagAssignments.organizationId, ctx.organizationId)
        ));

      // Move health metrics to primary (defense-in-depth: org filter)
      await tx
        .update(customerHealthMetrics)
        .set({ customerId: primaryCustomerId })
        .where(and(
          inArray(customerHealthMetrics.customerId, duplicateCustomerIds),
          eq(customerHealthMetrics.organizationId, ctx.organizationId)
        ));

      // Move priority settings (keep primary's if exists)
      const primaryHasPriority = await tx
        .select()
        .from(customerPriorities)
        .where(and(
          eq(customerPriorities.customerId, primaryCustomerId),
          eq(customerPriorities.organizationId, ctx.organizationId)
        ))
        .limit(1);

      if (primaryHasPriority.length === 0) {
        // Move first duplicate's priority to primary
        const duplicatePriority = await tx
          .select()
          .from(customerPriorities)
          .where(and(
            inArray(customerPriorities.customerId, duplicateCustomerIds),
            eq(customerPriorities.organizationId, ctx.organizationId)
          ))
          .limit(1);

        if (duplicatePriority.length > 0) {
          await tx
            .update(customerPriorities)
            .set({ customerId: primaryCustomerId })
            .where(and(
              eq(customerPriorities.id, duplicatePriority[0].id),
              eq(customerPriorities.organizationId, ctx.organizationId)
            ));
        }
      }

      // Delete remaining duplicate priorities (defense-in-depth: org filter)
      await tx
        .delete(customerPriorities)
        .where(and(
          inArray(customerPriorities.customerId, duplicateCustomerIds),
          eq(customerPriorities.organizationId, ctx.organizationId)
        ));

      // Apply field resolutions if provided (merge specific fields)
      if (fieldResolutions) {
        const duplicates = existingCustomers.filter((c) => duplicateCustomerIds.includes(c.id));
        const updates: Partial<typeof primary> = {};

        for (const [field, resolution] of Object.entries(fieldResolutions)) {
          if (resolution === 'duplicate' && duplicates.length > 0) {
            // Use first duplicate's value
            const duplicateValue = duplicates[0][field as keyof typeof primary];
            if (duplicateValue !== undefined) {
              (updates as Record<string, unknown>)[field] = duplicateValue;
            }
          } else if (resolution === 'merge') {
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
          await tx
            .update(customers)
            .set({ ...updates, updatedBy: ctx.user.id })
            .where(and(
              eq(customers.id, primaryCustomerId),
              eq(customers.organizationId, ctx.organizationId)
            ));
        }
      }

      // Soft-delete duplicate customers (defense-in-depth: org filter)
      await tx
        .update(customers)
        .set({
          deletedAt: new Date(),
          updatedBy: ctx.user.id,
        })
        .where(and(
          inArray(customers.id, duplicateCustomerIds),
          eq(customers.organizationId, ctx.organizationId)
        ));
    });

    // Fetch updated primary customer for change tracking
    const primaryAfter = await db.query.customers.findFirst({
      where: and(
        eq(customers.id, primaryCustomerId),
        eq(customers.organizationId, ctx.organizationId)
      ),
    });

    // Log merge operations
    if (primaryAfter) {
      const changes = computeChanges({
        before: primaryBefore,
        after: primaryAfter,
        excludeFields: CUSTOMER_EXCLUDED_FIELDS as never[],
      });

      logger.logAsync({
        entityType: 'customer',
        entityId: primaryCustomerId,
        action: 'updated',
        changes,
        description: `Merged ${duplicateCustomerIds.length} duplicate(s) into customer: ${primaryAfter.name}`,
        metadata: {
          recordCount: duplicateCustomerIds.length,
          reason: fieldResolutions ? JSON.stringify(fieldResolutions) : undefined,
        },
      });
    }

    // Log deletions for each merged customer
    for (const duplicateId of duplicateCustomerIds) {
      const duplicate = existingCustomers.find((c) => c.id === duplicateId);
      if (duplicate) {
        logger.logAsync({
          entityType: 'customer',
          entityId: duplicateId,
          action: 'deleted',
          changes: computeChanges({
            before: duplicate,
            after: null,
            excludeFields: CUSTOMER_EXCLUDED_FIELDS as never[],
          }),
          description: `Merged into customer: ${primary?.name ?? primaryCustomerId}`,
          metadata: {
            mergedIntoCustomerId: primaryCustomerId,
            mergeReason: 'duplicate_merge',
          },
        });
      }
    }

    return {
      success: true,
      primaryCustomerId,
      mergedCount: duplicateCustomerIds.length,
    };
  });
