/**
 * User Delegations Server Functions
 *
 * Server functions for out-of-office delegation management.
 * Allows users to delegate their tasks to others during absence.
 *
 * @see drizzle/schema/user-delegations.ts for database schema
 * @see src/lib/schemas/users.ts for validation schemas
 */

import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { eq, and, desc, asc, sql, lte, gte, or, isNull, ne, count as drizzleCount, inArray } from 'drizzle-orm';
import { db } from '@/lib/db';
import { userDelegations, users } from 'drizzle/schema';
import { withAuth } from '@/lib/server/protected';
import { PERMISSIONS } from '@/lib/auth/permissions';
import {
  createDelegationSchema,
  updateDelegationSchema,
  type Delegation,
} from '@/lib/schemas/users';
import { idParamSchema, paginationSchema } from '@/lib/schemas';
import { cursorPaginationSchema } from '@/lib/db/pagination';
import { decodeCursor, buildCursorCondition, buildStandardCursorResponse } from '@/lib/db/pagination';
import { NotFoundError, ConflictError } from '@/lib/server/errors';
import { createActivityLoggerWithContext } from '@/server/middleware/activity-context';
import { computeChanges } from '@/lib/activity-logger';

// Excluded fields for activity logging
const DELEGATION_EXCLUDED_FIELDS: string[] = [
  'updatedAt',
  'updatedBy',
  'createdAt',
  'createdBy',
  'organizationId',
  'version',
];

// ============================================================================
// CREATE DELEGATION
// ============================================================================

/**
 * Create a new delegation (delegate own tasks).
 * Users can always delegate their own tasks.
 */
export const createDelegation = createServerFn({ method: 'POST' })
  .inputValidator(createDelegationSchema)
  .handler(async ({ data }): Promise<Delegation> => {
    const ctx = await withAuth();

    // Verify delegate exists and is in same organization
    const [delegate] = await db
      .select({ id: users.id, email: users.email, name: users.name })
      .from(users)
      .where(and(eq(users.id, data.delegateId), eq(users.organizationId, ctx.organizationId)))
      .limit(1);

    if (!delegate) {
      throw new NotFoundError('Delegate user not found', 'user');
    }

    // Check for overlapping active delegation
    const overlapping = await db
      .select({ id: userDelegations.id })
      .from(userDelegations)
      .where(
        and(
          eq(userDelegations.delegatorId, ctx.user.id),
          eq(userDelegations.isActive, true),
          isNull(userDelegations.deletedAt),
          // Date ranges overlap
          or(
            and(
              lte(userDelegations.startDate, data.endDate),
              gte(userDelegations.endDate, data.startDate)
            )
          )
        )
      )
      .limit(1);

    if (overlapping.length > 0) {
      throw new ConflictError('You already have an active delegation during this period');
    }

    const [delegation] = await db
      .insert(userDelegations)
      .values({
        organizationId: ctx.organizationId,
        delegatorId: ctx.user.id,
        delegateId: data.delegateId,
        startDate: data.startDate,
        endDate: data.endDate,
        reason: data.reason,
        createdBy: ctx.user.id,
        updatedBy: ctx.user.id,
      })
      .returning();

    // Activity logging
    const logger = createActivityLoggerWithContext(ctx);
    logger.logAsync({
      entityType: 'user',
      entityId: delegation.id,
      action: 'created',
      description: `Created delegation to ${delegate.name ?? delegate.email}`,
      changes: computeChanges({
        before: null,
        after: delegation,
        excludeFields: DELEGATION_EXCLUDED_FIELDS as never[],
      }),
      metadata: {
        delegationId: delegation.id,
        delegatorId: ctx.user.id,
        delegatorName: ctx.user.name ?? undefined,
        delegateId: delegate.id,
        delegateName: delegate.name ?? undefined,
        delegateEmail: delegate.email,
        startDate: delegation.startDate.toISOString(),
        endDate: delegation.endDate.toISOString(),
        reason: delegation.reason ?? undefined,
      },
    });

    return {
      id: delegation.id,
      organizationId: delegation.organizationId,
      delegatorId: delegation.delegatorId,
      delegateId: delegation.delegateId,
      startDate: delegation.startDate,
      endDate: delegation.endDate,
      reason: delegation.reason,
      isActive: delegation.isActive,
      createdAt: delegation.createdAt,
      updatedAt: delegation.updatedAt,
      delegator: {
        id: ctx.user.id,
        email: ctx.user.email,
        name: ctx.user.name,
      },
      delegate: {
        id: delegate.id,
        email: delegate.email,
        name: delegate.name,
      },
    };
  });

