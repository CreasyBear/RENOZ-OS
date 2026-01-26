/**
 * User Groups Server Functions
 *
 * Server functions for group and team management.
 * Supports creating groups, managing membership, and role assignment.
 *
 * @see drizzle/schema/user-groups.ts for database schema
 * @see src/lib/schemas/users.ts for validation schemas
 */

import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { eq, and, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { userGroups, userGroupMembers, users } from 'drizzle/schema';
import { withAuth } from '@/lib/server/protected';
import { PERMISSIONS } from '@/lib/auth/permissions';
import { NotFoundError, ConflictError } from '@/lib/server/errors';
import {
  createGroupSchema,
  updateGroupSchema,
  addGroupMemberSchema,
  updateGroupMemberRoleSchema,
  type Group,
  type GroupWithMemberCount,
  type GroupMember,
} from '@/lib/schemas/users';
import { idParamSchema, paginationSchema } from '@/lib/schemas';

// ============================================================================
// CREATE GROUP
// ============================================================================

/**
 * Create a new user group.
 * Requires: team.create permission
 */
export const createGroup = createServerFn({ method: 'POST' })
  .inputValidator(createGroupSchema)
  .handler(async ({ data }): Promise<Group> => {
    const ctx = await withAuth({ permission: PERMISSIONS.team.create });

    // Check for duplicate name
    const existing = await db
      .select({ id: userGroups.id })
      .from(userGroups)
      .where(
        and(
          eq(userGroups.organizationId, ctx.organizationId),
          eq(userGroups.name, data.name),
          sql`${userGroups.deletedAt} IS NULL`
        )
      )
      .limit(1);

    if (existing.length > 0) {
      throw new ConflictError('A group with this name already exists');
    }

    const [group] = await db
      .insert(userGroups)
      .values({
        organizationId: ctx.organizationId,
        name: data.name,
        description: data.description,
        color: data.color,
        createdBy: ctx.user.id,
        updatedBy: ctx.user.id,
      })
      .returning();

    return {
      id: group.id,
      organizationId: group.organizationId,
      name: group.name,
      description: group.description,
      color: group.color,
      isActive: group.isActive,
      createdAt: group.createdAt,
      updatedAt: group.updatedAt,
      createdBy: group.createdBy,
      updatedBy: group.updatedBy,
    };
  });

// ============================================================================
// LIST GROUPS
// ============================================================================

const listGroupsSchema = paginationSchema.extend({
  includeInactive: z.boolean().optional().default(false),
});

/**
 * List all groups in the organization.
 * Requires: team.read permission
 */
export const listGroups = createServerFn({ method: 'GET' })
  .inputValidator(listGroupsSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.team.read });

    const { page, pageSize, includeInactive } = data;
    const offset = (page - 1) * pageSize;

    // Build conditions
    const conditions = [
      eq(userGroups.organizationId, ctx.organizationId),
      sql`${userGroups.deletedAt} IS NULL`,
    ];
    if (!includeInactive) {
      conditions.push(eq(userGroups.isActive, true));
    }

    // Get groups with member count
    const groups = await db
      .select({
        id: userGroups.id,
        organizationId: userGroups.organizationId,
        name: userGroups.name,
        description: userGroups.description,
        color: userGroups.color,
        isActive: userGroups.isActive,
        createdAt: userGroups.createdAt,
        updatedAt: userGroups.updatedAt,
        createdBy: userGroups.createdBy,
        updatedBy: userGroups.updatedBy,
        memberCount: sql<number>`(
          SELECT COUNT(*)::int FROM user_group_members
          WHERE group_id = ${userGroups.id}
        )`.as('member_count'),
      })
      .from(userGroups)
      .where(and(...conditions))
      .orderBy(userGroups.name)
      .limit(pageSize)
      .offset(offset);

    // Get total count
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(userGroups)
      .where(and(...conditions));

    return {
      items: groups as GroupWithMemberCount[],
      pagination: {
        page,
        pageSize,
        totalItems: count,
        totalPages: Math.ceil(count / pageSize),
      },
    };
  });

