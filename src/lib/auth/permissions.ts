/**
 * Centralized Permission Matrix
 *
 * Single source of truth for all role-to-action mappings.
 * All permission checks should use the helpers from this module.
 *
 * @see _Initiation/_prd/1-foundation/patterns/canonical-enums.json for role values
 */

// ============================================================================
// TYPES
// ============================================================================

/**
 * User roles matching canonical-enums.json#/enums/userRole
 */
export type Role = 'owner' | 'admin' | 'manager' | 'sales' | 'operations' | 'support' | 'viewer'

/**
 * Permission action format: 'domain.action'
 */
export type PermissionAction = string

/**
 * Permission definition with optional description
 */
export interface Permission {
  action: PermissionAction
  description?: string
}

/**
 * Mapping of roles to their permitted actions
 */
export type RolePermissions = Record<Role, PermissionAction[]>

// ============================================================================
// PERMISSIONS BY DOMAIN
// ============================================================================

/**
 * All permissions organized by domain.
 * Format: 'domain.action' (e.g., 'customer.create')
 */
export const PERMISSIONS = {
  // Customer domain
  customer: {
    create: 'customer.create',
    read: 'customer.read',
    update: 'customer.update',
    delete: 'customer.delete',
    export: 'customer.export',
    import: 'customer.import',
  },

  // Contact domain
  contact: {
    create: 'contact.create',
    read: 'contact.read',
    update: 'contact.update',
    delete: 'contact.delete',
  },

  // Order domain
  order: {
    create: 'order.create',
    read: 'order.read',
    update: 'order.update',
    delete: 'order.delete',
    fulfill: 'order.fulfill',
    cancel: 'order.cancel',
    export: 'order.export',
  },

  // Product domain
  product: {
    create: 'product.create',
    read: 'product.read',
    update: 'product.update',
    delete: 'product.delete',
    managePricing: 'product.manage_pricing',
  },

  // Inventory domain
  inventory: {
    read: 'inventory.read',
    adjust: 'inventory.adjust',
    transfer: 'inventory.transfer',
    receive: 'inventory.receive',
  },

  // Pipeline/Opportunity domain
  opportunity: {
    create: 'opportunity.create',
    read: 'opportunity.read',
    update: 'opportunity.update',
    delete: 'opportunity.delete',
    assign: 'opportunity.assign',
  },

  // Quote domain
  quote: {
    create: 'quote.create',
    read: 'quote.read',
    update: 'quote.update',
    delete: 'quote.delete',
    send: 'quote.send',
    approve: 'quote.approve',
  },

  // User management domain
  user: {
    read: 'user.read',
    invite: 'user.invite',
    update: 'user.update',
    deactivate: 'user.deactivate',
    changeRole: 'user.change_role',
  },

  // Organization/Settings domain
  organization: {
    read: 'organization.read',
    update: 'organization.update',
    manageBilling: 'organization.manage_billing',
    manageIntegrations: 'organization.manage_integrations',
  },

  // Reports domain
  report: {
    viewSales: 'report.view_sales',
    viewFinancial: 'report.view_financial',
    viewOperations: 'report.view_operations',
    export: 'report.export',
  },

  // API Token domain
  apiToken: {
    create: 'api_token.create',
    read: 'api_token.read',
    revoke: 'api_token.revoke',
  },

  // Activity/Audit Trail domain
  activity: {
    read: 'activity.read',
    export: 'activity.export',
  },
} as const

// ============================================================================
// ROLE PERMISSIONS MATRIX
// ============================================================================

/**
 * Maps each role to its allowed actions.
 * Roles inherit nothing by default - each role's permissions are explicit.
 */
