/**
 * Protected Server Function Utilities
 *
 * Provides auth validation and permission checking for TanStack Start server functions.
 * Uses a "call withAuth inside handler" pattern for simplicity and type safety.
 *
 * @example
 * ```ts
 * // Basic protected function (requires authentication)
 * const getMyProfile = createServerFn({ method: 'GET' })
 *   .handler(async () => {
 *     const ctx = await withAuth()
 *     return ctx.user
 *   })
 *
 * // With permission requirement
 * const createCustomer = createServerFn({ method: 'POST' })
 *   .inputValidator(createCustomerSchema)
 *   .handler(async ({ data }) => {
 *     const ctx = await withAuth({ permission: 'customer.create' })
 *     return db.insert(customers).values({ ...data, organizationId: ctx.organizationId })
 *   })
 * ```
 */

import { getRequest } from '@tanstack/react-start/server'
import { eq, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { users } from '../../../drizzle/schema'
import { getServerUser } from '@/lib/supabase/server'
import { hasPermission, type Role, type PermissionAction } from '@/lib/auth/permissions'
import { AuthError, PermissionDeniedError } from './errors'

// ============================================================================
// TYPES
// ============================================================================

/**
 * Session context available after authentication.
 */
export interface SessionContext {
  /** The Supabase auth user */
  authUser: {
    id: string
    email?: string
  }
  /** The application user from users table */
  user: {
    id: string
    authId: string
    email: string
    name: string | null
    role: Role
    status: string
    organizationId: string
  }
  /** User's role for permission checks */
  role: Role
  /** User's organization ID for multi-tenant queries */
  organizationId: string
}

/**
 * Options for withAuth.
 */
export interface WithAuthOptions {
  /** Required permission (e.g., 'customer.create') */
  permission?: PermissionAction
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get session context from the current request.
 * Validates JWT and fetches user data from database.
 *
 * @returns Session context with user, role, and organization
 * @throws AuthError if not authenticated
 */
export async function getSessionContext(): Promise<SessionContext> {
  // Get current request from TanStack Start context
  const request = getRequest()

  // Validate JWT and get Supabase auth user
  const authUser = await getServerUser(request)
  if (!authUser) {
    throw new AuthError('Authentication required')
  }

  // Fetch application user from database
  const [appUser] = await db
    .select({
      id: users.id,
      authId: users.authId,
      email: users.email,
      name: users.name,
      role: users.role,
      status: users.status,
      organizationId: users.organizationId,
    })
    .from(users)
    .where(eq(users.authId, authUser.id))
    .limit(1)

  if (!appUser) {
    throw new AuthError('User not found in application database')
  }

  if (appUser.status !== 'active') {
    throw new AuthError(`Account is ${appUser.status}. Please contact your administrator.`)
  }

  return {
    authUser: {
      id: authUser.id,
      email: authUser.email,
    },
    user: appUser as SessionContext['user'],
    role: appUser.role as Role,
    organizationId: appUser.organizationId,
  }
}

/**
 * Check if session has required permission.
 *
 * @param ctx - Session context
 * @param permission - Required permission action
 * @throws PermissionDeniedError if permission not granted
 */
export function requirePermission(ctx: SessionContext, permission: PermissionAction): void {
  if (!hasPermission(ctx.role, permission)) {
    throw new PermissionDeniedError(
      `Permission denied: ${permission} requires ${getRequiredRoles(permission).join(' or ')} role`,
      permission
    )
  }
}

/**
 * Get roles that have a specific permission.
 * Used for error messages.
 */
function getRequiredRoles(permission: PermissionAction): Role[] {
  const roles: Role[] = ['owner', 'admin', 'manager', 'sales', 'operations', 'support', 'viewer']
  return roles.filter((role) => hasPermission(role, permission))
}

// ============================================================================
// MAIN AUTH HELPER
// ============================================================================

/**
 * Validate authentication and optionally check permission.
 * Call this at the start of any protected server function handler.
 *
 * @param options - Optional auth options including required permission
 * @returns Session context with user, role, and organization
 * @throws AuthError if not authenticated
 * @throws PermissionDeniedError if permission not granted
 *
 * @example
 * ```ts
 * // Basic auth check
 * const ctx = await withAuth()
 *
 * // With permission check
 * const ctx = await withAuth({ permission: 'customer.create' })
 *
 * // Access context properties
 * console.log(ctx.user.email)
 * console.log(ctx.role) // 'admin', 'manager', etc.
 * console.log(ctx.organizationId) // for multi-tenant queries
 * ```
 */
export async function withAuth(options: WithAuthOptions = {}): Promise<SessionContext> {
  const ctx = await getSessionContext()

  if (options.permission) {
    requirePermission(ctx, options.permission)
  }

  // Set RLS context for Row-Level Security policies
  // This ensures RLS policies can check organization_id even if a query forgets to filter
  await db.execute(
    sql`SELECT set_config('app.organization_id', ${ctx.organizationId}, true)`
  )

  return ctx
}

// ============================================================================
// INTERNAL AUTH (Server-to-Server)
// ============================================================================

/**
 * Validate internal API secret for server-to-server calls.
 * Used by Trigger.dev tasks and other internal services.
 *
 * Expects `x-internal-secret` header to match INTERNAL_API_SECRET env var.
 *
 * @throws AuthError if secret is missing or invalid
 *
 * @example
 * ```ts
 * // In a Trigger.dev task
 * const createJobInternal = createServerFn({ method: 'POST' })
 *   .inputValidator(createJobSchema)
 *   .handler(async ({ data }) => {
 *     await withInternalAuth()
 *     // ... create job
 *   })
 * ```
 */
export async function withInternalAuth(): Promise<void> {
  const request = getRequest()
  const secret = request.headers.get('x-internal-secret')
  const expectedSecret = process.env.INTERNAL_API_SECRET

  if (!expectedSecret) {
    throw new AuthError('INTERNAL_API_SECRET environment variable not configured')
  }

  if (!secret || secret !== expectedSecret) {
    throw new AuthError('Invalid or missing internal API secret')
  }
}

// ============================================================================
// CONVENIENCE EXPORTS
// ============================================================================

export { AuthError, PermissionDeniedError } from './errors'
export type { PermissionAction } from '@/lib/auth/permissions'
