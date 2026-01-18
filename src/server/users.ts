/**
 * User Server Functions
 *
 * Protected server functions for user management using the withAuth pattern.
 * Demonstrates authentication and permission checking.
 */

import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { users } from '../../drizzle/schema'
import { withAuth } from '@/lib/server/protected'
import { PERMISSIONS } from '@/lib/auth/permissions'

// ============================================================================
// GET CURRENT USER PROFILE
// ============================================================================

/**
 * Get the current authenticated user's profile.
 * Requires: Authentication
 */
export const getCurrentUser = createServerFn({ method: 'GET' }).handler(async () => {
  const ctx = await withAuth()
  return ctx.user
})

// ============================================================================
// LIST ORGANIZATION USERS
// ============================================================================

const listUsersSchema = z.object({
  page: z.number().int().positive().default(1),
  pageSize: z.number().int().positive().max(100).default(20),
})

/**
 * List all users in the current organization.
 * Requires: Authentication + user.read permission
 */
export const listOrganizationUsers = createServerFn({ method: 'GET' })
  .inputValidator(listUsersSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.user.read })

    const { page, pageSize } = data
    const offset = (page - 1) * pageSize

    // Get users in same organization
    const orgUsers = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        role: users.role,
        status: users.status,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.organizationId, ctx.organizationId))
      .limit(pageSize)
      .offset(offset)

    return {
      users: orgUsers,
      pagination: {
        page,
        pageSize,
        // Note: Total count would require a separate query
      },
    }
  })

// ============================================================================
// UPDATE USER ROLE
// ============================================================================

const updateUserRoleSchema = z.object({
  userId: z.string().uuid(),
  role: z.enum(['admin', 'manager', 'sales', 'operations', 'support', 'viewer']),
})

/**
 * Update a user's role within the organization.
 * Requires: Authentication + user.change_role permission
 *
 * Note: Cannot change own role or promote to owner.
 */
export const updateUserRole = createServerFn({ method: 'POST' })
  .inputValidator(updateUserRoleSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.user.changeRole })

    const { userId, role } = data

    // Prevent self-role change
    if (userId === ctx.user.id) {
      throw new Error('Cannot change your own role')
    }

    // Verify target user is in same organization
    const [targetUser] = await db
      .select({ id: users.id, organizationId: users.organizationId })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1)

    if (!targetUser) {
      throw new Error('User not found')
    }

    if (targetUser.organizationId !== ctx.organizationId) {
      throw new Error('User not found') // Don't leak existence of users in other orgs
    }

    // Update role
    const [updated] = await db
      .update(users)
      .set({ role, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning({
        id: users.id,
        email: users.email,
        role: users.role,
      })

    return updated
  })
