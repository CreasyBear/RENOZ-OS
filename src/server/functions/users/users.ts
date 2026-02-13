/**
 * User Management Server Functions
 *
 * Server functions for user administration.
 * Provides CRUD operations for users within the organization.
 *
 * @see drizzle/schema/users.ts for database schema
 * @see src/lib/schemas/auth.ts for validation schemas
 */

import { createServerFn } from '@tanstack/react-start';
import { eq, and, desc, asc, ilike, or, isNull, count, inArray } from 'drizzle-orm';
import { db } from '@/lib/db';
import { containsPattern } from '@/lib/db/utils';
import { users, userGroupMembers, userGroups, userSessions } from 'drizzle/schema';
import { createClient } from '@supabase/supabase-js';
import { withAuth } from '@/lib/server/protected';
import { PERMISSIONS } from '@/lib/auth/permissions';
import { userListQuerySchema, userListCursorSchema, updateUserSchema } from '@/lib/schemas/auth';
import { decodeCursor, buildCursorCondition, buildStandardCursorResponse } from '@/lib/db/pagination';
import { idParamSchema } from '@/lib/schemas';
import {
  transferOwnershipSchema,
  bulkUpdateServerSchema,
  exportUsersServerSchema,
} from '@/lib/schemas/users';
import { logAuditEvent } from '../_shared/audit-logs';
import { AUDIT_ACTIONS, AUDIT_ENTITY_TYPES } from 'drizzle/schema';
import { buildSafeCSV } from '@/lib/utils/csv-sanitize';
import {
  NotFoundError,
  ValidationError,
  AuthError,
  ServerError,
} from '@/lib/server/errors';
import { createActivityLoggerWithContext } from '@/server/middleware/activity-context';
import { completeOnboardingStep } from './onboarding';
import { authLogger } from '@/lib/logger';

// ============================================================================
// HELPER: Get server-side Supabase admin client
// ============================================================================

function getServerSupabaseAdmin() {
  const url = process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new ServerError('Supabase environment variables not configured');
  }

  return createClient(url, serviceKey);
}

/**
 * Invalidate all sessions for a user.
 * Deletes app sessions and terminates Supabase auth sessions.
 */
async function invalidateUserSessions(userId: string, authId: string): Promise<void> {
  // Delete app-level sessions
  await db.delete(userSessions).where(eq(userSessions.userId, userId));

  // Terminate Supabase auth sessions
  try {
    const supabase = getServerSupabaseAdmin();
    // Sign out user from all devices
    await supabase.auth.admin.signOut(authId, 'global');
  } catch (error) {
    // Log but don't fail - the user is already deactivated
    authLogger.error('Failed to terminate Supabase sessions', error);
  }
}

// ============================================================================
// GET CURRENT USER (used by useCurrentUser hook)
// ============================================================================

/**
 * Get the current authenticated user's profile.
 * Requires: Authentication
 */