// ============================================================================
// GET GROUP
// ============================================================================

/**
 * Get a single group by ID.
 * Requires: team.read permission
 */
export const getGroup = createServerFn({ method: 'GET' })
  .inputValidator(idParamSchema)
  .handler(async ({ data }): Promise<GroupWithMemberCount> => {
    const ctx = await withAuth({ permission: PERMISSIONS.team.read });

    const [group] = await db
      .select({
        id: userGroups.id,
        organizationId: userGroups.organizationId,
        name: userGroups.name,
        description: userGroups.description,
        color: userGroups.color,
        isActive: userGroups.isActive,
        createdAt: userGroups.createdAt,
        updatedAt: userGroups.updatedAt,
        createdBy: userGroups.createdBy,
        updatedBy: userGroups.updatedBy,
        memberCount: sql<number>`(
          SELECT COUNT(*)::int FROM user_group_members
          WHERE group_id = ${userGroups.id}
        )`.as('member_count'),
      })
      .from(userGroups)
      .where(
        and(
          eq(userGroups.id, data.id),
          eq(userGroups.organizationId, ctx.organizationId),
          sql`${userGroups.deletedAt} IS NULL`
        )
      )
      .limit(1);

    if (!group) {
      throw new NotFoundError('Group not found', 'group');
    }

    return group as GroupWithMemberCount;
  });

// ============================================================================
// UPDATE GROUP
// ============================================================================

const updateGroupInputSchema = idParamSchema.merge(z.object({ updates: updateGroupSchema }));

/**
 * Update a group.
 * Requires: team.update permission
 */
export const updateGroup = createServerFn({ method: 'POST' })
  .inputValidator(updateGroupInputSchema)
  .handler(async ({ data }): Promise<Group> => {
    const ctx = await withAuth({ permission: PERMISSIONS.team.update });

    // Verify group exists and belongs to organization
    const [existing] = await db
      .select({ id: userGroups.id })
      .from(userGroups)
      .where(
        and(
          eq(userGroups.id, data.id),
          eq(userGroups.organizationId, ctx.organizationId),
          sql`${userGroups.deletedAt} IS NULL`
        )
      )
      .limit(1);

    if (!existing) {
      throw new NotFoundError('Group not found', 'group');
    }

    // Check for duplicate name if changing name
    if (data.updates.name) {
      const duplicate = await db
        .select({ id: userGroups.id })
        .from(userGroups)
        .where(
          and(
            eq(userGroups.organizationId, ctx.organizationId),
            eq(userGroups.name, data.updates.name),
            sql`${userGroups.id} != ${data.id}`,
            sql`${userGroups.deletedAt} IS NULL`
          )
        )
        .limit(1);

      if (duplicate.length > 0) {
        throw new ConflictError('A group with this name already exists');
      }
    }

    const [updated] = await db
      .update(userGroups)
      .set({
        ...data.updates,
        updatedBy: ctx.user.id,
        version: sql`version + 1`,
      })
      .where(eq(userGroups.id, data.id))
      .returning();

    return {
      id: updated.id,
      organizationId: updated.organizationId,
      name: updated.name,
      description: updated.description,
      color: updated.color,
      isActive: updated.isActive,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
      createdBy: updated.createdBy,
      updatedBy: updated.updatedBy,
    };
  });

// ============================================================================
// DELETE GROUP (soft delete)
// ============================================================================

/**
 * Delete a group (soft delete).
 * Requires: team.delete permission
 */