// ============================================================================
// LIST MY DELEGATIONS
// ============================================================================

/**
 * List delegations where current user is the delegator.
 */
export const listMyDelegations = createServerFn({ method: 'GET' })
  .inputValidator(paginationSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth();

    const { page, pageSize } = data;
    const offset = (page - 1) * pageSize;

    const delegations = await db
      .select({
        id: userDelegations.id,
        organizationId: userDelegations.organizationId,
        delegatorId: userDelegations.delegatorId,
        delegateId: userDelegations.delegateId,
        startDate: userDelegations.startDate,
        endDate: userDelegations.endDate,
        reason: userDelegations.reason,
        isActive: userDelegations.isActive,
        createdAt: userDelegations.createdAt,
        updatedAt: userDelegations.updatedAt,
      })
      .from(userDelegations)
      .where(
        and(eq(userDelegations.delegatorId, ctx.user.id), isNull(userDelegations.deletedAt))
      )
      .orderBy(desc(userDelegations.startDate))
      .limit(pageSize)
      .offset(offset);

    // Get delegate info for each
    const delegateIds = [...new Set(delegations.map((d) => d.delegateId))];
    const delegates =
      delegateIds.length > 0
        ? await db
            .select({ id: users.id, email: users.email, name: users.name })
            .from(users)
            .where(inArray(users.id, delegateIds))
        : [];

    const delegateMap = new Map(delegates.map((d) => [d.id, d]));

    const [{ count }] = await db
      .select({ count: drizzleCount() })
      .from(userDelegations)
      .where(
        and(eq(userDelegations.delegatorId, ctx.user.id), isNull(userDelegations.deletedAt))
      );

    return {
      items: delegations.map((d) => ({
        ...d,
        delegator: {
          id: ctx.user.id,
          email: ctx.user.email,
          name: ctx.user.name,
        },
        delegate: delegateMap.get(d.delegateId),
      })),
      pagination: {
        page,
        pageSize,
        totalItems: count,
        totalPages: Math.ceil(count / pageSize),
      },
    };
  });

/**
 * List my delegations with cursor pagination (recommended for large datasets).
 */
export const listMyDelegationsCursor = createServerFn({ method: 'GET' })
  .inputValidator(cursorPaginationSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth();

    const { cursor, pageSize = 20, sortOrder = 'desc' } = data;

    const conditions = [
      eq(userDelegations.delegatorId, ctx.user.id),
      isNull(userDelegations.deletedAt),
    ];

    if (cursor) {
      const cursorPosition = decodeCursor(cursor);
      if (cursorPosition) {
        conditions.push(
          buildCursorCondition(userDelegations.createdAt, userDelegations.id, cursorPosition, sortOrder)
        );
      }
    }

    const orderDir = sortOrder === 'asc' ? asc : desc;
    const delegations = await db
      .select({
        id: userDelegations.id,
        organizationId: userDelegations.organizationId,
        delegatorId: userDelegations.delegatorId,
        delegateId: userDelegations.delegateId,
        startDate: userDelegations.startDate,
        endDate: userDelegations.endDate,
        reason: userDelegations.reason,
        isActive: userDelegations.isActive,
        createdAt: userDelegations.createdAt,
        updatedAt: userDelegations.updatedAt,
      })
      .from(userDelegations)
      .where(and(...conditions))
      .orderBy(orderDir(userDelegations.createdAt), orderDir(userDelegations.id))
      .limit(pageSize + 1);

    const delegateIds = [...new Set(delegations.map((d) => d.delegateId))];
    const delegates =
      delegateIds.length > 0
        ? await db
            .select({ id: users.id, email: users.email, name: users.name })
            .from(users)
            .where(inArray(users.id, delegateIds))
        : [];
    const delegateMap = new Map(delegates.map((d) => [d.id, d]));

    const items = delegations.map((d) => ({
      ...d,
      delegator: { id: ctx.user.id, email: ctx.user.email, name: ctx.user.name },
      delegate: delegateMap.get(d.delegateId),
    }));

    return buildStandardCursorResponse(items, pageSize);
  });

// ============================================================================
// LIST DELEGATIONS TO ME
// ============================================================================

