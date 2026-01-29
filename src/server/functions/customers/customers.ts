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
import { eq, and, ilike, desc, asc, sql, inArray, gte, lte } from 'drizzle-orm';
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
} from 'drizzle/schema';
import { createActivityLoggerWithContext } from '@/server/middleware/activity-context';
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
  mergeCustomersSchema,
} from '@/lib/schemas/customers';
import {
  decodeCursor,
  buildCursorCondition,
  buildStandardCursorResponse,
} from '@/lib/db/pagination';
import { withAuth } from '@/lib/server/protected';
import { PERMISSIONS } from '@/lib/auth/permissions';
import { NotFoundError, ConflictError } from '@/lib/server/errors';

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
      sql`${customers.deletedAt} IS NULL`,
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

    // Run count and paginated results in parallel to eliminate waterfall
    const [countResult, items] = await Promise.all([
      db
        .select({ count: sql<number>`count(*)` })
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
          lifetimeValue: customers.lifetimeValue,
          firstOrderDate: customers.firstOrderDate,
          lastOrderDate: customers.lastOrderDate,
          totalOrders: customers.totalOrders,
          totalOrderValue: customers.totalOrderValue,
          averageOrderValue: customers.averageOrderValue,
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
        .where(whereClause)
        .orderBy(orderDirection(orderColumn))
        .limit(pageSize)
        .offset(offset),
    ]);

    const totalItems = Number(countResult[0]?.count ?? 0);

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
      sql`${customers.deletedAt} IS NULL`,
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

    const whereClause = and(...conditions);
    const orderDirection = sortOrder === 'asc' ? asc : desc;

    const results = await db
      .select()
      .from(customers)
      .where(whereClause)
      .orderBy(orderDirection(customers.createdAt), orderDirection(customers.id))
      .limit(pageSize + 1);

    return buildStandardCursorResponse(results, pageSize);
  });

/**
 * Get single customer with 360-degree view (contacts, addresses, activities)
 */
export const getCustomerById = createServerFn({ method: 'GET' })
  .inputValidator(customerParamsSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.customer.read });

    const { id } = data;

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
        sql`${customers.deletedAt} IS NULL`
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
            sql`${customers.deletedAt} IS NULL`
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

      return result[0];
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
        sql`${customers.deletedAt} IS NULL`
      ),
    });

    if (!customerToDelete) {
      throw new NotFoundError('Customer not found', 'customer');
    }

    const deleted = await db.transaction(async (tx) => {
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
            sql`${customers.deletedAt} IS NULL`
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

    return result[0];
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

    return result[0];
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

    return result[0];
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

    return result[0];
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

    const results = await db
      .select()
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

    return result[0];
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
    .orderBy(desc(customerTags.usageCount), asc(customerTags.name));

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

    return result[0];
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

    return result[0];
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
 */
export const assignCustomerTag = createServerFn({ method: 'POST' })
  .inputValidator(assignCustomerTagSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.customer.update });

    const { customerId, tagId, notes } = data;

    // Check if assignment already exists (include org filter for tenant isolation)
    const existing = await db
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

    return result[0];
  });

/**
 * Unassign a tag from a customer
 */
export const unassignCustomerTag = createServerFn({ method: 'POST' })
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
      throw new NotFoundError('Tag assignment not found', 'customerTagAssignment');
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

    // Update customer's current health score (include org filter for tenant isolation)
    if (data.overallScore !== undefined) {
      await db
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

    return result[0];
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

    return result[0];
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

    return result[0];
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
          sql`${customers.deletedAt} IS NULL`
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
          sql`${customers.deletedAt} IS NULL`
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
          sql`${customers.deletedAt} IS NULL`
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
          mergedCount: duplicateCustomerIds.length,
          mergedCustomerIds: duplicateCustomerIds.join(','),
          fieldResolutions: fieldResolutions ? JSON.stringify(fieldResolutions) : null,
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
