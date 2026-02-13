/**
 * Centralized Route Configuration
 *
 * Single source of truth for all route definitions and metadata.
 * Used by sidebar navigation, breadcrumbs, command palette, and permission checks.
 *
 * @example
 * ```tsx
 * import { ROUTE_METADATA, getRouteMetadata } from '@/lib/routing/routes'
 *
 * // Get metadata for current route
 * const metadata = getRouteMetadata('/customers')
 * console.log(metadata.title) // "Customers"
 * console.log(metadata.icon) // Users icon component
 * ```
 */
import type { LucideIcon } from 'lucide-react'
import {
  LayoutDashboard,
  Users,
  Kanban,
  ShoppingCart,
  Package,
  Warehouse,
  Settings,
  User,
  Wrench,
  Headphones,
  Mail,
  DollarSign,
  Truck,
  FileText,
  Activity,
  CheckSquare,
  BarChart3,
  Shield,
  FolderKanban,
  CalendarDays,
  ListChecks,
  TrendingUp,
  Inbox,
  Phone,
  UserPlus,
  ScrollText,
} from 'lucide-react'
import { PERMISSIONS, type PermissionAction } from '@/lib/auth/permissions'

// ============================================================================
// TYPES
// ============================================================================

export type NavGroup =
  | 'daily'
  | 'sales'
  | 'delivery'
  | 'operations'
  | 'communications'
  | 'support'
  | 'admin'
  | 'footer'

export interface RouteMetadata {
  /** Display title for the route */
  title: string
  /** Lucide icon component */
  icon?: LucideIcon
  /** Breadcrumb label (defaults to title if not specified) */
  breadcrumb?: string
  /** Description for command palette and tooltips */
  description?: string
  /** Required permission to access this route */
  requiredPermission?: PermissionAction | PermissionAction[]
  /** Whether to show in main navigation */
  showInNav?: boolean
  /** Navigation order (lower = higher in list) */
  navOrder?: number
  /** Parent route path for nested routes */
  parent?: string
  /** Navigation group for collapsible sidebar sections */
  navGroup?: NavGroup
  /** Badge to show on nav item (e.g., "New", "Beta") */
  badge?: string
}

// ============================================================================
// PUBLIC ROUTES
// ============================================================================

/**
 * Routes that don't require authentication.
 */
export const PUBLIC_ROUTES = [
  '/login',
  '/sign-up',
  '/forgot-password',
  '/reset-password',
] as const

export type PublicRoute = (typeof PUBLIC_ROUTES)[number]

/**
 * Check if a path is a public route.
 */
export function isPublicRoute(path: string): boolean {
  return PUBLIC_ROUTES.some(route => path === route || path.startsWith(route + '/'))
}

// ============================================================================
// ROUTE METADATA
// ============================================================================

/**
 * Metadata for all application routes.
 * Used as single source of truth for navigation, breadcrumbs, and permissions.
 *
 * Navigation Groups:
 * - daily: Dashboard, My Tasks, Schedule (always visible)
 * - sales: Customers, Pipeline, Orders (sales workflow)
 * - delivery: Projects, Installers (field operations)
 * - footer: Inventory, Support, Settings (icon-only in footer)
 */