export const getCurrentUser = createServerFn({ method: 'GET' }).handler(async () => {
  authLogger.debug('[getCurrentUser] start');
  try {
    const ctx = await withAuth();
    authLogger.debug('[getCurrentUser] success', {
      authId: ctx.user.authId,
      userId: ctx.user.id,
      organizationId: ctx.user.organizationId,
      role: ctx.user.role,
      status: ctx.user.status,
    });
    return ctx.user;
  } catch (error) {
    authLogger.error('[getCurrentUser] failed', error, {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw error;
  }
});

// ============================================================================
// LIST USERS
// ============================================================================

/**
 * List users for the organization with filtering and pagination.
 * Requires: user.read permission
 */
export const listUsers = createServerFn({ method: 'GET' })
  .inputValidator(userListQuerySchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.user.read });

    const { page, pageSize, search, role, status, type, sortBy, sortOrder } = data;
    const offset = (page - 1) * pageSize;

    // Build conditions
    const conditions = [
      eq(users.organizationId, ctx.organizationId),
      isNull(users.deletedAt), // Exclude soft-deleted users
    ];

    if (role) {
      conditions.push(eq(users.role, role));
    }
    if (status) {
      conditions.push(eq(users.status, status));
    }
    if (type) {
      conditions.push(eq(users.type, type));
    }
    if (search) {
      conditions.push(or(ilike(users.name, containsPattern(search)), ilike(users.email, containsPattern(search)))!);
    }

    // Determine sort column
    const sortColumn =
      sortBy === 'email'
        ? users.email
        : sortBy === 'role'
          ? users.role
          : sortBy === 'status'
            ? users.status
            : sortBy === 'createdAt'
              ? users.createdAt
              : users.name;

    const orderDir = sortOrder === 'desc' ? desc(sortColumn) : sortColumn;

    // Get users
    const userList = await db
      .select({
        id: users.id,
        authId: users.authId,
        organizationId: users.organizationId,
        email: users.email,
        name: users.name,
        role: users.role,
        status: users.status,
        type: users.type,
        profile: users.profile,
        preferences: users.preferences,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      })
      .from(users)
      .where(and(...conditions))
      .orderBy(orderDir)
      .limit(pageSize)
      .offset(offset);

    // Get total count
    const [{ total }] = await db
      .select({ total: count() })
      .from(users)
      .where(and(...conditions));

    return {
      items: userList,
      pagination: {
        page,
        pageSize,
        totalItems: total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  });

/**
 * List users with cursor pagination (recommended for large datasets).
 * Uses createdAt + id for stable sort.
 */
export const listUsersCursor = createServerFn({ method: 'GET' })
  .inputValidator(userListCursorSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.user.read });

    const { cursor, pageSize = 20, sortOrder = 'desc', search, role, status, type } = data;

    const conditions = [eq(users.organizationId, ctx.organizationId), isNull(users.deletedAt)];
    if (role) conditions.push(eq(users.role, role));
    if (status) conditions.push(eq(users.status, status));
    if (type) conditions.push(eq(users.type, type));
    if (search) {
      conditions.push(or(ilike(users.name, containsPattern(search)), ilike(users.email, containsPattern(search)))!);
    }

    if (cursor) {
      const cursorPosition = decodeCursor(cursor);
      if (cursorPosition) {
        conditions.push(buildCursorCondition(users.createdAt, users.id, cursorPosition, sortOrder));
      }
    }

    const orderDir = sortOrder === 'asc' ? asc : desc;
    const userList = await db
      .select({
        id: users.id,
        authId: users.authId,
        organizationId: users.organizationId,
        email: users.email,
        name: users.name,
        role: users.role,
        status: users.status,
        type: users.type,
        profile: users.profile,
        preferences: users.preferences,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      })
      .from(users)
      .where(and(...conditions))
      .orderBy(orderDir(users.createdAt), orderDir(users.id))
      .limit(pageSize + 1);

    return buildStandardCursorResponse(userList, pageSize);
  });

// ============================================================================
// GET USER BY ID
// ============================================================================

/**
 * Get a single user with their groups.
 * Requires: user.read permission
 */
export const getUser = createServerFn({ method: 'GET' })
  .inputValidator(idParamSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.user.read });

    // Get user
    const [user] = await db
      .select({
        id: users.id,
        authId: users.authId,
        organizationId: users.organizationId,
        email: users.email,
        name: users.name,
        role: users.role,
        status: users.status,
        type: users.type,
        profile: users.profile,
        preferences: users.preferences,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      })
      .from(users)
      .where(
        and(
          eq(users.id, data.id),
          eq(users.organizationId, ctx.organizationId),
          isNull(users.deletedAt)
        )
      )
      .limit(1);

    if (!user) {
      throw new NotFoundError('User not found', 'user');
    }

    // Get user's groups
    const groups = await db
      .select({
        groupId: userGroupMembers.groupId,
        groupName: userGroups.name,
        role: userGroupMembers.role,
        joinedAt: userGroupMembers.joinedAt,
      })
      .from(userGroupMembers)
      .innerJoin(userGroups, eq(userGroupMembers.groupId, userGroups.id))
      .where(and(eq(userGroupMembers.userId, data.id), isNull(userGroupMembers.deletedAt)));

    return {
      ...user,
      groups,
    };
  });

