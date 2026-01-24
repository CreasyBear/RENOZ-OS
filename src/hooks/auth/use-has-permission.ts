/**
 * Permission Check Hook
 *
 * Checks if the current user has a specific permission based on their role.
 * Uses the centralized permission matrix from @/lib/auth/permissions.
 *
 * @example
 * ```tsx
 * function DeleteButton({ customerId }: { customerId: string }) {
 *   const canDelete = useHasPermission('customer.delete')
 *
 *   if (!canDelete) return null
 *
 *   return <Button onClick={() => deleteCustomer(customerId)}>Delete</Button>
 * }
 * ```
 */

import { useMemo } from 'react';
import { useCurrentUser } from './use-current-user';
import {
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  type PermissionAction,
  type Role,
} from '@/lib/auth/permissions';

/**
 * Check if the current user has a specific permission.
 *
 * @param permission - The permission to check (e.g., 'customer.create')
 * @returns true if the user has the permission, false otherwise
 *
 * @example
 * ```tsx
 * const canCreate = useHasPermission('customer.create')
 * const canExport = useHasPermission(PERMISSIONS.report.export)
 * ```
 */
export function useHasPermission(permission: PermissionAction): boolean {
  const { user: currentUser } = useCurrentUser();

  return useMemo(() => {
    if (!currentUser?.role) {
      return false;
    }
    return hasPermission(currentUser.role as Role, permission);
  }, [currentUser, permission]);
}

/**
 * Check if the current user has any of the specified permissions.
 *
 * @param permissions - Array of permissions to check
 * @returns true if the user has at least one of the permissions
 *
 * @example
 * ```tsx
 * const canManageCustomers = useHasAnyPermission([
 *   'customer.create',
 *   'customer.update',
 *   'customer.delete',
 * ])
 * ```
 */
export function useHasAnyPermission(permissions: PermissionAction[]): boolean {
  const { user: currentUser } = useCurrentUser();

  return useMemo(() => {
    if (!currentUser?.role) {
      return false;
    }
    return hasAnyPermission(currentUser.role as Role, permissions);
  }, [currentUser, permissions]);
}

/**
 * Check if the current user has all of the specified permissions.
 *
 * @param permissions - Array of permissions to check
 * @returns true if the user has all of the permissions
 *
 * @example
 * ```tsx
 * const canFullyManageCustomers = useHasAllPermissions([
 *   'customer.create',
 *   'customer.read',
 *   'customer.update',
 *   'customer.delete',
 * ])
 * ```
 */
export function useHasAllPermissions(permissions: PermissionAction[]): boolean {
  const { user: currentUser } = useCurrentUser();

  return useMemo(() => {
    if (!currentUser?.role) {
      return false;
    }
    return hasAllPermissions(currentUser.role as Role, permissions);
  }, [currentUser, permissions]);
}