/**
 * List delegations where current user is the delegate.
 */
export const listDelegationsToMe = createServerFn({ method: 'GET' })
  .inputValidator(paginationSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth();

    const { page, pageSize } = data;
    const offset = (page - 1) * pageSize;

    const delegations = await db
      .select({
        id: userDelegations.id,
        organizationId: userDelegations.organizationId,
        delegatorId: userDelegations.delegatorId,
        delegateId: userDelegations.delegateId,
        startDate: userDelegations.startDate,
        endDate: userDelegations.endDate,
        reason: userDelegations.reason,
        isActive: userDelegations.isActive,
        createdAt: userDelegations.createdAt,
        updatedAt: userDelegations.updatedAt,
      })
      .from(userDelegations)
      .where(
        and(
          eq(userDelegations.delegateId, ctx.user.id),
          eq(userDelegations.isActive, true),
          isNull(userDelegations.deletedAt)
        )
      )
      .orderBy(desc(userDelegations.startDate))
      .limit(pageSize)
      .offset(offset);

    // Get delegator info for each
    const delegatorIds = [...new Set(delegations.map((d) => d.delegatorId))];
    const delegators =
      delegatorIds.length > 0
        ? await db
            .select({ id: users.id, email: users.email, name: users.name })
            .from(users)
            .where(inArray(users.id, delegatorIds))
        : [];

    const delegatorMap = new Map(delegators.map((d) => [d.id, d]));

    const [{ count }] = await db
      .select({ count: drizzleCount() })
      .from(userDelegations)
      .where(
        and(
          eq(userDelegations.delegateId, ctx.user.id),
          eq(userDelegations.isActive, true),
          isNull(userDelegations.deletedAt)
        )
      );

    return {
      items: delegations.map((d) => ({
        ...d,
        delegator: delegatorMap.get(d.delegatorId),
        delegate: {
          id: ctx.user.id,
          email: ctx.user.email,
          name: ctx.user.name,
        },
      })),
      pagination: {
        page,
        pageSize,
        totalItems: count,
        totalPages: Math.ceil(count / pageSize),
      },
    };
  });

/**
 * List delegations to me with cursor pagination (recommended for large datasets).
 */
export const listDelegationsToMeCursor = createServerFn({ method: 'GET' })
  .inputValidator(cursorPaginationSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth();

    const { cursor, pageSize = 20, sortOrder = 'desc' } = data;

    const conditions = [
      eq(userDelegations.delegateId, ctx.user.id),
      eq(userDelegations.isActive, true),
      isNull(userDelegations.deletedAt),
    ];

    if (cursor) {
      const cursorPosition = decodeCursor(cursor);
      if (cursorPosition) {
        conditions.push(
          buildCursorCondition(userDelegations.createdAt, userDelegations.id, cursorPosition, sortOrder)
        );
      }
    }

    const orderDir = sortOrder === 'asc' ? asc : desc;
    const delegations = await db
      .select({
        id: userDelegations.id,
        organizationId: userDelegations.organizationId,
        delegatorId: userDelegations.delegatorId,
        delegateId: userDelegations.delegateId,
        startDate: userDelegations.startDate,
        endDate: userDelegations.endDate,
        reason: userDelegations.reason,
        isActive: userDelegations.isActive,
        createdAt: userDelegations.createdAt,
        updatedAt: userDelegations.updatedAt,
      })
      .from(userDelegations)
      .where(and(...conditions))
      .orderBy(orderDir(userDelegations.createdAt), orderDir(userDelegations.id))
      .limit(pageSize + 1);

    const delegatorIds = [...new Set(delegations.map((d) => d.delegatorId))];
    const delegators =
      delegatorIds.length > 0
        ? await db
            .select({ id: users.id, email: users.email, name: users.name })
            .from(users)
            .where(inArray(users.id, delegatorIds))
        : [];
    const delegatorMap = new Map(delegators.map((d) => [d.id, d]));

    const items = delegations.map((d) => ({
      ...d,
      delegator: delegatorMap.get(d.delegatorId),
      delegate: { id: ctx.user.id, email: ctx.user.email, name: ctx.user.name },
    }));

    return buildStandardCursorResponse(items, pageSize);
  });

// ============================================================================
// LIST ALL DELEGATIONS (admin)
// ============================================================================