export const deleteGroup = createServerFn({ method: 'POST' })
  .inputValidator(idParamSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.team.delete });

    // Verify group exists and belongs to organization
    const [existing] = await db
      .select({ id: userGroups.id })
      .from(userGroups)
      .where(
        and(
          eq(userGroups.id, data.id),
          eq(userGroups.organizationId, ctx.organizationId),
          sql`${userGroups.deletedAt} IS NULL`
        )
      )
      .limit(1);

    if (!existing) {
      throw new NotFoundError('Group not found', 'group');
    }

    // Soft delete group (members will be cascade deleted by FK)
    await db
      .update(userGroups)
      .set({
        deletedAt: new Date(),
        updatedBy: ctx.user.id,
        version: sql`version + 1`,
      })
      .where(eq(userGroups.id, data.id));

    // Also delete all memberships
    await db.delete(userGroupMembers).where(eq(userGroupMembers.groupId, data.id));

    return { success: true };
  });

// ============================================================================
// LIST GROUP MEMBERS
// ============================================================================

const listGroupMembersSchema = paginationSchema.extend({
  groupId: z.string().uuid(),
});

/**
 * List members of a group.
 * Requires: team.read permission
 */
export const listGroupMembers = createServerFn({ method: 'GET' })
  .inputValidator(listGroupMembersSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.team.read });

    const { groupId, page, pageSize } = data;
    const offset = (page - 1) * pageSize;

    // Verify group belongs to organization
    const [group] = await db
      .select({ id: userGroups.id })
      .from(userGroups)
      .where(and(eq(userGroups.id, groupId), eq(userGroups.organizationId, ctx.organizationId)))
      .limit(1);

    if (!group) {
      throw new NotFoundError('Group not found', 'group');
    }

    // Get members with user info
    const members = await db
      .select({
        id: userGroupMembers.id,
        groupId: userGroupMembers.groupId,
        userId: userGroupMembers.userId,
        role: userGroupMembers.role,
        joinedAt: userGroupMembers.joinedAt,
        addedBy: userGroupMembers.addedBy,
        user: {
          id: users.id,
          email: users.email,
          name: users.name,
          status: users.status,
        },
      })
      .from(userGroupMembers)
      .innerJoin(users, eq(userGroupMembers.userId, users.id))
      .where(eq(userGroupMembers.groupId, groupId))
      .orderBy(userGroupMembers.joinedAt)
      .limit(pageSize)
      .offset(offset);

    // Get total count
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(userGroupMembers)
      .where(eq(userGroupMembers.groupId, groupId));

    return {
      items: members as GroupMember[],
      pagination: {
        page,
        pageSize,
        totalItems: count,
        totalPages: Math.ceil(count / pageSize),
      },
    };
  });

// ============================================================================
// ADD GROUP MEMBER
// ============================================================================

/**
 * Add a user to a group.
 * Requires: team.update permission
 */
export const addGroupMember = createServerFn({ method: 'POST' })
  .inputValidator(addGroupMemberSchema)
  .handler(async ({ data }): Promise<GroupMember> => {
    const ctx = await withAuth({ permission: PERMISSIONS.team.update });

    // Verify group belongs to organization
    const [group] = await db
      .select({ id: userGroups.id })
      .from(userGroups)
      .where(
        and(eq(userGroups.id, data.groupId), eq(userGroups.organizationId, ctx.organizationId))
      )
      .limit(1);

    if (!group) {
      throw new NotFoundError('Group not found', 'group');
    }

    // Verify user belongs to same organization
    const [user] = await db
      .select({ id: users.id, email: users.email, name: users.name, status: users.status })
      .from(users)
      .where(and(eq(users.id, data.userId), eq(users.organizationId, ctx.organizationId)))
      .limit(1);

    if (!user) {
      throw new NotFoundError('User not found', 'user');
    }

    // Check if already a member
    const existing = await db
      .select({ id: userGroupMembers.id })
      .from(userGroupMembers)
      .where(
        and(eq(userGroupMembers.groupId, data.groupId), eq(userGroupMembers.userId, data.userId))
      )
      .limit(1);

    if (existing.length > 0) {
      throw new ConflictError('User is already a member of this group');
    }

    // Add member
    const [member] = await db
      .insert(userGroupMembers)
      .values({
        organizationId: ctx.organizationId,
        groupId: data.groupId,
        userId: data.userId,
        role: data.role,
        addedBy: ctx.user.id,
        createdBy: ctx.user.id,
      })
      .returning();

    return {
      id: member.id,
      groupId: member.groupId,
      userId: member.userId,
      role: member.role,
      joinedAt: member.joinedAt,
      addedBy: member.addedBy,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        status: user.status,
      },
    };
  });

