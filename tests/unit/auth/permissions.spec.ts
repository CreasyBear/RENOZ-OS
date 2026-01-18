import { describe, it, expect } from 'vitest'
import {
  PERMISSIONS,
  ROLE_PERMISSIONS,
  hasPermission,
  getPermittedActions,
  hasAnyPermission,
  hasAllPermissions,
  getAllPermissions,
  type Role,
} from '@/lib/auth/permissions'

describe('Permission Matrix', () => {
  describe('PERMISSIONS constant', () => {
    it('should have at least 20 permissions', () => {
      const allPermissions = getAllPermissions()
      expect(allPermissions.length).toBeGreaterThanOrEqual(20)
    })

    it('should have all required domains', () => {
      const expectedDomains = [
        'customer',
        'contact',
        'order',
        'product',
        'inventory',
        'opportunity',
        'quote',
        'user',
        'organization',
        'report',
        'apiToken',
      ]

      expectedDomains.forEach((domain) => {
        expect(PERMISSIONS).toHaveProperty(domain)
      })
    })

    it('should have customer CRUD permissions', () => {
      expect(PERMISSIONS.customer.create).toBe('customer.create')
      expect(PERMISSIONS.customer.read).toBe('customer.read')
      expect(PERMISSIONS.customer.update).toBe('customer.update')
      expect(PERMISSIONS.customer.delete).toBe('customer.delete')
    })

    it('should have order-specific permissions', () => {
      expect(PERMISSIONS.order.fulfill).toBe('order.fulfill')
      expect(PERMISSIONS.order.cancel).toBe('order.cancel')
    })
  })

  describe('ROLE_PERMISSIONS', () => {
    it('should define all 7 roles', () => {
      const expectedRoles: Role[] = [
        'owner',
        'admin',
        'manager',
        'sales',
        'operations',
        'support',
        'viewer',
      ]

      expectedRoles.forEach((role) => {
        expect(ROLE_PERMISSIONS).toHaveProperty(role)
        expect(Array.isArray(ROLE_PERMISSIONS[role])).toBe(true)
      })
    })

    it('should give owner all permissions', () => {
      const allPermissions = getAllPermissions()
      const ownerPermissions = ROLE_PERMISSIONS.owner

      allPermissions.forEach((permission) => {
        expect(ownerPermissions).toContain(permission)
      })
    })

    it('should give viewer only read permissions', () => {
      const viewerPermissions = ROLE_PERMISSIONS.viewer

      viewerPermissions.forEach((permission) => {
        expect(permission).toMatch(/\.read$/)
      })
    })

    it('should not give admin billing access', () => {
      const adminPermissions = ROLE_PERMISSIONS.admin
      expect(adminPermissions).not.toContain(PERMISSIONS.organization.manageBilling)
    })
  })

  describe('hasPermission', () => {
    it('should return true when role has permission', () => {
      expect(hasPermission('owner', PERMISSIONS.customer.create)).toBe(true)
      expect(hasPermission('admin', PERMISSIONS.customer.create)).toBe(true)
      expect(hasPermission('sales', PERMISSIONS.customer.create)).toBe(true)
    })

    it('should return false when role lacks permission', () => {
      expect(hasPermission('viewer', PERMISSIONS.customer.create)).toBe(false)
      expect(hasPermission('support', PERMISSIONS.customer.delete)).toBe(false)
    })

    it('should return false for invalid role', () => {
      expect(hasPermission('invalid' as Role, PERMISSIONS.customer.create)).toBe(false)
    })
  })

  describe('getPermittedActions', () => {
    it('should return all permissions for owner', () => {
      const ownerActions = getPermittedActions('owner')
      const allPermissions = getAllPermissions()

      expect(ownerActions.length).toBe(allPermissions.length)
    })

    it('should return limited permissions for viewer', () => {
      const viewerActions = getPermittedActions('viewer')
      expect(viewerActions.length).toBeLessThan(getAllPermissions().length)
    })

    it('should return empty array for invalid role', () => {
      expect(getPermittedActions('invalid' as Role)).toEqual([])
    })
  })

  describe('hasAnyPermission', () => {
    it('should return true if role has at least one permission', () => {
      const result = hasAnyPermission('sales', [
        PERMISSIONS.customer.delete, // sales doesn't have this
        PERMISSIONS.customer.create, // sales has this
      ])
      expect(result).toBe(true)
    })

    it('should return false if role has none of the permissions', () => {
      const result = hasAnyPermission('viewer', [
        PERMISSIONS.customer.create,
        PERMISSIONS.customer.delete,
      ])
      expect(result).toBe(false)
    })
  })

  describe('hasAllPermissions', () => {
    it('should return true if role has all permissions', () => {
      const result = hasAllPermissions('owner', [
        PERMISSIONS.customer.create,
        PERMISSIONS.customer.read,
        PERMISSIONS.customer.delete,
      ])
      expect(result).toBe(true)
    })

    it('should return false if role lacks any permission', () => {
      const result = hasAllPermissions('sales', [
        PERMISSIONS.customer.create, // sales has this
        PERMISSIONS.customer.delete, // sales doesn't have this
      ])
      expect(result).toBe(false)
    })
  })

  describe('Role hierarchy behavior', () => {
    it('manager should have user.read but not user.invite', () => {
      expect(hasPermission('manager', PERMISSIONS.user.read)).toBe(true)
      expect(hasPermission('manager', PERMISSIONS.user.invite)).toBe(false)
    })

    it('operations should have inventory permissions but not customer.create', () => {
      expect(hasPermission('operations', PERMISSIONS.inventory.adjust)).toBe(true)
      expect(hasPermission('operations', PERMISSIONS.inventory.transfer)).toBe(true)
      expect(hasPermission('operations', PERMISSIONS.customer.create)).toBe(false)
    })

    it('support should have limited update but no delete', () => {
      expect(hasPermission('support', PERMISSIONS.customer.update)).toBe(true)
      expect(hasPermission('support', PERMISSIONS.customer.delete)).toBe(false)
    })

    it('sales should have API token permissions', () => {
      expect(hasPermission('sales', PERMISSIONS.apiToken.create)).toBe(true)
      expect(hasPermission('sales', PERMISSIONS.apiToken.read)).toBe(true)
      expect(hasPermission('sales', PERMISSIONS.apiToken.revoke)).toBe(true)
    })
  })
})
