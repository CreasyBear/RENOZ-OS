/**
 * Auth Module Exports
 *
 * Re-exports all auth-related utilities and hooks.
 */

// Auth hooks with TanStack Query
export {
  authKeys,
  useSession,
  useUser,
  useAuth,
  useSignIn,
  useSignUp,
  useSignOut,
} from './hooks'

// Permission matrix and helpers
export {
  PERMISSIONS,
  ROLE_PERMISSIONS,
  hasPermission,
  getPermittedActions,
  hasAnyPermission,
  hasAllPermissions,
  getAllPermissions,
} from './permissions'

// Permission types
export type {
  Role,
  Permission,
  PermissionAction,
  RolePermissions,
} from './permissions'

// Route guards for TanStack Router beforeLoad
export {
  requireRoles,
  requireAdmin,
  requireManager,
  requireStaff,
} from './route-guards'