// ============================================================================
// UPDATE USER
// ============================================================================

/**
 * Update a user's profile, role, or status.
 * Requires: user.update permission
 */
export const updateUser = createServerFn({ method: 'POST' })
  .inputValidator(idParamSchema.merge(updateUserSchema))
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.user.update });

    const { id, ...updates } = data;

    // Verify user exists and belongs to organization
    const [existingUser] = await db
      .select()
      .from(users)
      .where(
        and(eq(users.id, id), eq(users.organizationId, ctx.organizationId), isNull(users.deletedAt))
      )
      .limit(1);

    if (!existingUser) {
      throw new NotFoundError('User not found', 'user');
    }

    // Prevent demoting organization owners
    if (existingUser.role === 'owner' && updates.role && updates.role !== 'owner') {
      throw new ValidationError('Cannot demote the organization owner');
    }

    // Build update object (users table has no version column)
    const updateData: Record<string, unknown> = {
      updatedBy: ctx.user.id,
    };

    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.role !== undefined) updateData.role = updates.role;
    if (updates.status !== undefined) updateData.status = updates.status;
    if (updates.type !== undefined) updateData.type = updates.type;
    if (updates.profile !== undefined) {
      updateData.profile = {
        ...existingUser.profile,
        ...updates.profile,
      };
    }
    if (updates.preferences !== undefined) {
      updateData.preferences = {
        ...existingUser.preferences,
        ...updates.preferences,
      };
    }

    // Update user
    const [updatedUser] = await db
      .update(users)
      .set(updateData)
      .where(
        and(
          eq(users.id, id),
          eq(users.organizationId, ctx.organizationId)
        )
      )
      .returning();

    // Log audit event
    await logAuditEvent({
      organizationId: ctx.organizationId,
      userId: ctx.user.id,
      action: AUDIT_ACTIONS.USER_UPDATE,
      entityType: AUDIT_ENTITY_TYPES.USER,
      entityId: id,
      oldValues: {
        name: existingUser.name,
        role: existingUser.role,
        status: existingUser.status,
        type: existingUser.type,
      },
      newValues: {
        name: updatedUser.name,
        role: updatedUser.role,
        status: updatedUser.status,
        type: updatedUser.type,
      },
    });

    // Log activity for profile updates (if profile changed)
    if (updates.profile !== undefined || updates.name !== undefined) {
      const logger = createActivityLoggerWithContext(ctx);
      await logger.logUpdate(
        'user',
        id,
        {
          name: existingUser.name,
          profile: existingUser.profile as Record<string, unknown>,
        },
        {
          name: updatedUser.name,
          profile: updatedUser.profile as Record<string, unknown>,
        },
        {
          description: 'Profile updated',
          excludeFields: ['updatedAt', 'updatedBy'],
        }
      );
    }

    // Check if profile is complete enough for onboarding step
    // Only mark complete if user is updating their own profile (self-service)
    if (id === ctx.user.id && (updates.profile !== undefined || updates.name !== undefined)) {
      const { calculateProfileCompleteness } = await import('@/lib/users/profile-helpers');
      const completeness = calculateProfileCompleteness({
        name: updatedUser.name,
        profile: updatedUser.profile,
      });

      // Mark onboarding step complete if profile is 70%+ complete
      if (completeness.isComplete) {
        try {
          await completeOnboardingStep({ data: { stepKey: 'profile_complete' } });
        } catch (error) {
          // Don't fail the update if onboarding step completion fails
          // Log error but continue
          authLogger.error('[updateUser] Failed to mark onboarding step complete', error);
        }
      }
    }

    return {
      id: updatedUser.id,
      authId: updatedUser.authId,
      organizationId: updatedUser.organizationId,
      email: updatedUser.email,
      name: updatedUser.name,
      role: updatedUser.role,
      status: updatedUser.status,
      type: updatedUser.type,
      profile: updatedUser.profile,
      preferences: updatedUser.preferences,
      createdAt: updatedUser.createdAt,
      updatedAt: updatedUser.updatedAt,
    };
  });

