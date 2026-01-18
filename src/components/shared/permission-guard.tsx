/**
 * Permission Guard Component
 *
 * Conditionally renders children based on user permissions.
 * Uses the centralized permission matrix for authorization checks.
 *
 * @example
 * ```tsx
 * // Basic usage - hide if no permission
 * <PermissionGuard permission="customer.delete">
 *   <DeleteButton />
 * </PermissionGuard>
 *
 * // With fallback content
 * <PermissionGuard
 *   permission="report.export"
 *   fallback={<span>Export not available</span>}
 * >
 *   <ExportButton />
 * </PermissionGuard>
 *
 * // Multiple permissions (any)
 * <PermissionGuard
 *   permissions={['customer.create', 'customer.update']}
 *   requireAll={false}
 * >
 *   <EditForm />
 * </PermissionGuard>
 * ```
 */

import type { ReactNode } from 'react'
import {
  useHasPermission,
  useHasAnyPermission,
  useHasAllPermissions,
} from '@/hooks/use-has-permission'
import type { PermissionAction } from '@/lib/auth/permissions'

/**
 * Props for single permission check.
 */
interface SinglePermissionProps {
  /** Single permission to check */
  permission: PermissionAction
  permissions?: never
  requireAll?: never
}

/**
 * Props for multiple permission check.
 */
interface MultiplePermissionProps {
  permission?: never
  /** Multiple permissions to check */
  permissions: PermissionAction[]
  /** If true, requires all permissions. If false, requires any. Default: false */
  requireAll?: boolean
}

/**
 * Common props for PermissionGuard.
 */
interface CommonProps {
  /** Content to render when permission is granted */
  children: ReactNode
  /** Content to render when permission is denied. Default: null */
  fallback?: ReactNode
}

type PermissionGuardProps = CommonProps & (SinglePermissionProps | MultiplePermissionProps)

/**
 * Component that conditionally renders content based on user permissions.
 *
 * Uses the current user's role and the centralized permission matrix
 * to determine if content should be displayed.
 */
export function PermissionGuard(props: PermissionGuardProps) {
  const { children, fallback = null } = props

  // Determine which permission check to use
  const hasPermission = usePermissionCheck(props)

  if (hasPermission) {
    return <>{children}</>
  }

  return <>{fallback}</>
}

/**
 * Internal hook to handle both single and multiple permission checks.
 */
function usePermissionCheck(props: PermissionGuardProps): boolean {
  // Single permission
  if ('permission' in props && props.permission) {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    return useHasPermission(props.permission)
  }

  // Multiple permissions
  if ('permissions' in props && props.permissions) {
    const { permissions, requireAll = false } = props

    if (requireAll) {
      // eslint-disable-next-line react-hooks/rules-of-hooks
      return useHasAllPermissions(permissions)
    }

    // eslint-disable-next-line react-hooks/rules-of-hooks
    return useHasAnyPermission(permissions)
  }

  // No permissions specified - deny by default
  return false
}

/**
 * Export hooks for direct use outside of PermissionGuard.
 */
export { useHasPermission, useHasAnyPermission, useHasAllPermissions }
