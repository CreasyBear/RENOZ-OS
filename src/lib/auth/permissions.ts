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
    allocate: 'inventory.allocate',
    manage: 'inventory.manage',
    count: 'inventory.count',
    forecast: 'inventory.forecast',
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

  // Dashboard domain
  dashboard: {
    read: 'dashboard.read',
    update: 'dashboard.update',
    manageTargets: 'dashboard.manage_targets',
    manageReports: 'dashboard.manage_reports',
  },

  // Scheduled Reports domain
  scheduledReport: {
    create: 'scheduled_report.create',
    read: 'scheduled_report.read',
    update: 'scheduled_report.update',
    delete: 'scheduled_report.delete',
  },

  // Job Assignments domain (field work)
  job: {
    create: 'job.create',
    read: 'job.read',
    update: 'job.update',
    delete: 'job.delete',
    assign: 'job.assign',
  },

  // Team/User Groups domain
  team: {
    create: 'team.create',
    read: 'team.read',
    update: 'team.update',
    delete: 'team.delete',
  },

  // Audit Trail domain
  audit: {
    read: 'audit.read',
    export: 'audit.export',
  },

  // Settings domain
  settings: {
    read: 'settings.read',
    update: 'settings.update',
  },

  // Suppliers domain
  suppliers: {
    read: 'suppliers.read',
    create: 'suppliers.create',
    update: 'suppliers.update',
    delete: 'suppliers.delete',
    approve: 'suppliers.approve',
  },

  // Warranty domain
  warranty: {
    read: 'warranty.read',
    create: 'warranty.create',
    update: 'warranty.update',
    approve: 'warranty.approve',
    resolve: 'warranty.resolve',
    assign: 'warranty.assign',
  },

  // Financial domain
  financial: {
    read: 'financial.read',
    create: 'financial.create',
    update: 'financial.update',
    delete: 'financial.delete',
  },

  // Support domain
  support: {
    read: 'support.read',
    create: 'support.create',
    update: 'support.update',
    delete: 'support.delete',
  },

  // Category domain
  category: {
    read: 'category.read',
    create: 'category.create',
    update: 'category.update',
    delete: 'category.delete',
  },

  // Win/Loss Reason domain
  winLossReason: {
    read: 'win_loss_reason.read',
    create: 'win_loss_reason.create',
    update: 'win_loss_reason.update',
    delete: 'win_loss_reason.delete',
  },

  // Warranty Policy domain
  warrantyPolicy: {
    read: 'warranty_policy.read',
    create: 'warranty_policy.create',
    update: 'warranty_policy.update',
    delete: 'warranty_policy.delete',
  },

  // Knowledge Base domain
  knowledgeBase: {
    read: 'knowledge_base.read',
    create: 'knowledge_base.create',
    update: 'knowledge_base.update',
    delete: 'knowledge_base.delete',
  },

  // Job Template domain
  jobTemplate: {
    read: 'job_template.read',
    create: 'job_template.create',
    update: 'job_template.update',
    delete: 'job_template.delete',
  },

  // Issue Template domain
  issueTemplate: {
    read: 'issue_template.read',
    create: 'issue_template.create',
    update: 'issue_template.update',
    delete: 'issue_template.delete',
  },

  // Email domain
  email: {
    read: 'email.read',
    create: 'email.create',
    update: 'email.update',
    delete: 'email.delete',
  },

  // Delegation domain
  delegation: {
    read: 'delegation.read',
    create: 'delegation.create',
    update: 'delegation.update',
    delete: 'delegation.delete',
  },
} as const

// ============================================================================
// DERIVED TYPES (must come after PERMISSIONS is defined)
// ============================================================================

/**
 * Permission action format: 'domain.action'
 * Type-safe union derived from PERMISSIONS constant.
 * This ensures compile-time validation of permission strings.
 *
 * @example
 * // These will work:
 * const p1: PermissionAction = 'customer.read'
 * const p2: PermissionAction = PERMISSIONS.customer.read
 *
 * // These will cause compile errors:
 * const p3: PermissionAction = 'customer.creat'  // typo
 * const p4: PermissionAction = 'custmer.read'    // wrong domain
 */