const listAllDelegationsSchema = paginationSchema.extend({
  activeOnly: z.boolean().optional().default(true),
});

/**
 * List all delegations in organization.
 * Requires: user.read permission
 */
export const listAllDelegations = createServerFn({ method: 'GET' })
  .inputValidator(listAllDelegationsSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.user.read });

    const { page, pageSize, activeOnly } = data;
    const offset = (page - 1) * pageSize;

    const conditions = [
      eq(userDelegations.organizationId, ctx.organizationId),
      isNull(userDelegations.deletedAt),
    ];
    if (activeOnly) {
      conditions.push(eq(userDelegations.isActive, true));
    }

    const delegations = await db
      .select({
        id: userDelegations.id,
        organizationId: userDelegations.organizationId,
        delegatorId: userDelegations.delegatorId,
        delegateId: userDelegations.delegateId,
        startDate: userDelegations.startDate,
        endDate: userDelegations.endDate,
        reason: userDelegations.reason,
        isActive: userDelegations.isActive,
        createdAt: userDelegations.createdAt,
        updatedAt: userDelegations.updatedAt,
      })
      .from(userDelegations)
      .where(and(...conditions))
      .orderBy(desc(userDelegations.startDate))
      .limit(pageSize)
      .offset(offset);

    // Get all user info
    const userIds = [
      ...new Set([
        ...delegations.map((d) => d.delegatorId),
        ...delegations.map((d) => d.delegateId),
      ]),
    ];
    const allUsers =
      userIds.length > 0
        ? await db
            .select({ id: users.id, email: users.email, name: users.name })
            .from(users)
            .where(inArray(users.id, userIds))
        : [];

    const userMap = new Map(allUsers.map((u) => [u.id, u]));

    const [{ count }] = await db
      .select({ count: drizzleCount() })
      .from(userDelegations)
      .where(and(...conditions));

    return {
      items: delegations.map((d) => ({
        ...d,
        delegator: userMap.get(d.delegatorId),
        delegate: userMap.get(d.delegateId),
      })),
      pagination: {
        page,
        pageSize,
        totalItems: count,
        totalPages: Math.ceil(count / pageSize),
      },
    };
  });

// ============================================================================
// UPDATE DELEGATION
// ============================================================================

const updateDelegationInputSchema = idParamSchema.merge(
  z.object({ updates: updateDelegationSchema })
);

/**
 * Update a delegation.
 * Users can only update their own delegations.
 */
export const updateDelegation = createServerFn({ method: 'POST' })
  .inputValidator(updateDelegationInputSchema)
  .handler(async ({ data }): Promise<Delegation> => {
    const ctx = await withAuth();

    // Verify delegation exists and belongs to current user
    const [existing] = await db
      .select()
      .from(userDelegations)
      .where(
        and(
          eq(userDelegations.id, data.id),
          eq(userDelegations.delegatorId, ctx.user.id),
          isNull(userDelegations.deletedAt)
        )
      )
      .limit(1);

    if (!existing) {
      throw new NotFoundError('Delegation not found', 'delegation');
    }

    // If updating dates, check for overlap with other delegations
    const startDate = data.updates.startDate || existing.startDate;
    const endDate = data.updates.endDate || existing.endDate;

    const overlapping = await db
      .select({ id: userDelegations.id })
      .from(userDelegations)
      .where(
        and(
          eq(userDelegations.delegatorId, ctx.user.id),
          eq(userDelegations.isActive, true),
          ne(userDelegations.id, data.id),
          isNull(userDelegations.deletedAt),
          or(and(lte(userDelegations.startDate, endDate), gte(userDelegations.endDate, startDate)))
        )
      )
      .limit(1);

    if (overlapping.length > 0) {
      throw new ConflictError('Date range overlaps with another active delegation');
    }

    const [updated] = await db
      .update(userDelegations)
      .set({
        ...data.updates,
        updatedBy: ctx.user.id,
        version: sql<number>`${userDelegations.version} + 1`,
      })
      .where(eq(userDelegations.id, data.id))
      .returning();

    // Get delegate info
    const [delegate] = await db
      .select({ id: users.id, email: users.email, name: users.name })
      .from(users)
      .where(eq(users.id, updated.delegateId))
      .limit(1);

    // Activity logging
    const logger = createActivityLoggerWithContext(ctx);
    logger.logAsync({
      entityType: 'user',
      entityId: updated.id,
      action: 'updated',
      description: `Updated delegation to ${delegate?.name ?? delegate?.email ?? 'user'}`,
      changes: computeChanges({
        before: existing,
        after: updated,
        excludeFields: DELEGATION_EXCLUDED_FIELDS as never[],
      }),
      metadata: {
        delegationId: updated.id,
        delegatorId: ctx.user.id,
        delegateId: updated.delegateId,
        delegateName: delegate?.name ?? undefined,
        changedFields: Object.keys(data.updates),
      },
    });

    return {
      id: updated.id,
      organizationId: updated.organizationId,
      delegatorId: updated.delegatorId,
      delegateId: updated.delegateId,
      startDate: updated.startDate,
      endDate: updated.endDate,
      reason: updated.reason,
      isActive: updated.isActive,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
      delegator: {
        id: ctx.user.id,
        email: ctx.user.email,
        name: ctx.user.name,
      },
      delegate: delegate,
    };
  });