// ============================================================================
// UPDATE MEMBER ROLE
// ============================================================================

/**
 * Update a member's role in a group.
 * Requires: team.update permission
 */
export const updateGroupMemberRole = createServerFn({ method: 'POST' })
  .inputValidator(updateGroupMemberRoleSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.team.update });

    // Verify membership exists and group belongs to organization
    const [membership] = await db
      .select({
        id: userGroupMembers.id,
        organizationId: userGroupMembers.organizationId,
      })
      .from(userGroupMembers)
      .where(
        and(
          eq(userGroupMembers.groupId, data.groupId),
          eq(userGroupMembers.userId, data.userId),
          eq(userGroupMembers.organizationId, ctx.organizationId)
        )
      )
      .limit(1);

    if (!membership) {
      throw new NotFoundError('Membership not found', 'membership');
    }

    // Update role
    await db
      .update(userGroupMembers)
      .set({
        role: data.role,
        updatedBy: ctx.user.id,
        version: sql`version + 1`,
      })
      .where(
        and(eq(userGroupMembers.groupId, data.groupId), eq(userGroupMembers.userId, data.userId))
      );

    return { success: true };
  });

// ============================================================================
// REMOVE GROUP MEMBER
// ============================================================================

const removeGroupMemberSchema = z.object({
  groupId: z.string().uuid(),
  userId: z.string().uuid(),
});

/**
 * Remove a user from a group.
 * Requires: team.update permission
 */
export const removeGroupMember = createServerFn({ method: 'POST' })
  .inputValidator(removeGroupMemberSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.team.update });

    // Verify membership exists and group belongs to organization
    const [membership] = await db
      .select({
        id: userGroupMembers.id,
        organizationId: userGroupMembers.organizationId,
      })
      .from(userGroupMembers)
      .where(
        and(
          eq(userGroupMembers.groupId, data.groupId),
          eq(userGroupMembers.userId, data.userId),
          eq(userGroupMembers.organizationId, ctx.organizationId)
        )
      )
      .limit(1);

    if (!membership) {
      throw new NotFoundError('Membership not found', 'membership');
    }

    // Remove member
    await db
      .delete(userGroupMembers)
      .where(
        and(eq(userGroupMembers.groupId, data.groupId), eq(userGroupMembers.userId, data.userId))
      );

    return { success: true };
  });

// ============================================================================
// GET USER'S GROUPS
// ============================================================================

/**
 * Get all groups a user belongs to.
 * Requires: team.read permission
 */
export const getUserGroups = createServerFn({ method: 'GET' })
  .inputValidator(idParamSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.team.read });

    // Verify user belongs to same organization
    const [user] = await db
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.id, data.id), eq(users.organizationId, ctx.organizationId)))
      .limit(1);

    if (!user) {
      throw new NotFoundError('User not found', 'user');
    }

    // Get user's groups with their role in each
    const groups = await db
      .select({
        id: userGroups.id,
        name: userGroups.name,
        description: userGroups.description,
        color: userGroups.color,
        isActive: userGroups.isActive,
        memberRole: userGroupMembers.role,
        joinedAt: userGroupMembers.joinedAt,
      })
      .from(userGroupMembers)
      .innerJoin(userGroups, eq(userGroupMembers.groupId, userGroups.id))
      .where(and(eq(userGroupMembers.userId, data.id), sql`${userGroups.deletedAt} IS NULL`))
      .orderBy(userGroups.name);

    return groups;
  });
