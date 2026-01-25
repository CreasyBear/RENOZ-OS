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
import { z } from 'zod';
import { eq, and, desc, sql, ilike, or, isNull } from 'drizzle-orm';
import { cache } from 'react';
import { db } from '@/lib/db';
import { containsPattern } from '@/lib/db/utils';
import { users, userGroupMembers, userGroups, userSessions } from 'drizzle/schema';
import { createClient } from '@supabase/supabase-js';
import { withAuth } from '@/lib/server/protected';
import { PERMISSIONS } from '@/lib/auth/permissions';
import { userListQuerySchema, updateUserSchema } from '@/lib/schemas/auth';
import { idParamSchema } from '@/lib/schemas';
import { logAuditEvent } from '../_shared/audit-logs';
import { AUDIT_ACTIONS, AUDIT_ENTITY_TYPES } from 'drizzle/schema';
import { buildSafeCSV } from '@/lib/utils/csv-sanitize';

// ============================================================================
// HELPER: Get server-side Supabase admin client
// ============================================================================

function getServerSupabaseAdmin() {
  const url = process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error('Supabase environment variables not configured');
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
    console.error('Failed to terminate Supabase sessions:', error);
  }
}

// ============================================================================
// GET CURRENT USER (used by useCurrentUser hook)
// ============================================================================

/**
 * Get the current authenticated user's profile.
 * Requires: Authentication
 *
 * @performance Uses React.cache() for automatic request deduplication
 */
const _getCurrentUser = cache(async () => {
  const ctx = await withAuth();
  return ctx.user;
});

export const getCurrentUser = createServerFn({ method: 'GET' }).handler(_getCurrentUser);

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
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(users)
      .where(and(...conditions));

    return {
      items: userList,
      pagination: {
        page,
        pageSize,
        totalItems: count,
        totalPages: Math.ceil(count / pageSize),
      },
    };
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
      throw new Error('User not found');
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
      .where(eq(userGroupMembers.userId, data.id));

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
      throw new Error('User not found');
    }

    // Prevent demoting organization owners
    if (existingUser.role === 'owner' && updates.role && updates.role !== 'owner') {
      throw new Error('Cannot demote the organization owner');
    }

    // Build update object
    const updateData: Record<string, unknown> = {
      updatedBy: ctx.user.id,
      version: sql`version + 1`,
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
      .where(eq(users.id, id))
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
      throw new Error('User not found');
    }

    // Prevent deactivating organization owners
    if (existingUser.role === 'owner') {
      throw new Error('Cannot deactivate the organization owner');
    }

    // Prevent self-deactivation
    if (existingUser.id === ctx.user.id) {
      throw new Error('Cannot deactivate your own account');
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
      throw new Error('User not found');
    }

    if (existingUser.status !== 'deactivated') {
      throw new Error('User is not deactivated');
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

const transferOwnershipSchema = z.object({
  newOwnerId: z.string().uuid(),
});

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
      throw new Error('Only the organization owner can transfer ownership');
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
      throw new Error('Target user not found in your organization');
    }

    if (newOwner.status !== 'active') {
      throw new Error('Cannot transfer ownership to an inactive user');
    }

    if (newOwner.id === ctx.user.id) {
      throw new Error('You are already the owner');
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

const bulkUpdateSchema = z.object({
  userIds: z.array(z.string().uuid()).min(1).max(100),
  updates: z.object({
    role: z.enum(['admin', 'manager', 'sales', 'operations', 'support', 'viewer']).optional(),
    status: z.enum(['active', 'suspended']).optional(),
  }),
});

/**
 * Bulk update multiple users.
 * Requires: user.update permission
 */
export const bulkUpdateUsers = createServerFn({ method: 'POST' })
  .inputValidator(bulkUpdateSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.user.update });

    const { userIds, updates } = data;

    // Can't update to owner role via bulk
    if (updates.role === ('owner' as string)) {
      throw new Error('Cannot bulk assign owner role');
    }

    // Verify all users belong to organization and aren't owners
    const targetUsers = await db
      .select({ id: users.id, role: users.role })
      .from(users)
      .where(
        and(
          sql`${users.id} = ANY(${userIds}::uuid[])`,
          eq(users.organizationId, ctx.organizationId),
          isNull(users.deletedAt)
        )
      );

    // Check for owners in the list
    const ownerInList = targetUsers.find((u) => u.role === 'owner');
    if (ownerInList) {
      throw new Error('Cannot bulk update organization owner');
    }

    // Check for self in list
    const selfInList = targetUsers.find((u) => u.id === ctx.user.id);
    if (selfInList && updates.role) {
      throw new Error('Cannot change your own role via bulk update');
    }

    const validUserIds = targetUsers.map((u) => u.id);

    if (validUserIds.length === 0) {
      return { updated: 0, failed: userIds.length };
    }

    // Build update
    const updateData: Record<string, unknown> = {
      updatedBy: ctx.user.id,
      version: sql`version + 1`,
    };

    if (updates.role) updateData.role = updates.role;
    if (updates.status) updateData.status = updates.status;

    // Perform bulk update
    await db
      .update(users)
      .set(updateData)
      .where(sql`${users.id} = ANY(${validUserIds}::uuid[])`);

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
    .select({ totalUsers: sql<number>`count(*)::int` })
    .from(users)
    .where(and(eq(users.organizationId, ctx.organizationId), isNull(users.deletedAt)));

  // Users by status
  const statusCounts = await db
    .select({
      status: users.status,
      count: sql<number>`count(*)::int`,
    })
    .from(users)
    .where(and(eq(users.organizationId, ctx.organizationId), isNull(users.deletedAt)))
    .groupBy(users.status);

  // Users by role
  const roleCounts = await db
    .select({
      role: users.role,
      count: sql<number>`count(*)::int`,
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

const exportUsersSchema = z.object({
  format: z.enum(['json', 'csv']).default('csv'),
  userIds: z.array(z.string().uuid()).optional(), // If not provided, export all
});

/**
 * Export users to JSON or CSV.
 * Requires: user.read permission
 */
export const exportUsers = createServerFn({ method: 'POST' })
  .inputValidator(exportUsersSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.user.read });

    const { format, userIds } = data;

    // Build conditions
    const conditions = [eq(users.organizationId, ctx.organizationId), isNull(users.deletedAt)];

    if (userIds && userIds.length > 0) {
      conditions.push(sql`${users.id} = ANY(${userIds}::uuid[])`);
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