export const ROUTE_METADATA: Record<string, RouteMetadata> = {
  // ============================================================================
  // DAILY - Always visible, personal workspace
  // ============================================================================
  '/dashboard': {
    title: 'Dashboard',
    icon: LayoutDashboard,
    description: 'Overview and key metrics',
    showInNav: true,
    navOrder: 1,
    navGroup: 'daily',
  },
  '/my-tasks': {
    title: 'My Tasks',
    icon: ListChecks,
    description: 'Your assigned tasks and visits',
    requiredPermission: PERMISSIONS.job.read,
    showInNav: true,
    navOrder: 2,
    navGroup: 'daily',
  },
  '/schedule': {
    title: 'Schedule',
    icon: CalendarDays,
    description: 'Cross-project site visit schedule',
    requiredPermission: PERMISSIONS.job.read,
    showInNav: true,
    navOrder: 3,
    navGroup: 'daily',
  },

  // ============================================================================
  // SALES - Customer & revenue focused
  // ============================================================================
  '/customers': {
    title: 'Customers',
    icon: Users,
    description: 'Manage customer relationships',
    requiredPermission: 'customer.read',
    showInNav: true,
    navOrder: 10,
    navGroup: 'sales',
  },
  '/pipeline': {
    title: 'Pipeline',
    icon: Kanban,
    description: 'Sales pipeline and opportunities',
    requiredPermission: 'quote.read',
    showInNav: true,
    navOrder: 11,
    navGroup: 'sales',
  },
  '/orders': {
    title: 'Orders',
    icon: ShoppingCart,
    description: 'Order management and fulfillment',
    requiredPermission: 'order.read',
    showInNav: true,
    navOrder: 12,
    navGroup: 'sales',
  },

  // ============================================================================
  // DELIVERY - Field operations & project execution
  // ============================================================================
  '/projects': {
    title: 'Projects',
    icon: FolderKanban,
    description: 'Project tracking and delivery',
    requiredPermission: PERMISSIONS.job.read,
    showInNav: true,
    navOrder: 20,
    navGroup: 'delivery',
  },
  '/installers': {
    title: 'Installers',
    icon: Wrench,
    description: 'Manage installers and their assignments',
    requiredPermission: PERMISSIONS.job.read,
    showInNav: true,
    navOrder: 21,
    navGroup: 'delivery',
  },

  // ============================================================================
  // OPERATIONS - Inventory, products, and procurement
  // ============================================================================
  '/inventory': {
    title: 'Inventory',
    icon: Warehouse,
    description: 'Stock, products, and procurement',
    requiredPermission: 'inventory.read',
    showInNav: true,
    navOrder: 30,
    navGroup: 'operations',
  },
  '/products': {
    title: 'Products',
    icon: Package,
    description: 'Product catalog and inventory levels',
    requiredPermission: 'product.read',
    showInNav: true,
    navOrder: 31,
    navGroup: 'operations',
  },
  '/suppliers': {
    title: 'Suppliers',
    icon: Truck,
    description: 'Supplier management and purchase orders',
    requiredPermission: PERMISSIONS.suppliers.read,
    showInNav: true,
    navOrder: 32,
    navGroup: 'operations',
  },
  '/procurement': {
    title: 'Procurement',
    icon: FileText,
    description: 'Purchase orders and procurement dashboard',
    requiredPermission: PERMISSIONS.suppliers.read,
    showInNav: true,
    navOrder: 33,
    navGroup: 'operations',
  },
  '/purchase-orders': {
    title: 'Purchase Orders',
    icon: Truck,
    description: 'Manage purchase orders',
    requiredPermission: PERMISSIONS.suppliers.read,
    showInNav: true,
    navOrder: 34,
    navGroup: 'operations',
  },

  // ============================================================================
  // COMMUNICATIONS - Email, campaigns, and calls
  // ============================================================================
  '/communications': {
    title: 'Communications',
    icon: Mail,
    description: 'Email campaigns and communication logs',
    requiredPermission: PERMISSIONS.support.read,
    showInNav: true,
    navOrder: 40,
    navGroup: 'communications',
  },
  '/communications/inbox': {
    title: 'Inbox',
    icon: Inbox,
    description: 'Unified communications inbox',
    requiredPermission: PERMISSIONS.support.read,
    showInNav: true,
    navOrder: 41,
    navGroup: 'communications',
    parent: '/communications',
  },
  '/communications/campaigns': {
    title: 'Campaigns',
    icon: Mail,
    description: 'Email campaigns',
    requiredPermission: PERMISSIONS.support.read,
    showInNav: true,
    navOrder: 42,
    navGroup: 'communications',
    parent: '/communications',
  },
  '/communications/calls': {
    title: 'Calls',
    icon: Phone,
    description: 'Follow-up calls',
    requiredPermission: PERMISSIONS.support.read,
    showInNav: true,
    navOrder: 43,
    navGroup: 'communications',
    parent: '/communications',
  },

  // ============================================================================
  // SUPPORT - Warranties, claims, RMAs, issues
  // ============================================================================
  '/support': {
    title: 'Support',
    icon: Headphones,
    description: 'Warranties, claims, and customer support',
    requiredPermission: PERMISSIONS.support.read,
    showInNav: true,
    navOrder: 50,
    navGroup: 'support',
  },
  '/support/warranties': {
    title: 'Warranties',
    icon: Shield,
    description: 'Warranty policies and certificates',
    requiredPermission: PERMISSIONS.support.read,
    showInNav: true,
    navOrder: 51,
    navGroup: 'support',
    parent: '/support',
  },
  '/support/claims': {
    title: 'Warranty Claims',
    icon: Shield,
    description: 'Review and manage warranty claims',
    requiredPermission: PERMISSIONS.support.read,
    showInNav: true,
    navOrder: 52,
    navGroup: 'support',
    parent: '/support',
  },
  '/support/rmas': {
    title: 'RMAs',
    icon: Truck,
    description: 'Return merchandise authorizations',
    requiredPermission: PERMISSIONS.support.read,
    showInNav: true,
    navOrder: 53,
    navGroup: 'support',
    parent: '/support',
  },
  '/support/issues': {
    title: 'Issues',
    icon: Headphones,
    description: 'Issue tracking and escalations',
    requiredPermission: PERMISSIONS.support.read,
    showInNav: true,
    navOrder: 54,
    navGroup: 'support',
    parent: '/support',
  },

  // ============================================================================
  // ADMIN - Users, groups, approvals, audit
  // Routes use requireAdmin (owner/admin only); sidebar shows items only to those roles.
  // audit.read aligns with requireAdmin; Approvals uses suppliers.approve for PO approvers.
  // ============================================================================
  '/admin': {
    title: 'Admin',
    icon: Shield,
    description: 'User management, groups, and audit logs',
    requiredPermission: PERMISSIONS.audit.read,
    showInNav: true,
    navOrder: 60,
    navGroup: 'admin',
  },
  '/admin/users': {
    title: 'Users',
    icon: Users,
    description: 'Manage users and permissions',
    requiredPermission: PERMISSIONS.audit.read,
    showInNav: true,
    navOrder: 61,
    navGroup: 'admin',
    parent: '/admin',
  },
  '/admin/groups': {
    title: 'Groups',
    icon: Users,
    description: 'Manage permission groups',
    requiredPermission: PERMISSIONS.audit.read,
    showInNav: true,
    navOrder: 62,
    navGroup: 'admin',
    parent: '/admin',
  },
  '/admin/invitations': {
    title: 'Invitations',
    icon: UserPlus,
    description: 'Pending user invitations',
    requiredPermission: PERMISSIONS.audit.read,
    showInNav: true,
    navOrder: 63,
    navGroup: 'admin',
    parent: '/admin',
  },
  '/admin/audit': {
    title: 'Audit',
    icon: ScrollText,
    description: 'Audit logs and activity',
    requiredPermission: PERMISSIONS.audit.read,
    showInNav: true,
    navOrder: 64,
    navGroup: 'admin',
    parent: '/admin',
  },
  '/admin/activities': {
    title: 'Activities',
    icon: Activity,
    description: 'Activity feed and logs',
    requiredPermission: PERMISSIONS.audit.read,
    showInNav: true,
    navOrder: 65,
    navGroup: 'admin',
    parent: '/admin',
  },
  '/approvals': {
    title: 'Approvals',
    icon: CheckSquare,
    description: 'Pending approvals and delegations',
    requiredPermission: PERMISSIONS.suppliers.approve,
    showInNav: true,
    navOrder: 66,
    navGroup: 'admin',
  },

  // ============================================================================
  // FOOTER - Reports and quick access
  // ============================================================================
  '/reports': {
    title: 'Reports',
    icon: BarChart3,
    description: 'Reports and analytics',
    requiredPermission: [
      PERMISSIONS.report.viewSales,
      PERMISSIONS.report.viewOperations,
      PERMISSIONS.report.viewFinancial,
    ],
    showInNav: true,
    navOrder: 70,
    navGroup: 'footer',
  },
  '/reports/job-costing': {
    title: 'Job Costing',
    breadcrumb: 'Job Costing',
    description: 'Job profitability and cost analysis',
    requiredPermission: PERMISSIONS.report.viewOperations,
    showInNav: false,
    parent: '/reports',
  },
  '/reports/expiring-warranties': {
    title: 'Expiring Warranties',
    icon: BarChart3,
    description: 'Upcoming warranty expirations',
    requiredPermission: PERMISSIONS.report.viewOperations,
    showInNav: false,
    parent: '/reports',
  },
  '/reports/warranties': {
    title: 'Warranty Reports',
    icon: BarChart3,
    description: 'Warranty performance and claims reporting',
    requiredPermission: PERMISSIONS.report.viewOperations,
    showInNav: false,
    parent: '/reports',
  },
  '/reports/pipeline-forecast': {
    title: 'Pipeline Forecast',
    icon: BarChart3,
    description: 'Pipeline forecasting and revenue projections',
    requiredPermission: PERMISSIONS.report.viewSales,
    showInNav: false,
    parent: '/reports',
  },
  '/reports/win-loss': {
    title: 'Win/Loss Analysis',
    icon: BarChart3,
    description: 'Analyze won and lost opportunities',
    requiredPermission: PERMISSIONS.report.viewSales,
    showInNav: false,
    parent: '/reports',
  },
  '/reports/procurement': {
    title: 'Procurement Reports',
    icon: BarChart3,
    description: 'Procurement spend and supplier reporting',
    requiredPermission: PERMISSIONS.report.viewOperations,
    showInNav: false,
    parent: '/reports',
  },
  '/reports/customers': {
    title: 'Customer Reports',
    icon: BarChart3,
    description: 'Customer growth and retention reporting',
    requiredPermission: PERMISSIONS.report.viewSales,
    showInNav: false,
    parent: '/reports',
  },
  '/reports/financial': {
    title: 'Financial Reports',
    icon: BarChart3,
    description: 'Financial reporting and KPI analysis',
    requiredPermission: PERMISSIONS.report.viewFinancial,
    showInNav: false,
    parent: '/reports',
  },

  // ============================================================================
  // HIDDEN FROM NAV - Accessible via search, settings, or direct link
  // ============================================================================
  '/orders/fulfillment': {
    title: 'Fulfillment',
    icon: Truck,
    description: 'Order picking, shipping, and delivery tracking',
    requiredPermission: 'order.read',
    showInNav: false, // Accessible from Orders page
    parent: '/orders',
  },
  '/jobs': {
    title: 'Jobs',
    icon: Wrench,
    description: 'Legacy jobs entrypoint (redirects to projects)',
    requiredPermission: 'job.read',
    showInNav: false,
  },
  '/support/dashboard': {
    title: 'Support Dashboard',
    icon: Headphones,
    description: 'Support metrics, queues, and SLAs',
    requiredPermission: PERMISSIONS.support.read,
    showInNav: false,
    parent: '/support',
  },
  '/financial': {
    title: 'Financial',
    icon: DollarSign,
    description: 'AR aging, revenue, and payment management',
    requiredPermission: 'financial.read',
    showInNav: true, // Now primary navigation entry
    navOrder: 13,
    navGroup: 'sales',
  },
  '/financial/invoices': {
    title: 'Invoices',
    icon: FileText,
    description: 'Manage and track customer invoices',
    requiredPermission: 'financial.read',
    showInNav: false, // Accessible from Financial landing
    parent: '/financial',
  },
  '/financial/invoices/$invoiceId': {
    title: 'Invoice Detail',
    icon: FileText,
    description: 'View invoice details and manage payment',
    requiredPermission: 'financial.read',
    showInNav: false,
    parent: '/financial/invoices',
  },
  '/financial/analytics': {
    title: 'Financial Analytics',
    icon: TrendingUp,
    description: 'Revenue trends, KPIs, and financial insights',
    requiredPermission: 'financial.read',
    showInNav: false, // Accessible from Financial landing
    parent: '/financial',
  },
  // User routes (not in main nav)
  '/profile': {
    title: 'Profile',
    icon: User,
    description: 'Your profile settings and account details',
    showInNav: false,
  },
  '/settings': {
    title: 'Settings',
    icon: Settings,
    description: 'Application settings',
    showInNav: false,
  },

  // Public routes
  '/login': {
    title: 'Login',
    description: 'Sign in to your account',
    showInNav: false,
  },
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Get route metadata by path.
 * Returns a default metadata object if path not found.
 */
export function getRouteMetadata(path: string): RouteMetadata {
  // Exact match
  if (ROUTE_METADATA[path]) {
    return ROUTE_METADATA[path]
  }

  // Try to find parent route (for nested routes like /customers/123)
  const segments = path.split('/').filter(Boolean)
  for (let i = segments.length - 1; i >= 0; i--) {
    const parentPath = '/' + segments.slice(0, i + 1).join('/')
    if (ROUTE_METADATA[parentPath]) {
      return ROUTE_METADATA[parentPath]
    }
  }

  // Default fallback
  const lastSegment = segments[segments.length - 1] || 'Page'
  return {
    title: lastSegment.charAt(0).toUpperCase() + lastSegment.slice(1),
    showInNav: false,
  }
}

/**
 * Get all routes that should appear in the main navigation.
 * Sorted by navOrder.
 */
export function getNavRoutes(): Array<{ path: string } & RouteMetadata> {
  return Object.entries(ROUTE_METADATA)
    .filter(([, meta]) => meta.showInNav)
    .sort((a, b) => (a[1].navOrder ?? 999) - (b[1].navOrder ?? 999))
    .map(([path, meta]) => ({ path, ...meta }))
}

// ============================================================================
// NAVIGATION GROUPS
// ============================================================================

export interface NavGroupConfig {
  key: NavGroup
  title: string
  description: string
  defaultExpanded: boolean
}

export const NAV_GROUPS: NavGroupConfig[] = [
  {
    key: 'daily',
    title: 'Daily',
    description: 'Your personal workspace',
    defaultExpanded: true,
  },
  {
    key: 'sales',
    title: 'Sales',
    description: 'Customers, pipeline, and orders',
    defaultExpanded: true,
  },
  {
    key: 'delivery',
    title: 'Delivery',
    description: 'Projects and field operations',
    defaultExpanded: true,
  },
  {
    key: 'operations',
    title: 'Operations',
    description: 'Inventory, products, and procurement',
    defaultExpanded: true,
  },
  {
    key: 'communications',
    title: 'Communications',
    description: 'Email, campaigns, and calls',
    defaultExpanded: true,
  },
  {
    key: 'support',
    title: 'Support',
    description: 'Warranties, claims, and customer support',
    defaultExpanded: true,
  },
  {
    key: 'admin',
    title: 'Admin',
    description: 'Users, groups, and audit',
    defaultExpanded: true,
  },
  {
    key: 'footer',
    title: 'Reports',
    description: 'Reports and analytics',
    defaultExpanded: false,
  },
]

/**
 * Get routes grouped by navGroup for sidebar display.
 */
export function getNavRoutesByGroup(): Record<NavGroup, Array<{ path: string } & RouteMetadata>> {
  const routes = getNavRoutes()
  const grouped: Record<NavGroup, Array<{ path: string } & RouteMetadata>> = {
    daily: [],
    sales: [],
    delivery: [],
    operations: [],
    communications: [],
    support: [],
    admin: [],
    footer: [],
  }

  for (const route of routes) {
    const group = route.navGroup ?? 'daily'
    grouped[group].push(route)
  }

  return grouped
}

/**
 * Get all routes searchable in the command palette.
 * Includes both nav routes and hidden routes (suppliers, settings, etc.)
 * Excludes public routes (login, sign-up).
 */
export function getSearchableRoutes(): Array<{ path: string } & RouteMetadata> {
  return Object.entries(ROUTE_METADATA)
    .filter(([path, meta]) => {
      // Exclude public routes
      if (PUBLIC_ROUTES.some(r => path === r)) return false
      // Must have a title and description to be useful in search
      if (!meta.description) return false
      return true
    })
    .sort((a, b) => (a[1].navOrder ?? 999) - (b[1].navOrder ?? 999))
    .map(([path, meta]) => ({ path, ...meta }))
}

/**
 * Get breadcrumb label for a path segment.
 */
export function getBreadcrumbLabel(path: string): string {
  const meta = getRouteMetadata(path)
  return meta.breadcrumb ?? meta.title
}
