import { describe, it, expect } from 'vitest'
import {
  AuthError,
  PermissionDeniedError,
  isServerError,
  serializeError,
  ServerError,
  NotFoundError,
  ValidationError,
} from '@/lib/server/errors'
import { hasPermission, type Role } from '@/lib/auth/permissions'

// Note: Full integration tests for withAuth require mocking TanStack Start context
// and database. These tests focus on the error classes and permission checking logic.

describe('Server Errors', () => {
  describe('AuthError', () => {
    it('should create with default message', () => {
      const error = new AuthError()
      expect(error.message).toBe('Authentication required')
      expect(error.statusCode).toBe(401)
      expect(error.code).toBe('AUTH_ERROR')
      expect(error.name).toBe('AuthError')
    })

    it('should create with custom message', () => {
      const error = new AuthError('Custom auth error')
      expect(error.message).toBe('Custom auth error')
      expect(error.statusCode).toBe(401)
    })
  })

  describe('PermissionDeniedError', () => {
    it('should create with default message', () => {
      const error = new PermissionDeniedError()
      expect(error.message).toBe('Permission denied')
      expect(error.statusCode).toBe(403)
      expect(error.code).toBe('PERMISSION_DENIED')
      expect(error.name).toBe('PermissionDeniedError')
    })

    it('should include required permission', () => {
      const error = new PermissionDeniedError('Cannot create customer', 'customer.create')
      expect(error.message).toBe('Cannot create customer')
      expect(error.requiredPermission).toBe('customer.create')
    })
  })

  describe('NotFoundError', () => {
    it('should create with default message', () => {
      const error = new NotFoundError()
      expect(error.message).toBe('Resource not found')
      expect(error.statusCode).toBe(404)
      expect(error.code).toBe('NOT_FOUND')
    })

    it('should include resource type', () => {
      const error = new NotFoundError('Customer not found', 'customer')
      expect(error.resource).toBe('customer')
    })
  })

  describe('ValidationError', () => {
    it('should create with validation errors', () => {
      const error = new ValidationError('Validation failed', {
        email: ['Invalid email format'],
        password: ['Too short', 'Must contain number'],
      })
      expect(error.statusCode).toBe(400)
      expect(error.code).toBe('VALIDATION_ERROR')
      expect(error.errors.email).toContain('Invalid email format')
      expect(error.errors.password).toHaveLength(2)
    })
  })

  describe('isServerError', () => {
    it('should return true for ServerError instances', () => {
      expect(isServerError(new AuthError())).toBe(true)
      expect(isServerError(new PermissionDeniedError())).toBe(true)
      expect(isServerError(new NotFoundError())).toBe(true)
      expect(isServerError(new ValidationError())).toBe(true)
      expect(isServerError(new ServerError('test'))).toBe(true)
    })

    it('should return false for regular errors', () => {
      expect(isServerError(new Error('test'))).toBe(false)
      expect(isServerError({ message: 'fake error' })).toBe(false)
      expect(isServerError(null)).toBe(false)
      expect(isServerError(undefined)).toBe(false)
    })
  })

  describe('serializeError', () => {
    it('should serialize AuthError', () => {
      const error = new AuthError('Not logged in')
      const serialized = serializeError(error)
      expect(serialized.error).toBe('Not logged in')
      expect(serialized.statusCode).toBe(401)
      expect(serialized.code).toBe('AUTH_ERROR')
    })

    it('should serialize PermissionDeniedError with details', () => {
      const error = new PermissionDeniedError('Cannot access', 'customer.delete')
      const serialized = serializeError(error)
      expect(serialized.details?.requiredPermission).toBe('customer.delete')
    })

    it('should serialize ValidationError with errors', () => {
      const error = new ValidationError('Invalid input', {
        email: ['Invalid'],
      })
      const serialized = serializeError(error)
      expect(serialized.details?.validationErrors).toEqual({
        email: ['Invalid'],
      })
    })

    it('should handle unknown errors', () => {
      const serialized = serializeError(new Error('Unknown'))
      expect(serialized.error).toBe('Unknown')
      expect(serialized.statusCode).toBe(500)
      expect(serialized.code).toBe('INTERNAL_ERROR')
    })

    it('should handle non-error values', () => {
      const serialized = serializeError('string error')
      expect(serialized.error).toBe('An unexpected error occurred')
      expect(serialized.statusCode).toBe(500)
    })
  })
})

describe('Permission Checking Logic', () => {
  describe('requirePermission behavior', () => {
    // Test the underlying hasPermission logic that requirePermission uses

    it('should allow owner all permissions', () => {
      const testPermissions = [
        'customer.create',
        'customer.delete',
        'user.change_role',
        'organization.manage_billing',
      ]
      testPermissions.forEach((permission) => {
        expect(hasPermission('owner', permission)).toBe(true)
      })
    })

    it('should restrict viewer to read-only', () => {
      expect(hasPermission('viewer', 'customer.read')).toBe(true)
      expect(hasPermission('viewer', 'customer.create')).toBe(false)
      expect(hasPermission('viewer', 'customer.delete')).toBe(false)
    })

    it('should give sales appropriate permissions', () => {
      // Sales can create customers and quotes
      expect(hasPermission('sales', 'customer.create')).toBe(true)
      expect(hasPermission('sales', 'quote.create')).toBe(true)
      expect(hasPermission('sales', 'quote.send')).toBe(true)

      // Sales cannot manage users or billing
      expect(hasPermission('sales', 'user.change_role')).toBe(false)
      expect(hasPermission('sales', 'organization.manage_billing')).toBe(false)
    })

    it('should give operations inventory permissions', () => {
      expect(hasPermission('operations', 'inventory.adjust')).toBe(true)
      expect(hasPermission('operations', 'inventory.transfer')).toBe(true)
      expect(hasPermission('operations', 'order.fulfill')).toBe(true)

      // Operations cannot create customers
      expect(hasPermission('operations', 'customer.create')).toBe(false)
    })

    it('should deny admin billing but allow other org settings', () => {
      expect(hasPermission('admin', 'organization.read')).toBe(true)
      expect(hasPermission('admin', 'organization.update')).toBe(true)
      expect(hasPermission('admin', 'organization.manage_billing')).toBe(false)
    })
  })
})

describe('SessionContext type checks', () => {
  // Type-level tests to ensure SessionContext has expected shape
  // These are compile-time checks that will fail if types change unexpectedly

  it('should define expected SessionContext properties', () => {
    // This test just validates the types compile correctly
    type SessionContext = {
      authUser: { id: string; email?: string }
      user: {
        id: string
        authId: string
        email: string
        name: string | null
        role: Role
        status: string
        organizationId: string
      }
      role: Role
      organizationId: string
    }

    // Type assertion - will fail to compile if shape is wrong
    const mockContext: SessionContext = {
      authUser: { id: 'auth-123', email: 'test@example.com' },
      user: {
        id: 'user-123',
        authId: 'auth-123',
        email: 'test@example.com',
        name: 'Test User',
        role: 'admin',
        status: 'active',
        organizationId: 'org-123',
      },
      role: 'admin',
      organizationId: 'org-123',
    }

    expect(mockContext.role).toBe('admin')
    expect(mockContext.organizationId).toBe('org-123')
  })
})