export type PermissionAction =
  | typeof PERMISSIONS.customer[keyof typeof PERMISSIONS.customer]
  | typeof PERMISSIONS.contact[keyof typeof PERMISSIONS.contact]
  | typeof PERMISSIONS.order[keyof typeof PERMISSIONS.order]
  | typeof PERMISSIONS.product[keyof typeof PERMISSIONS.product]
  | typeof PERMISSIONS.inventory[keyof typeof PERMISSIONS.inventory]
  | typeof PERMISSIONS.opportunity[keyof typeof PERMISSIONS.opportunity]
  | typeof PERMISSIONS.quote[keyof typeof PERMISSIONS.quote]
  | typeof PERMISSIONS.user[keyof typeof PERMISSIONS.user]
  | typeof PERMISSIONS.organization[keyof typeof PERMISSIONS.organization]
  | typeof PERMISSIONS.report[keyof typeof PERMISSIONS.report]
  | typeof PERMISSIONS.apiToken[keyof typeof PERMISSIONS.apiToken]
  | typeof PERMISSIONS.activity[keyof typeof PERMISSIONS.activity]
  | typeof PERMISSIONS.dashboard[keyof typeof PERMISSIONS.dashboard]
  | typeof PERMISSIONS.scheduledReport[keyof typeof PERMISSIONS.scheduledReport]
  | typeof PERMISSIONS.job[keyof typeof PERMISSIONS.job]
  | typeof PERMISSIONS.team[keyof typeof PERMISSIONS.team]
  | typeof PERMISSIONS.audit[keyof typeof PERMISSIONS.audit]
  | typeof PERMISSIONS.settings[keyof typeof PERMISSIONS.settings]
  | typeof PERMISSIONS.suppliers[keyof typeof PERMISSIONS.suppliers]
  | typeof PERMISSIONS.warranty[keyof typeof PERMISSIONS.warranty]
  | typeof PERMISSIONS.financial[keyof typeof PERMISSIONS.financial]
  | typeof PERMISSIONS.support[keyof typeof PERMISSIONS.support]
  | typeof PERMISSIONS.category[keyof typeof PERMISSIONS.category]
  | typeof PERMISSIONS.winLossReason[keyof typeof PERMISSIONS.winLossReason]
  | typeof PERMISSIONS.warrantyPolicy[keyof typeof PERMISSIONS.warrantyPolicy]
  | typeof PERMISSIONS.knowledgeBase[keyof typeof PERMISSIONS.knowledgeBase]
  | typeof PERMISSIONS.jobTemplate[keyof typeof PERMISSIONS.jobTemplate]
  | typeof PERMISSIONS.issueTemplate[keyof typeof PERMISSIONS.issueTemplate]
  | typeof PERMISSIONS.email[keyof typeof PERMISSIONS.email]
  | typeof PERMISSIONS.delegation[keyof typeof PERMISSIONS.delegation]

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
export type RolePermissions = Record<Role, readonly PermissionAction[]>

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
    PERMISSIONS.inventory.allocate,
    PERMISSIONS.inventory.manage,
    PERMISSIONS.inventory.count,
    PERMISSIONS.inventory.forecast,
    // Jobs
    PERMISSIONS.job.read,
    PERMISSIONS.job.create,
    PERMISSIONS.job.update,
    PERMISSIONS.job.delete,
    PERMISSIONS.job.assign,
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
    // Dashboard
    PERMISSIONS.dashboard.read,
    PERMISSIONS.dashboard.update,
    PERMISSIONS.dashboard.manageTargets,
    PERMISSIONS.dashboard.manageReports,
    // Scheduled Reports
    PERMISSIONS.scheduledReport.create,
    PERMISSIONS.scheduledReport.read,
    PERMISSIONS.scheduledReport.update,
    PERMISSIONS.scheduledReport.delete,
    // Team/User Groups
    PERMISSIONS.team.create,
    PERMISSIONS.team.read,
    PERMISSIONS.team.update,
    PERMISSIONS.team.delete,
    // Audit
    PERMISSIONS.audit.read,
    PERMISSIONS.audit.export,
    // Settings
    PERMISSIONS.settings.read,
    PERMISSIONS.settings.update,
    // Suppliers
    PERMISSIONS.suppliers.read,
    PERMISSIONS.suppliers.create,
    PERMISSIONS.suppliers.update,
    PERMISSIONS.suppliers.delete,
    PERMISSIONS.suppliers.approve,
    // Warranty
    PERMISSIONS.warranty.read,
    PERMISSIONS.warranty.create,
    PERMISSIONS.warranty.update,
    PERMISSIONS.warranty.approve,
    PERMISSIONS.warranty.resolve,
    PERMISSIONS.warranty.assign,
    // Financial
    PERMISSIONS.financial.read,
    PERMISSIONS.financial.create,
    PERMISSIONS.financial.update,
    PERMISSIONS.financial.delete,
    // Support
    PERMISSIONS.support.read,
    PERMISSIONS.support.create,
    PERMISSIONS.support.update,
    PERMISSIONS.support.delete,
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
    PERMISSIONS.inventory.allocate,
    PERMISSIONS.inventory.manage,
    PERMISSIONS.inventory.count,
    PERMISSIONS.inventory.forecast,
    // Jobs
    PERMISSIONS.job.read,
    PERMISSIONS.job.create,
    PERMISSIONS.job.update,
    PERMISSIONS.job.delete,
    PERMISSIONS.job.assign,
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
    // Dashboard
    PERMISSIONS.dashboard.read,
    PERMISSIONS.dashboard.update,
    PERMISSIONS.dashboard.manageTargets,
    PERMISSIONS.dashboard.manageReports,
    // Scheduled Reports
    PERMISSIONS.scheduledReport.create,
    PERMISSIONS.scheduledReport.read,
    PERMISSIONS.scheduledReport.update,
    PERMISSIONS.scheduledReport.delete,
    // Team/User Groups
    PERMISSIONS.team.create,
    PERMISSIONS.team.read,
    PERMISSIONS.team.update,
    PERMISSIONS.team.delete,
    // Audit
    PERMISSIONS.audit.read,
    PERMISSIONS.audit.export,
    // Settings
    PERMISSIONS.settings.read,
    PERMISSIONS.settings.update,
    // Suppliers
    PERMISSIONS.suppliers.read,
    PERMISSIONS.suppliers.create,
    PERMISSIONS.suppliers.update,
    PERMISSIONS.suppliers.delete,
    PERMISSIONS.suppliers.approve,
    // Warranty
    PERMISSIONS.warranty.read,
    PERMISSIONS.warranty.create,
    PERMISSIONS.warranty.update,
    PERMISSIONS.warranty.approve,
    PERMISSIONS.warranty.resolve,
    PERMISSIONS.warranty.assign,
    // Financial
    PERMISSIONS.financial.read,
    PERMISSIONS.financial.create,
    PERMISSIONS.financial.update,
    PERMISSIONS.financial.delete,
    // Support
    PERMISSIONS.support.read,
    PERMISSIONS.support.create,
    PERMISSIONS.support.update,
    PERMISSIONS.support.delete,
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
    PERMISSIONS.inventory.allocate,
    PERMISSIONS.inventory.manage,
    PERMISSIONS.inventory.count,
    PERMISSIONS.inventory.forecast,
    // Jobs
    PERMISSIONS.job.read,
    PERMISSIONS.job.create,
    PERMISSIONS.job.update,
    PERMISSIONS.job.delete,
    PERMISSIONS.job.assign,
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
    // Dashboard (read + targets)
    PERMISSIONS.dashboard.read,
    PERMISSIONS.dashboard.manageTargets,
    // Warranty (read + approve)
    PERMISSIONS.warranty.read,
    PERMISSIONS.warranty.approve,
    // Financial (read + manage)
    PERMISSIONS.financial.read,
    PERMISSIONS.financial.create,
    PERMISSIONS.financial.update,
    // Support (read + manage)
    PERMISSIONS.support.read,
    PERMISSIONS.support.create,
    PERMISSIONS.support.update,
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
    // Dashboard (read only)
    PERMISSIONS.dashboard.read,
    // Financial (read only - view payment schedules)
    PERMISSIONS.financial.read,
    // Support (read only)
    PERMISSIONS.support.read,
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
    PERMISSIONS.inventory.manage,
    PERMISSIONS.inventory.count,
    PERMISSIONS.inventory.forecast,
    // Jobs
    PERMISSIONS.job.read,
    PERMISSIONS.job.create,
    PERMISSIONS.job.update,
    PERMISSIONS.job.delete,
    PERMISSIONS.job.assign,
    // Reports (operations only)
    PERMISSIONS.report.viewOperations,
    // Dashboard (read only)
    PERMISSIONS.dashboard.read,
    // Warranty (read only - view claims related to operations)
    PERMISSIONS.warranty.read,
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
    // Dashboard (read only)
    PERMISSIONS.dashboard.read,
    // Warranty (read + assign)
    PERMISSIONS.warranty.read,
    PERMISSIONS.warranty.assign,
    // Support (full - CSAT and tickets)
    PERMISSIONS.support.read,
    PERMISSIONS.support.create,
    PERMISSIONS.support.update,
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
    PERMISSIONS.dashboard.read,
    // Warranty (read only)
    PERMISSIONS.warranty.read,
    // Financial (read only)
    PERMISSIONS.financial.read,
    // Support (read only)
    PERMISSIONS.support.read,
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
export function getPermittedActions(role: Role): readonly PermissionAction[] {
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