// ============================================================================
// DEACTIVATE USER (soft delete)
// ============================================================================

/**
 * Deactivate a user (soft delete).
 * Requires: user.delete permission
 *
 * This also invalidates all the user's sessions to immediately
 * revoke access, preventing any continued API access or UI usage.
 */
export const deactivateUser = createServerFn({ method: 'POST' })
  .inputValidator(idParamSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.user.deactivate });

    // Verify user exists and belongs to organization
    const [existingUser] = await db
      .select({ id: users.id, authId: users.authId, role: users.role, email: users.email })
      .from(users)
      .where(
        and(
          eq(users.id, data.id),
          eq(users.organizationId, ctx.organizationId),
          isNull(users.deletedAt)
        )
      )
      .limit(1);

    if (!existingUser) {
      throw new NotFoundError('User not found', 'user');
    }

    // Prevent deactivating organization owners
    if (existingUser.role === 'owner') {
      throw new ValidationError('Cannot deactivate the organization owner');
    }

    // Prevent self-deactivation
    if (existingUser.id === ctx.user.id) {
      throw new ValidationError('Cannot deactivate your own account');
    }

    // Soft delete (note: deletedBy is not in schema, we track it in audit log)
    await db
      .update(users)
      .set({
        status: 'deactivated',
        deletedAt: new Date(),
        updatedBy: ctx.user.id,
      })
      .where(eq(users.id, data.id));

    // Invalidate all sessions immediately to revoke access
    await invalidateUserSessions(existingUser.id, existingUser.authId);

    // Log audit event
    await logAuditEvent({
      organizationId: ctx.organizationId,
      userId: ctx.user.id,
      action: AUDIT_ACTIONS.USER_DELETE,
      entityType: AUDIT_ENTITY_TYPES.USER,
      entityId: data.id,
      oldValues: { email: existingUser.email, status: 'active' },
      newValues: { status: 'deactivated' },
    });

    return { success: true };
  });

// ============================================================================
// REACTIVATE USER
// ============================================================================

/**
 * Reactivate a deactivated user.
 * Requires: user.update permission
 */
export const reactivateUser = createServerFn({ method: 'POST' })
  .inputValidator(idParamSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.user.update });

    // Verify user exists (including soft-deleted)
    const [existingUser] = await db
      .select({ id: users.id, email: users.email, status: users.status })
      .from(users)
      .where(and(eq(users.id, data.id), eq(users.organizationId, ctx.organizationId)))
      .limit(1);

    if (!existingUser) {
      throw new NotFoundError('User not found', 'user');
    }

    if (existingUser.status !== 'deactivated') {
      throw new ValidationError('User is not deactivated');
    }

    // Reactivate
    await db
      .update(users)
      .set({
        status: 'active',
        deletedAt: null,
        updatedBy: ctx.user.id,
      })
      .where(eq(users.id, data.id));

    // Log audit event
    await logAuditEvent({
      organizationId: ctx.organizationId,
      userId: ctx.user.id,
      action: AUDIT_ACTIONS.USER_UPDATE,
      entityType: AUDIT_ENTITY_TYPES.USER,
      entityId: data.id,
      oldValues: { status: 'deactivated' },
      newValues: { status: 'active' },
      metadata: { action: 'reactivate' },
    });

    return { success: true };
  });

// ============================================================================
// TRANSFER OWNERSHIP
// ============================================================================

/**
 * Transfer organization ownership to another user.
 * Only the current owner can transfer ownership.
 * The current owner becomes an admin after transfer.
 */
