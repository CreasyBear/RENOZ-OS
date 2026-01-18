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

import { redirect } from "@tanstack/react-router";
import { supabase } from "@/lib/supabase/client";
import type { Role } from "./permissions";

// ============================================================================
// TYPES
// ============================================================================

interface RouteGuardResult {
  user: {
    id: string;
    authId: string;
    email: string;
    role: Role;
  };
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
  redirectTo = "/dashboard"
): Promise<RouteGuardResult> {
  // Get current session
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    throw redirect({ to: "/login" });
  }

  // Fetch user role from users table
  const { data: user, error } = await supabase
    .from("users")
    .select("id, auth_id, email, role")
    .eq("auth_id", session.user.id)
    .single();

  if (error || !user) {
    console.error("Failed to fetch user for route guard:", error);
    throw redirect({ to: "/login" });
  }

  // Check if user role is in allowed list
  if (!allowedRoles.includes(user.role as Role)) {
    throw redirect({ to: redirectTo });
  }

  return {
    user: {
      id: user.id,
      authId: user.auth_id,
      email: user.email,
      role: user.role as Role,
    },
  };
}

// ============================================================================
// CONVENIENCE GUARDS
// ============================================================================

/**
 * Require admin or owner role.
 * Use for admin-only routes like analytics, settings, user management.
 */
export const requireAdmin = () => requireRoles(["owner", "admin"]);

/**
 * Require manager or higher role.
 * Use for routes that need elevated permissions but not full admin.
 */
export const requireManager = () =>
  requireRoles(["owner", "admin", "manager"]);

/**
 * Require any staff role (not viewer).
 * Use for routes that should exclude read-only users.
 */
export const requireStaff = () =>
  requireRoles(["owner", "admin", "manager", "sales", "operations", "support"]);
