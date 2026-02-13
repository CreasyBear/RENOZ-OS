/**
 * Route Authorization Guards
 *
 * Reusable route protection helpers for TanStack Router beforeLoad.
 * Use these in route definitions to restrict access by role.
 *
 * @example
 * ```tsx
 * import { requireAdmin } from "@/lib/auth/route-guards";
 *
 * export const Route = createFileRoute("/_authenticated/admin/settings")({
 *   beforeLoad: requireAdmin,
 *   component: AdminSettings,
 * });
 * ```
 */

import { redirect } from '@tanstack/react-router'
import type { Role } from './permissions'

// ============================================================================
// TYPES
// ============================================================================

interface RouteGuardResult {
  user: {
    id: string
    authId: string
    email: string
    role: Role
  }
}

type RouteGuardContext = {
  user?: {
    id: string
    email?: string | null
  }
  appUser?: {
    id: string
    role: string
  }
}

// ============================================================================
// CORE GUARD
// ============================================================================

/**
 * Require user to have one of the specified roles.
 * Redirects to /dashboard if role check fails.
 *
 * @param allowedRoles - Array of roles that are permitted
 * @param redirectTo - Where to redirect on failure (default: /dashboard)
 */
export async function requireRoles(
  allowedRoles: Role[],
  redirectTo = '/dashboard',
  opts?: { context?: RouteGuardContext }
): Promise<RouteGuardResult> {
  const authUser = opts?.context?.user
  const appUser = opts?.context?.appUser

  if (!authUser || !appUser) {
    throw redirect({ to: '/login', search: { redirect: undefined } })
  }

  // Check if user role is in allowed list
  if (!allowedRoles.includes(appUser.role as Role)) {
    throw redirect({ to: redirectTo })
  }

  return {
    user: {
      id: appUser.id,
      authId: authUser.id,
      email: authUser.email ?? '',
      role: appUser.role as Role,
    },
  }
}

// ============================================================================
// CONVENIENCE GUARDS
// ============================================================================

/**
 * Require admin or owner role.
 * Use for admin-only routes like analytics, settings, user management.
 */
export const requireAdmin = (opts: { context?: RouteGuardContext }) =>
  requireRoles(['owner', 'admin'], '/dashboard', opts)

/**
 * Require manager or higher role.
 * Use for routes that need elevated permissions but not full admin.
 */
export const requireManager = (opts: { context?: RouteGuardContext }) =>
  requireRoles(['owner', 'admin', 'manager'], '/dashboard', opts)

/**
 * Require any staff role (not viewer).
 * Use for routes that should exclude read-only users.
 */
export const requireStaff = (opts: { context?: RouteGuardContext }) =>
  requireRoles(['owner', 'admin', 'manager', 'sales', 'operations', 'support'], '/dashboard', opts)