export const transferOwnership = createServerFn({ method: 'POST' })
  .inputValidator(transferOwnershipSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth();

    // Only the current owner can transfer ownership
    if (ctx.role !== 'owner') {
      throw new AuthError('Only the organization owner can transfer ownership');
    }

    // Verify new owner exists, is active, and belongs to the same organization
    const [newOwner] = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        role: users.role,
        status: users.status,
      })
      .from(users)
      .where(
        and(
          eq(users.id, data.newOwnerId),
          eq(users.organizationId, ctx.organizationId),
          isNull(users.deletedAt)
        )
      )
      .limit(1);

    if (!newOwner) {
      throw new NotFoundError('Target user not found in your organization', 'user');
    }

    if (newOwner.status !== 'active') {
      throw new ValidationError('Cannot transfer ownership to an inactive user');
    }

    if (newOwner.id === ctx.user.id) {
      throw new ValidationError('You are already the owner');
    }

    // Use transaction for atomic ownership transfer
    await db.transaction(async (tx) => {
      // Demote current owner to admin
      await tx
        .update(users)
        .set({
          role: 'admin',
          updatedBy: ctx.user.id,
        })
        .where(eq(users.id, ctx.user.id));

      // Promote new owner
      await tx
        .update(users)
        .set({
          role: 'owner',
          updatedBy: ctx.user.id,
        })
        .where(eq(users.id, data.newOwnerId));
    });

    // Log audit events for both changes
    await logAuditEvent({
      organizationId: ctx.organizationId,
      userId: ctx.user.id,
      action: AUDIT_ACTIONS.USER_UPDATE,
      entityType: AUDIT_ENTITY_TYPES.USER,
      entityId: ctx.user.id,
      oldValues: { role: 'owner' },
      newValues: { role: 'admin' },
      metadata: { action: 'ownership_transfer', transferredTo: data.newOwnerId },
    });

    await logAuditEvent({
      organizationId: ctx.organizationId,
      userId: ctx.user.id,
      action: AUDIT_ACTIONS.USER_UPDATE,
      entityType: AUDIT_ENTITY_TYPES.USER,
      entityId: data.newOwnerId,
      oldValues: { role: newOwner.role },
      newValues: { role: 'owner' },
      metadata: { action: 'ownership_transfer', transferredFrom: ctx.user.id },
    });

    return {
      success: true,
      previousOwner: {
        id: ctx.user.id,
        newRole: 'admin',
      },
      newOwner: {
        id: newOwner.id,
        email: newOwner.email,
        name: newOwner.name,
      },
    };
  });

// ============================================================================
// BULK UPDATE USERS
// ============================================================================

/**
 * Bulk update multiple users.
 * Requires: user.update permission
 */
export const bulkUpdateUsers = createServerFn({ method: 'POST' })
  .inputValidator(bulkUpdateServerSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.user.update });

    const { userIds, updates } = data;

    // Can't update to owner role via bulk
    if (updates.role === ('owner' as string)) {
      throw new ValidationError('Cannot bulk assign owner role');
    }

    // Verify all users belong to organization and aren't owners
    const targetUsers = await db
      .select({ id: users.id, role: users.role })
      .from(users)
      .where(
        and(
          inArray(users.id, userIds),
          eq(users.organizationId, ctx.organizationId),
          isNull(users.deletedAt)
        )
      );

    // Check for owners in the list
    const ownerInList = targetUsers.find((u) => u.role === 'owner');
    if (ownerInList) {
      throw new ValidationError('Cannot bulk update organization owner');
    }

    // Check for self in list
    const selfInList = targetUsers.find((u) => u.id === ctx.user.id);
    if (selfInList && updates.role) {
      throw new ValidationError('Cannot change your own role via bulk update');
    }

    const validUserIds = targetUsers.map((u) => u.id);

    if (validUserIds.length === 0) {
      return { updated: 0, failed: userIds.length };
    }

    // Build update (users table has no version column)
    const updateData: Record<string, unknown> = {
      updatedBy: ctx.user.id,
    };

    if (updates.role) updateData.role = updates.role;
    if (updates.status) updateData.status = updates.status;

    // Perform bulk update
    await db
      .update(users)
      .set(updateData)
      .where(inArray(users.id, validUserIds));

    // Log audit event for bulk update
    await logAuditEvent({
      organizationId: ctx.organizationId,
      userId: ctx.user.id,
      action: AUDIT_ACTIONS.USER_UPDATE,
      entityType: AUDIT_ENTITY_TYPES.USER,
      metadata: {
        bulk: true,
        userIds: validUserIds,
        updates,
        count: validUserIds.length,
      },
    });

    return {
      updated: validUserIds.length,
      failed: userIds.length - validUserIds.length,
    };
  });

