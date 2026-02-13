'use server'

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

const SESSION_CONTEXT_CACHE_TTL_MS = 5_000
const MAX_SESSION_CONTEXT_CACHE_ENTRIES = 200

const sessionContextCache = new Map<string, { ctx: SessionContext; cachedAt: number }>()
const sessionContextInFlight = new Map<string, Promise<SessionContext>>()

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

  const cacheKey = getSessionContextCacheKey(request, authUser.id)
  const now = Date.now()
  const cached = sessionContextCache.get(cacheKey)
  if (cached && now - cached.cachedAt <= SESSION_CONTEXT_CACHE_TTL_MS) {
    return cached.ctx
  }

  const inFlight = sessionContextInFlight.get(cacheKey)
  if (inFlight) {
    return inFlight
  }

  const resolveContext = (async (): Promise<SessionContext> => {
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

    const ctx: SessionContext = {
      authUser: {
        id: authUser.id,
        email: authUser.email,
      },
      user: appUser as SessionContext['user'],
      role: appUser.role as Role,
      organizationId: appUser.organizationId,
    }

    writeSessionContextCache(cacheKey, ctx)
    return ctx
  })()

  sessionContextInFlight.set(cacheKey, resolveContext)
  try {
    return await resolveContext
  } finally {
    sessionContextInFlight.delete(cacheKey)
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

  // Configure connection context in one round-trip to reduce auth overhead.
  await db.execute(
    sql`SELECT set_config('app.organization_id', ${ctx.organizationId}, false), set_config('statement_timeout', '30s', false)`
  )

  return ctx
}

// ============================================================================
// API TOKEN AUTH (Agent/Programmatic Access)
// ============================================================================

/**
 * API token session context available after API token authentication.
 */
export interface ApiSessionContext {
  /** Token ID for audit/tracking */
  tokenId: string
  /** User who owns the token */
  userId: string
  /** Organization the token belongs to */
  organizationId: string
  /** Scopes granted to this token */
  scopes: import('@/lib/schemas/auth').ApiTokenScope[]
  /** Check if token has a specific scope */
  hasScope: (scope: import('@/lib/schemas/auth').ApiTokenScope) => boolean
}

/**
 * Options for withApiAuth.
 */
export interface WithApiAuthOptions {
  /** Required scope (e.g., 'read', 'write', 'admin') */
  requiredScope?: import('@/lib/schemas/auth').ApiTokenScope
}

/**
 * Validate API token authentication.
 * Call this at the start of any API-accessible server function handler.
 *
 * Expects `Authorization: Bearer renoz_xxx...` header.
 *
 * @param options - Optional auth options including required scope
 * @returns API session context with tokenId, userId, organizationId, and scopes
 * @throws AuthError if token is invalid, expired, or revoked
 * @throws PermissionDeniedError if required scope not granted
 *
 * @example
 * ```ts
 * // Basic API auth check
 * const ctx = await withApiAuth()
 *
 * // With scope check
 * const ctx = await withApiAuth({ requiredScope: 'write' })
 *
 * // Access context properties
 * console.log(ctx.organizationId) // for multi-tenant queries
 * console.log(ctx.hasScope('admin')) // check specific scope
 * ```
 */
export async function withApiAuth(options: WithApiAuthOptions = {}): Promise<ApiSessionContext> {
  const request = getRequest()
  const authHeader = request.headers.get('Authorization')

  if (!authHeader?.startsWith('Bearer ')) {
    throw new AuthError('API token required. Use Authorization: Bearer renoz_xxx...')
  }

  const token = authHeader.slice(7) // Remove 'Bearer ' prefix

  // Validate the token using the existing validateApiToken function
  const { validateApiToken, scopeIncludesPermission } = await import('./api-tokens')
  const tokenContext = await validateApiToken(token)
  if (!tokenContext) {
    throw new AuthError('Invalid or expired API token')
  }

  // Check required scope if specified
  if (options.requiredScope && !scopeIncludesPermission(tokenContext.scopes, options.requiredScope)) {
    throw new PermissionDeniedError(
      `Insufficient token scope. Required: ${options.requiredScope}, granted: ${tokenContext.scopes.join(', ')}`,
      options.requiredScope
    )
  }

  // Set RLS context for Row-Level Security policies
  await db.execute(
    sql`SELECT set_config('app.organization_id', ${tokenContext.organizationId}, false)`
  )

  // Set query timeout for this connection (30s default from LIMITS.API_TIMEOUT)
  // Prevents long-running queries from blocking database connections
  // Note: SET (without LOCAL) persists for the connection lifetime, which is fine
  // since connections are returned to pool after handler completes
  await db.execute(
    sql`SET statement_timeout = '30s'`
  )

  return {
    tokenId: tokenContext.tokenId,
    userId: tokenContext.userId,
    organizationId: tokenContext.organizationId,
    scopes: tokenContext.scopes,
    hasScope: tokenContext.hasScope,
  }
}

/**
 * Validate authentication via either Supabase JWT or API token.
 * Tries API token first (Bearer header), falls back to Supabase session.
 *
 * Useful for endpoints that should work for both humans and agents.
 *
 * @param options - Optional auth options
 * @returns Either SessionContext or ApiSessionContext
 *
 * @example
 * ```ts
 * const ctx = await withAnyAuth()
 * // ctx.organizationId works in both cases
 * // Use 'user' in ctx to check if human vs agent
 * if ('user' in ctx) {
 *   console.log('Human user:', ctx.user.email)
 * } else {
 *   console.log('API token:', ctx.tokenId)
 * }
 * ```
 */
export async function withAnyAuth(options: WithAuthOptions = {}): Promise<SessionContext | ApiSessionContext> {
  const request = getRequest()
  const authHeader = request.headers.get('Authorization')

  // Try API token first
  if (authHeader?.startsWith('Bearer renoz_')) {
    return withApiAuth({
      // Map permission to scope (simplified mapping)
      requiredScope: options.permission
        ? (options.permission.includes('create') || options.permission.includes('update') || options.permission.includes('delete')
          ? 'write' as const
          : 'read' as const)
        : undefined,
    })
  }

  // Fall back to Supabase session
  return withAuth(options)
}

function getSessionContextCacheKey(request: globalThis.Request, authUserId: string) {
  const cookieHeader = request.headers.get('Cookie') ?? ''
  const authHeader = request.headers.get('Authorization') ?? ''
  return `${authUserId}|${cookieHeader}|${authHeader}`
}

function writeSessionContextCache(key: string, ctx: SessionContext) {
  if (sessionContextCache.size >= MAX_SESSION_CONTEXT_CACHE_ENTRIES) {
    sessionContextCache.clear()
  }
  sessionContextCache.set(key, { ctx, cachedAt: Date.now() })
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
