/**
 * Customer Action Plans Server Functions
 *
 * Server functions for managing customer health improvement action plans.
 * Uses Drizzle ORM with Zod validation.
 *
 * SECURITY: All functions use withAuth for authentication and
 * filter by organizationId for multi-tenant isolation.
 */

import { createServerFn } from '@tanstack/react-start';
import { eq, and, desc, asc, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { withAuth } from '@/lib/server/protected';
import { NotFoundError, ValidationError } from '@/lib/server/errors';
import { PERMISSIONS } from '@/lib/auth/permissions';
import { customerActionPlans } from 'drizzle/schema/customers/customer-action-plans';
import { auditLogs, AUDIT_ENTITY_TYPES } from 'drizzle/schema/_shared/audit-logs';
import {
  createActionPlanSchema,
  updateActionPlanSchema,
  listActionPlansSchema,
  listActionPlansCursorSchema,
  getActionPlanSchema,
  deleteActionPlanSchema,
  completeActionPlanSchema,
} from '@/lib/schemas/customers/action-plans';
import { decodeCursor, buildCursorCondition, buildStandardCursorResponse } from '@/lib/db/pagination';

// ============================================================================
// CRUD OPERATIONS
// ============================================================================

/**
 * Create a new action plan for a customer
 */
export const createActionPlan = createServerFn({ method: 'POST' })
  .inputValidator(createActionPlanSchema)
  .handler(async ({ data }): Promise<typeof customerActionPlans.$inferSelect> => {
    const ctx = await withAuth({ permission: PERMISSIONS.customer.read });

    // Wrap INSERT plan + INSERT audit in transaction for atomicity
    const created = await db.transaction(async (tx) => {
      const [plan] = await tx
        .insert(customerActionPlans)
        .values({
          organizationId: ctx.organizationId,
          customerId: data.customerId,
          title: data.title,
          description: data.description ?? null,
          priority: data.priority,
          category: data.category,
          dueDate: data.dueDate ?? null,
          metadata: data.metadata ?? {},
          createdBy: ctx.user.id,
          updatedBy: ctx.user.id,
        })
        .returning();

      // Audit log
      await tx.insert(auditLogs).values({
        organizationId: ctx.organizationId,
        userId: ctx.user.id,
        action: 'customer.action_plan.create',
        entityType: AUDIT_ENTITY_TYPES.USER, // Using USER as closest match
        entityId: plan.id,
        newValues: {
          customerId: data.customerId,
          title: data.title,
          priority: data.priority,
          category: data.category,
        },
        metadata: {
          affectedCount: 1,
        },
      });

      return plan;
    });

    return created;
  });

/**
 * Update an existing action plan
 */
export const updateActionPlan = createServerFn({ method: 'POST' })
  .inputValidator(updateActionPlanSchema)
  .handler(async ({ data }): Promise<typeof customerActionPlans.$inferSelect> => {
    const ctx = await withAuth({ permission: PERMISSIONS.customer.read });

    // Wrap SELECT + UPDATE + INSERT audit in transaction for atomicity
    const updated = await db.transaction(async (tx) => {
      // Get existing plan
      const [existing] = await tx
        .select()
        .from(customerActionPlans)
        .where(
          and(
            eq(customerActionPlans.id, data.id),
            eq(customerActionPlans.organizationId, ctx.organizationId)
          )
        )
        .limit(1);

      if (!existing) {
        throw new NotFoundError('Action plan not found', 'actionPlan');
      }

      // Prepare update values
      const updateValues: Partial<typeof customerActionPlans.$inferInsert> = {
        updatedBy: ctx.user.id,
      };

      if (data.title !== undefined) updateValues.title = data.title;
      if (data.description !== undefined) updateValues.description = data.description;
      if (data.priority !== undefined) updateValues.priority = data.priority;
      if (data.category !== undefined) updateValues.category = data.category;
      if (data.dueDate !== undefined) updateValues.dueDate = data.dueDate;
      if (data.metadata !== undefined) updateValues.metadata = data.metadata;

      // Handle completion
      if (data.isCompleted !== undefined) {
        updateValues.isCompleted = data.isCompleted;
        if (data.isCompleted && !existing.isCompleted) {
          updateValues.completedAt = new Date();
          updateValues.completedBy = ctx.user.id;
        } else if (!data.isCompleted) {
          updateValues.completedAt = null;
          updateValues.completedBy = null;
        }
      }

      // C02: Add orgId to UPDATE WHERE for tenant isolation
      const [result] = await tx
        .update(customerActionPlans)
        .set(updateValues)
        .where(
          and(
            eq(customerActionPlans.id, data.id),
            eq(customerActionPlans.organizationId, ctx.organizationId)
          )
        )
        .returning();

      // Audit log
      await tx.insert(auditLogs).values({
        organizationId: ctx.organizationId,
        userId: ctx.user.id,
        action: 'customer.action_plan.update',
        entityType: AUDIT_ENTITY_TYPES.USER,
        entityId: result.id,
        oldValues: {
          title: existing.title,
          priority: existing.priority,
          isCompleted: existing.isCompleted,
        },
        newValues: {
          title: result.title,
          priority: result.priority,
          isCompleted: result.isCompleted,
        },
        metadata: {
          affectedCount: 1,
        },
      });

      return result;
    });

    return updated;
  });

/**
 * List action plans with filtering and pagination
 */
export const listActionPlans = createServerFn({ method: 'GET' })
  .inputValidator(listActionPlansSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.customer.read });

    const {
      customerId,
      isCompleted,
      priority,
      category,
      page = 1,
      pageSize = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = data;

    // Build where conditions
    const conditions = [eq(customerActionPlans.organizationId, ctx.organizationId)];

    if (customerId) {
      conditions.push(eq(customerActionPlans.customerId, customerId));
    }
    if (isCompleted !== undefined) {
      conditions.push(eq(customerActionPlans.isCompleted, isCompleted));
    }
    if (priority) {
      conditions.push(eq(customerActionPlans.priority, priority));
    }
    if (category) {
      conditions.push(eq(customerActionPlans.category, category));
    }

    const whereClause = and(...conditions);

    // Get total count
    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(customerActionPlans)
      .where(whereClause);
    const totalItems = Number(countResult[0]?.count ?? 0);

    // Get paginated results
    const offset = (page - 1) * pageSize;
    const orderColumn =
      sortBy === 'title'
        ? customerActionPlans.title
        : sortBy === 'dueDate'
          ? customerActionPlans.dueDate
          : sortBy === 'priority'
            ? customerActionPlans.priority
            : customerActionPlans.createdAt;
    const orderDirection = sortOrder === 'asc' ? asc : desc;

    const items = await db
      .select()
      .from(customerActionPlans)
      .where(whereClause)
      .orderBy(orderDirection(orderColumn))
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
 * List action plans with cursor pagination (recommended for large datasets).
 */
export const listActionPlansCursor = createServerFn({ method: 'GET' })
  .inputValidator(listActionPlansCursorSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.customer.read });

    const { cursor, pageSize = 20, sortOrder = 'desc', customerId, isCompleted, priority, category } = data;

    const conditions = [eq(customerActionPlans.organizationId, ctx.organizationId)];
    if (customerId) conditions.push(eq(customerActionPlans.customerId, customerId));
    if (isCompleted !== undefined) conditions.push(eq(customerActionPlans.isCompleted, isCompleted));
    if (priority) conditions.push(eq(customerActionPlans.priority, priority));
    if (category) conditions.push(eq(customerActionPlans.category, category));

    if (cursor) {
      const cursorPosition = decodeCursor(cursor);
      if (cursorPosition) {
        conditions.push(buildCursorCondition(customerActionPlans.createdAt, customerActionPlans.id, cursorPosition, sortOrder));
      }
    }

    const orderDir = sortOrder === 'asc' ? asc : desc;
    const items = await db
      .select()
      .from(customerActionPlans)
      .where(and(...conditions))
      .orderBy(orderDir(customerActionPlans.createdAt), orderDir(customerActionPlans.id))
      .limit(pageSize + 1);

    return buildStandardCursorResponse(items, pageSize);
  });

