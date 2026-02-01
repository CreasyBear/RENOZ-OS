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
} from 'lucide-react'
import { PERMISSIONS, type PermissionAction } from '@/lib/auth/permissions'

// ============================================================================
// TYPES
// ============================================================================

export type NavGroup = 'daily' | 'sales' | 'delivery' | 'footer'

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
  // FOOTER - Icon-only quick access
  // ============================================================================
  '/inventory': {
    title: 'Inventory',
    icon: Warehouse,
    description: 'Stock, products, and procurement',
    requiredPermission: 'inventory.read',
    showInNav: true,
    navOrder: 30,
    navGroup: 'footer',
  },
  '/support': {
    title: 'Support',
    icon: Headphones,
    description: 'Warranties, claims, and customer support',
    requiredPermission: 'support.read',
    showInNav: true,
    navOrder: 31,
    navGroup: 'footer',
  },
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
    navOrder: 32,
    navGroup: 'footer',
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
  '/products': {
    title: 'Products',
    icon: Package,
    description: 'Product catalog',
    requiredPermission: 'product.read',
    showInNav: false, // Accessible from Inventory
    parent: '/inventory',
  },
  '/jobs': {
    title: 'Jobs',
    icon: Wrench,
    description: 'Legacy jobs entrypoint (redirects to projects)',
    requiredPermission: 'job.read',
    showInNav: false,
  },
  '/suppliers': {
    title: 'Suppliers',
    icon: Truck,
    description: 'Supplier management and purchase orders',
    requiredPermission: 'suppliers.read',
    showInNav: false, // Accessible from Inventory
    parent: '/inventory',
  },
  '/procurement': {
    title: 'Procurement',
    icon: FileText,
    description: 'Purchase orders and procurement dashboard',
    requiredPermission: PERMISSIONS.suppliers.read,
    showInNav: false, // Accessible from Inventory
    parent: '/inventory',
  },
  '/purchase-orders': {
    title: 'Purchase Orders',
    icon: Truck,
    description: 'Manage purchase orders',
    requiredPermission: PERMISSIONS.suppliers.read,
    showInNav: false, // Accessible from Inventory
    parent: '/inventory',
  },
  '/communications': {
    title: 'Communications',
    icon: Mail,
    description: 'Email campaigns and communication logs',
    requiredPermission: PERMISSIONS.support.read,
    showInNav: false, // Accessible from Support
    parent: '/support',
  },
  '/financial': {
    title: 'Financial',
    icon: DollarSign,
    description: 'AR aging, revenue, and payment management',
    requiredPermission: 'financial.read',
    showInNav: false, // Accessible from Reports or Settings
  },
  '/activities': {
    title: 'Activities',
    icon: Activity,
    description: 'Activity feed and logs',
    requiredPermission: 'activity.read',
    showInNav: false, // Admin function
  },
  '/approvals': {
    title: 'Approvals',
    icon: CheckSquare,
    description: 'Pending approvals and delegations',
    requiredPermission: PERMISSIONS.suppliers.approve,
    showInNav: false, // Admin function
  },
  '/admin': {
    title: 'Admin',
    icon: Shield,
    description: 'User management, groups, and audit logs',
    requiredPermission: 'user.read',
    showInNav: false, // Settings submenu
  },

  // User routes (not in main nav)
  '/profile': {
    title: 'Profile',
    icon: User,
    description: 'Your profile settings',
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
    key: 'footer',
    title: 'More',
    description: 'Inventory, support, and reports',
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
    footer: [],
  }

  for (const route of routes) {
    const group = route.navGroup ?? 'daily'
    grouped[group].push(route)
  }

  return grouped
}

/**
 * Get breadcrumb label for a path segment.
 */
export function getBreadcrumbLabel(path: string): string {
  const meta = getRouteMetadata(path)
  return meta.breadcrumb ?? meta.title
}