// ============================================================================
// CANCEL DELEGATION
// ============================================================================

/**
 * Cancel a delegation (set inactive).
 * Users can only cancel their own delegations.
 */
export const cancelDelegation = createServerFn({ method: 'POST' })
  .inputValidator(idParamSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth();

    // Verify delegation exists and belongs to current user
    const [existing] = await db
      .select({
        id: userDelegations.id,
        delegateId: userDelegations.delegateId,
        startDate: userDelegations.startDate,
        endDate: userDelegations.endDate,
      })
      .from(userDelegations)
      .where(
        and(
          eq(userDelegations.id, data.id),
          eq(userDelegations.delegatorId, ctx.user.id),
          isNull(userDelegations.deletedAt)
        )
      )
      .limit(1);

    if (!existing) {
      throw new NotFoundError('Delegation not found', 'delegation');
    }

    // Get delegate info for logging
    const [delegate] = await db
      .select({ name: users.name, email: users.email })
      .from(users)
      .where(eq(users.id, existing.delegateId))
      .limit(1);

    await db
      .update(userDelegations)
      .set({
        isActive: false,
        updatedBy: ctx.user.id,
        version: sql<number>`${userDelegations.version} + 1`,
      })
      .where(eq(userDelegations.id, data.id));

    // Activity logging
    const logger = createActivityLoggerWithContext(ctx);
    logger.logAsync({
      entityType: 'user',
      entityId: data.id,
      action: 'updated',
      description: `Cancelled delegation to ${delegate?.name ?? delegate?.email ?? 'user'}`,
      changes: undefined,
      metadata: {
        delegationId: data.id,
        delegatorId: ctx.user.id,
        delegateId: existing.delegateId,
        delegateName: delegate?.name ?? undefined,
        delegateEmail: delegate?.email ?? undefined,
        startDate: existing.startDate.toISOString(),
        endDate: existing.endDate.toISOString(),
        previousStatus: 'active',
        newStatus: 'cancelled',
      },
    });

    return { success: true };
  });

// ============================================================================
// GET ACTIVE DELEGATE FOR USER
// ============================================================================

/**
 * Get the current active delegate for a user (if any).
 * Useful for redirecting tasks/notifications.
 */
export const getActiveDelegate = createServerFn({ method: 'GET' })
  .inputValidator(idParamSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth();

    // Verify user is in same organization
    const [user] = await db
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.id, data.id), eq(users.organizationId, ctx.organizationId)))
      .limit(1);

    if (!user) {
      throw new NotFoundError('User not found', 'user');
    }

    const now = new Date();

    // Get active delegation for user
    const [delegation] = await db
      .select({
        id: userDelegations.id,
        delegateId: userDelegations.delegateId,
        endDate: userDelegations.endDate,
      })
      .from(userDelegations)
      .where(
        and(
          eq(userDelegations.delegatorId, data.id),
          eq(userDelegations.isActive, true),
          lte(userDelegations.startDate, now),
          gte(userDelegations.endDate, now),
          isNull(userDelegations.deletedAt)
        )
      )
      .limit(1);

    if (!delegation) {
      return null;
    }

    // Get delegate info
    const [delegate] = await db
      .select({ id: users.id, email: users.email, name: users.name })
      .from(users)
      .where(eq(users.id, delegation.delegateId))
      .limit(1);

    return {
      delegationId: delegation.id,
      delegate,
      endsAt: delegation.endDate,
    };
  });
