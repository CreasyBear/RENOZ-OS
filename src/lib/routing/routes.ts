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
} from 'lucide-react'
import type { PermissionAction } from '@/lib/auth/permissions'

// ============================================================================
// TYPES
// ============================================================================

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
  requiredPermission?: PermissionAction
  /** Whether to show in main navigation */
  showInNav?: boolean
  /** Navigation order (lower = higher in list) */
  navOrder?: number
  /** Parent route path for nested routes */
  parent?: string
}

// ============================================================================
// PUBLIC ROUTES
// ============================================================================

/**
 * Routes that don't require authentication.
 */
export const PUBLIC_ROUTES = [
  '/login',
  '/signup',
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
 */
export const ROUTE_METADATA: Record<string, RouteMetadata> = {
  // Main navigation routes
  '/dashboard': {
    title: 'Dashboard',
    icon: LayoutDashboard,
    description: 'Overview and key metrics',
    showInNav: true,
    navOrder: 1,
  },
  '/customers': {
    title: 'Customers',
    icon: Users,
    description: 'Manage customer relationships',
    requiredPermission: 'customer.read',
    showInNav: true,
    navOrder: 2,
  },
  '/pipeline': {
    title: 'Pipeline',
    icon: Kanban,
    description: 'Sales pipeline and opportunities',
    requiredPermission: 'quote.read',
    showInNav: true,
    navOrder: 3,
  },
  '/orders': {
    title: 'Orders',
    icon: ShoppingCart,
    description: 'Order management',
    requiredPermission: 'order.read',
    showInNav: true,
    navOrder: 4,
  },
  '/products': {
    title: 'Products',
    icon: Package,
    description: 'Product catalog',
    requiredPermission: 'product.read',
    showInNav: true,
    navOrder: 5,
  },
  '/inventory': {
    title: 'Inventory',
    icon: Warehouse,
    description: 'Stock and warehouse management',
    requiredPermission: 'inventory.read',
    showInNav: true,
    navOrder: 6,
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

/**
 * Get breadcrumb label for a path segment.
 */
export function getBreadcrumbLabel(path: string): string {
  const meta = getRouteMetadata(path)
  return meta.breadcrumb ?? meta.title
}