// ============================================================================
// GET USER STATS
// ============================================================================

/**
 * Get user statistics for dashboard.
 * Requires: user.read permission
 */
export const getUserStats = createServerFn({ method: 'GET' }).handler(async () => {
  const ctx = await withAuth({ permission: PERMISSIONS.user.read });

  // Total users
  const [{ totalUsers }] = await db
    .select({ totalUsers: count() })
    .from(users)
    .where(and(eq(users.organizationId, ctx.organizationId), isNull(users.deletedAt)));

  // Users by status
  const statusCounts = await db
    .select({
      status: users.status,
      count: count(),
    })
    .from(users)
    .where(and(eq(users.organizationId, ctx.organizationId), isNull(users.deletedAt)))
    .groupBy(users.status);

  // Users by role
  const roleCounts = await db
    .select({
      role: users.role,
      count: count(),
    })
    .from(users)
    .where(and(eq(users.organizationId, ctx.organizationId), isNull(users.deletedAt)))
    .groupBy(users.role);

  return {
    totalUsers,
    byStatus: Object.fromEntries(statusCounts.map((s) => [s.status, s.count])),
    byRole: Object.fromEntries(roleCounts.map((r) => [r.role, r.count])),
  };
});

// ============================================================================
// EXPORT USERS
// ============================================================================

/**
 * Export users to JSON or CSV.
 * Requires: user.read permission
 */
export const exportUsers = createServerFn({ method: 'POST' })
  .inputValidator(exportUsersServerSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.user.read });

    const { format, userIds } = data;

    // Build conditions
    const conditions = [eq(users.organizationId, ctx.organizationId), isNull(users.deletedAt)];

    if (userIds && userIds.length > 0) {
      conditions.push(inArray(users.id, userIds));
    }

    // Get users
    const userList = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        role: users.role,
        status: users.status,
        type: users.type,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(and(...conditions))
      .orderBy(users.email)
      .limit(10000); // Safety limit

    // Log export
    await logAuditEvent({
      organizationId: ctx.organizationId,
      userId: ctx.user.id,
      action: AUDIT_ACTIONS.DATA_EXPORT,
      entityType: AUDIT_ENTITY_TYPES.USER,
      metadata: {
        format,
        count: userList.length,
        userIds: userIds ?? 'all',
      },
    });

    if (format === 'csv') {
      const headers = ['id', 'email', 'name', 'role', 'status', 'type', 'createdAt'];
      const rows = userList.map((u) => [
        u.id,
        u.email,
        u.name ?? '',
        u.role,
        u.status,
        u.type ?? '',
        u.createdAt.toISOString(),
      ]);

      return {
        format: 'csv',
        content: buildSafeCSV(headers, rows),
        count: userList.length,
      };
    }

    return {
      format: 'json',
      content: JSON.stringify(userList, null, 2),
      count: userList.length,
    };
  });

// ============================================================================
// LIST USER NAMES FOR LOOKUP
// ============================================================================

/**
 * Lightweight endpoint returning only {id, name, email} for all org users.
 * No pagination limit — used for user lookup maps (task assignment, file creators, etc.).
 * Returns up to 5000 users which covers any realistic organization size.
 */
export const listUserNamesForLookup = createServerFn({ method: 'GET' })
  .handler(async () => {
    const ctx = await withAuth();

    const items = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
      })
      .from(users)
      .where(
        and(
          eq(users.organizationId, ctx.organizationId),
          isNull(users.deletedAt),
        )
      )
      .orderBy(users.name)
      .limit(5000);

    return { items };
  });