export const ROLE_PERMISSIONS: RolePermissions = {
  // Owner: Full access to everything
  owner: [
    // Customer
    PERMISSIONS.customer.create,
    PERMISSIONS.customer.read,
    PERMISSIONS.customer.update,
    PERMISSIONS.customer.delete,
    PERMISSIONS.customer.export,
    PERMISSIONS.customer.import,
    // Contact
    PERMISSIONS.contact.create,
    PERMISSIONS.contact.read,
    PERMISSIONS.contact.update,
    PERMISSIONS.contact.delete,
    // Order
    PERMISSIONS.order.create,
    PERMISSIONS.order.read,
    PERMISSIONS.order.update,
    PERMISSIONS.order.delete,
    PERMISSIONS.order.fulfill,
    PERMISSIONS.order.cancel,
    PERMISSIONS.order.export,
    // Product
    PERMISSIONS.product.create,
    PERMISSIONS.product.read,
    PERMISSIONS.product.update,
    PERMISSIONS.product.delete,
    PERMISSIONS.product.managePricing,
    // Inventory
    PERMISSIONS.inventory.read,
    PERMISSIONS.inventory.adjust,
    PERMISSIONS.inventory.transfer,
    PERMISSIONS.inventory.receive,
    // Opportunity
    PERMISSIONS.opportunity.create,
    PERMISSIONS.opportunity.read,
    PERMISSIONS.opportunity.update,
    PERMISSIONS.opportunity.delete,
    PERMISSIONS.opportunity.assign,
    // Quote
    PERMISSIONS.quote.create,
    PERMISSIONS.quote.read,
    PERMISSIONS.quote.update,
    PERMISSIONS.quote.delete,
    PERMISSIONS.quote.send,
    PERMISSIONS.quote.approve,
    // User
    PERMISSIONS.user.read,
    PERMISSIONS.user.invite,
    PERMISSIONS.user.update,
    PERMISSIONS.user.deactivate,
    PERMISSIONS.user.changeRole,
    // Organization
    PERMISSIONS.organization.read,
    PERMISSIONS.organization.update,
    PERMISSIONS.organization.manageBilling,
    PERMISSIONS.organization.manageIntegrations,
    // Reports
    PERMISSIONS.report.viewSales,
    PERMISSIONS.report.viewFinancial,
    PERMISSIONS.report.viewOperations,
    PERMISSIONS.report.export,
    // API Token
    PERMISSIONS.apiToken.create,
    PERMISSIONS.apiToken.read,
    PERMISSIONS.apiToken.revoke,
    // Activity (audit trail)
    PERMISSIONS.activity.read,
    PERMISSIONS.activity.export,
  ],

  // Admin: Almost full access, except billing
  admin: [
    // Customer
    PERMISSIONS.customer.create,
    PERMISSIONS.customer.read,
    PERMISSIONS.customer.update,
    PERMISSIONS.customer.delete,
    PERMISSIONS.customer.export,
    PERMISSIONS.customer.import,
    // Contact
    PERMISSIONS.contact.create,
    PERMISSIONS.contact.read,
    PERMISSIONS.contact.update,
    PERMISSIONS.contact.delete,
    // Order
    PERMISSIONS.order.create,
    PERMISSIONS.order.read,
    PERMISSIONS.order.update,
    PERMISSIONS.order.delete,
    PERMISSIONS.order.fulfill,
    PERMISSIONS.order.cancel,
    PERMISSIONS.order.export,
    // Product
    PERMISSIONS.product.create,
    PERMISSIONS.product.read,
    PERMISSIONS.product.update,
    PERMISSIONS.product.delete,
    PERMISSIONS.product.managePricing,
    // Inventory
    PERMISSIONS.inventory.read,
    PERMISSIONS.inventory.adjust,
    PERMISSIONS.inventory.transfer,
    PERMISSIONS.inventory.receive,
    // Opportunity
    PERMISSIONS.opportunity.create,
    PERMISSIONS.opportunity.read,
    PERMISSIONS.opportunity.update,
    PERMISSIONS.opportunity.delete,
    PERMISSIONS.opportunity.assign,
    // Quote
    PERMISSIONS.quote.create,
    PERMISSIONS.quote.read,
    PERMISSIONS.quote.update,
    PERMISSIONS.quote.delete,
    PERMISSIONS.quote.send,
    PERMISSIONS.quote.approve,
    // User
    PERMISSIONS.user.read,
    PERMISSIONS.user.invite,
    PERMISSIONS.user.update,
    PERMISSIONS.user.deactivate,
    PERMISSIONS.user.changeRole,
    // Organization (no billing)
    PERMISSIONS.organization.read,
    PERMISSIONS.organization.update,
    PERMISSIONS.organization.manageIntegrations,
    // Reports
    PERMISSIONS.report.viewSales,
    PERMISSIONS.report.viewFinancial,
    PERMISSIONS.report.viewOperations,
    PERMISSIONS.report.export,
    // API Token
    PERMISSIONS.apiToken.create,
    PERMISSIONS.apiToken.read,
    PERMISSIONS.apiToken.revoke,
    // Activity (audit trail)
    PERMISSIONS.activity.read,
    PERMISSIONS.activity.export,
  ],

  // Manager: Manage team and operations, no user/org management
  manager: [
    // Customer
    PERMISSIONS.customer.create,
    PERMISSIONS.customer.read,
    PERMISSIONS.customer.update,
    PERMISSIONS.customer.export,
    // Contact
    PERMISSIONS.contact.create,
    PERMISSIONS.contact.read,
    PERMISSIONS.contact.update,
    // Order
    PERMISSIONS.order.create,
    PERMISSIONS.order.read,
    PERMISSIONS.order.update,
    PERMISSIONS.order.fulfill,
    PERMISSIONS.order.cancel,
    PERMISSIONS.order.export,
    // Product
    PERMISSIONS.product.read,
    PERMISSIONS.product.update,
    // Inventory
    PERMISSIONS.inventory.read,
    PERMISSIONS.inventory.adjust,
    PERMISSIONS.inventory.transfer,
    PERMISSIONS.inventory.receive,
    // Opportunity
    PERMISSIONS.opportunity.create,
    PERMISSIONS.opportunity.read,
    PERMISSIONS.opportunity.update,
    PERMISSIONS.opportunity.assign,
    // Quote
    PERMISSIONS.quote.create,
    PERMISSIONS.quote.read,
    PERMISSIONS.quote.update,
    PERMISSIONS.quote.send,
    PERMISSIONS.quote.approve,
    // User (read only)
    PERMISSIONS.user.read,
    // Reports
    PERMISSIONS.report.viewSales,
    PERMISSIONS.report.viewOperations,
    PERMISSIONS.report.export,
    // Activity (read only)
    PERMISSIONS.activity.read,
  ],

  // Sales: Customer and sales focused
  sales: [
    // Customer
    PERMISSIONS.customer.create,
    PERMISSIONS.customer.read,
    PERMISSIONS.customer.update,
    // Contact
    PERMISSIONS.contact.create,
    PERMISSIONS.contact.read,
    PERMISSIONS.contact.update,
    // Order
    PERMISSIONS.order.create,
    PERMISSIONS.order.read,
    PERMISSIONS.order.update,
    // Product (read only)
    PERMISSIONS.product.read,
    // Opportunity
    PERMISSIONS.opportunity.create,
    PERMISSIONS.opportunity.read,
    PERMISSIONS.opportunity.update,
    // Quote
    PERMISSIONS.quote.create,
    PERMISSIONS.quote.read,
    PERMISSIONS.quote.update,
    PERMISSIONS.quote.send,
    // Reports (sales only)
    PERMISSIONS.report.viewSales,
    // API Token
    PERMISSIONS.apiToken.create,
    PERMISSIONS.apiToken.read,
    PERMISSIONS.apiToken.revoke,
  ],

  // Operations: Inventory and fulfillment focused
  operations: [
    // Customer (read only)
    PERMISSIONS.customer.read,
    // Contact (read only)
    PERMISSIONS.contact.read,
    // Order
    PERMISSIONS.order.read,
    PERMISSIONS.order.update,
    PERMISSIONS.order.fulfill,
    // Product
    PERMISSIONS.product.read,
    PERMISSIONS.product.update,
    // Inventory (full)
    PERMISSIONS.inventory.read,
    PERMISSIONS.inventory.adjust,
    PERMISSIONS.inventory.transfer,
    PERMISSIONS.inventory.receive,
    // Reports (operations only)
    PERMISSIONS.report.viewOperations,
  ],

  // Support: Customer service focused
  support: [
    // Customer (read + limited update)
    PERMISSIONS.customer.read,
    PERMISSIONS.customer.update,
    // Contact
    PERMISSIONS.contact.read,
    PERMISSIONS.contact.update,
    // Order (read + limited update)
    PERMISSIONS.order.read,
    PERMISSIONS.order.update,
    // Product (read only)
    PERMISSIONS.product.read,
    // Inventory (read only)
    PERMISSIONS.inventory.read,
  ],

  // Viewer: Read-only access
  viewer: [
    PERMISSIONS.customer.read,
    PERMISSIONS.contact.read,
    PERMISSIONS.order.read,
    PERMISSIONS.product.read,
    PERMISSIONS.inventory.read,
    PERMISSIONS.opportunity.read,
    PERMISSIONS.quote.read,
  ],
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Check if a role has permission to perform an action.
 *
 * @param role - The user's role
 * @param action - The action to check (e.g., 'customer.create')
 * @returns true if the role has permission
 *
 * @example
 * ```ts
 * if (hasPermission(user.role, 'customer.create')) {
 *   // Allow customer creation
 * }
 * ```
 */
export function hasPermission(role: Role, action: PermissionAction): boolean {
  const permissions = ROLE_PERMISSIONS[role]
  if (!permissions) {
    return false
  }
  return permissions.includes(action)
}

/**
 * Get all permitted actions for a role.
 *
 * @param role - The user's role
 * @returns Array of permitted action strings
 *
 * @example
 * ```ts
 * const actions = getPermittedActions('sales')
 * // ['customer.create', 'customer.read', ...]
 * ```
 */
export function getPermittedActions(role: Role): PermissionAction[] {
  return ROLE_PERMISSIONS[role] ?? []
}

/**
 * Check if a role has any of the specified permissions.
 *
 * @param role - The user's role
 * @param actions - Array of actions to check
 * @returns true if the role has at least one of the permissions
 */
export function hasAnyPermission(role: Role, actions: PermissionAction[]): boolean {
  return actions.some((action) => hasPermission(role, action))
}

/**
 * Check if a role has all of the specified permissions.
 *
 * @param role - The user's role
 * @param actions - Array of actions to check
 * @returns true if the role has all of the permissions
 */
export function hasAllPermissions(role: Role, actions: PermissionAction[]): boolean {
  return actions.every((action) => hasPermission(role, action))
}

/**
 * Get all unique permissions across all domains.
 */
export function getAllPermissions(): PermissionAction[] {
  const allPermissions: PermissionAction[] = []
  for (const domain of Object.values(PERMISSIONS)) {
    for (const action of Object.values(domain)) {
      allPermissions.push(action)
    }
  }
  return allPermissions
}