/**
 * Get a single action plan by ID
 */
export const getActionPlan = createServerFn({ method: 'GET' })
  .inputValidator(getActionPlanSchema)
  .handler(async ({ data }): Promise<typeof customerActionPlans.$inferSelect> => {
    const ctx = await withAuth({ permission: PERMISSIONS.customer.read });

    const [plan] = await db
      .select()
      .from(customerActionPlans)
      .where(
        and(
          eq(customerActionPlans.id, data.id),
          eq(customerActionPlans.organizationId, ctx.organizationId)
        )
      )
      .limit(1);

    if (!plan) {
      throw new NotFoundError('Action plan not found', 'actionPlan');
    }

    return plan;
  });

/**
 * Delete an action plan
 */
export const deleteActionPlan = createServerFn({ method: 'POST' })
  .inputValidator(deleteActionPlanSchema)
  .handler(async ({ data }): Promise<void> => {
    const ctx = await withAuth({ permission: PERMISSIONS.customer.update });

    // Wrap SELECT + DELETE + INSERT audit in transaction for atomicity
    await db.transaction(async (tx) => {
      // Get existing plan for audit log
      const [existing] = await tx
        .select()
        .from(customerActionPlans)
        .where(
          and(
            eq(customerActionPlans.id, data.id),
            eq(customerActionPlans.organizationId, ctx.organizationId)
          )
        )
        .limit(1);

      if (!existing) {
        throw new NotFoundError('Action plan not found', 'actionPlan');
      }

      // C04: Add orgId to DELETE WHERE for tenant isolation
      await tx
        .delete(customerActionPlans)
        .where(
          and(
            eq(customerActionPlans.id, data.id),
            eq(customerActionPlans.organizationId, ctx.organizationId)
          )
        );

      // Audit log
      await tx.insert(auditLogs).values({
        organizationId: ctx.organizationId,
        userId: ctx.user.id,
        action: 'customer.action_plan.delete',
        entityType: AUDIT_ENTITY_TYPES.USER,
        entityId: data.id,
        oldValues: {
          customerId: existing.customerId,
          title: existing.title,
          priority: existing.priority,
        },
        metadata: {
          affectedCount: 1,
        },
      });
    });
  });

/**
 * Mark an action plan as completed
 */
export const completeActionPlan = createServerFn({ method: 'POST' })
  .inputValidator(completeActionPlanSchema)
  .handler(async ({ data }): Promise<typeof customerActionPlans.$inferSelect> => {
    const ctx = await withAuth({ permission: PERMISSIONS.customer.read });

    // Wrap SELECT + UPDATE + INSERT audit in transaction for atomicity
    const updated = await db.transaction(async (tx) => {
      // Get existing plan
      const [existing] = await tx
        .select()
        .from(customerActionPlans)
        .where(
          and(
            eq(customerActionPlans.id, data.id),
            eq(customerActionPlans.organizationId, ctx.organizationId)
          )
        )
        .limit(1);

      if (!existing) {
        throw new NotFoundError('Action plan not found', 'actionPlan');
      }

      if (existing.isCompleted) {
        throw new ValidationError('Action plan is already completed', { actionPlan: ['Action plan is already completed'] });
      }

      // C03: Add orgId to UPDATE WHERE for tenant isolation
      const [result] = await tx
        .update(customerActionPlans)
        .set({
          isCompleted: true,
          completedAt: new Date(),
          completedBy: ctx.user.id,
          updatedBy: ctx.user.id,
        })
        .where(
          and(
            eq(customerActionPlans.id, data.id),
            eq(customerActionPlans.organizationId, ctx.organizationId)
          )
        )
        .returning();

      // Audit log
      await tx.insert(auditLogs).values({
        organizationId: ctx.organizationId,
        userId: ctx.user.id,
        action: 'customer.action_plan.complete',
        entityType: AUDIT_ENTITY_TYPES.USER,
        entityId: result.id,
        oldValues: {
          isCompleted: false,
        },
        newValues: {
          isCompleted: true,
          completedAt: result.completedAt,
        },
        metadata: {
          affectedCount: 1,
        },
      });

      return result;
    });

    return updated;
  });
