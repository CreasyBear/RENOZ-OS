/**
 * Sidebar Component
 *
 * Navigation sidebar with collapsible functionality.
 * Uses SidebarProvider context for state management.
 *
 * Features:
 * - Three collapse modes: offcanvas, icon, none
 * - Icon-only mode when collapsed (icon mode)
 * - Active route highlighting
 * - Keyboard navigable (Cmd/Ctrl+B to toggle)
 * - Cookie persistence
 * - ARIA labels for accessibility
 * - Uses centralized ROUTE_METADATA for navigation items
 * - Role-based navigation filtering (hides items user can't access)
 */
import { useMemo } from 'react'
import { useNavigate } from '@tanstack/react-router'
import {
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { SidebarNavItem } from './sidebar-nav-item'
import { SidebarRail } from './sidebar-rail'
import { OrgSwitcher } from './org-switcher'
import { useSignOut } from '@/lib/auth/hooks'
import { getNavRoutes } from '@/lib/routing'
import {
  useSidebarSafe,
  SIDEBAR_WIDTH,
  SIDEBAR_WIDTH_COLLAPSED,
  type SidebarCollapsible,
} from './sidebar-provider'
import { toast } from '@/hooks'
import { useCurrentUser } from '@/hooks'
import { hasPermission, type Role } from '@/lib/auth/permissions'

// ============================================================================
// TYPES
// ============================================================================

interface SidebarProps {
  /**
   * Legacy prop - use SidebarProvider instead
   * @deprecated
   */
  collapsed?: boolean
  /**
   * Legacy prop - use SidebarProvider instead
   * @deprecated
   */
  onCollapsedChange?: (collapsed: boolean) => void
  /**
   * Collapse mode - only used if not using SidebarProvider
   * @default 'icon'
   */
  collapsible?: SidebarCollapsible
}

// ============================================================================
// COMPONENT
// ============================================================================

export function Sidebar({
  collapsed: legacyCollapsed,
  onCollapsedChange: legacyOnCollapsedChange,
  collapsible: propCollapsible = 'icon',
}: SidebarProps) {
  const navigate = useNavigate()
  const signOut = useSignOut()
  const sidebarContext = useSidebarSafe()
  const { user } = useCurrentUser()

  // Use context if available, otherwise fall back to legacy props
  const isCollapsed = sidebarContext?.isCollapsed ?? legacyCollapsed ?? false
  const collapsible = sidebarContext?.collapsible ?? propCollapsible
  const toggle = sidebarContext?.toggle ?? (() => legacyOnCollapsedChange?.(!isCollapsed))

  // Determine if we should show collapsed view
  const showCollapsedView = collapsible === 'icon' && isCollapsed

  const handleSignOut = async () => {
    try {
      await signOut.mutateAsync()
      toast.success('Signed out successfully')
      navigate({ to: '/login' })
    } catch {
      toast.error('Failed to sign out')
    }
  }

  // Get navigation items filtered by user permissions
  const navItems = useMemo(() => {
    const allRoutes = getNavRoutes()

    // If no user yet, show all routes (loading state)
    if (!user?.role) {
      return allRoutes
    }

    // Filter routes based on user's role and required permissions
    return allRoutes.filter((route) => {
      // Routes without requiredPermission are accessible to all
      if (!route.requiredPermission) {
        return true
      }
      // Check if user has the required permission
      return hasPermission(user.role as Role, route.requiredPermission)
    })
  }, [user])

  // Width based on collapse state and mode
  const width = showCollapsedView ? SIDEBAR_WIDTH_COLLAPSED : SIDEBAR_WIDTH

  return (
    <aside
      role="navigation"
      aria-label="Main navigation"
      className={cn(
        'group relative flex h-full flex-col border-r border-gray-200 bg-white',
        'transition-all duration-200 ease-in-out'
      )}
      style={{ width }}
    >
      {/* Logo/Brand area */}
      <div
        className={cn(
          'flex h-16 items-center border-b border-gray-200',
          showCollapsedView ? 'justify-center px-2' : 'justify-between px-4'
        )}
      >
        {!showCollapsedView && (
          <span className="text-xl font-semibold text-gray-900">Renoz</span>
        )}
        {showCollapsedView && (
          <span className="text-xl font-semibold text-gray-900">R</span>
        )}

        {/* Collapse toggle button (only for non-context mode or offcanvas) */}
        {collapsible !== 'none' && !sidebarContext && (
          <button
            type="button"
            onClick={() => toggle()}
            className={cn(
              'rounded-md p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-700',
              'focus:outline-none focus:ring-2 focus:ring-gray-200',
              showCollapsedView && 'absolute -right-3 top-6 z-10 rounded-full border border-gray-200 bg-white shadow-sm'
            )}
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-expanded={!isCollapsed}
          >
            {isCollapsed ? (
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            ) : (
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            )}
          </button>
        )}
      </div>

      {/* Organization switcher */}
      <div className="border-b border-gray-200 p-2">
        <OrgSwitcher collapsed={showCollapsedView} />
      </div>

      {/* Main navigation */}
      <nav className="flex-1 space-y-1 overflow-y-auto p-2" aria-label="Primary navigation">
        {navItems.map((item) => (
          <SidebarNavItem
            key={item.path}
            href={item.path}
            label={item.title}
            icon={item.icon!}
            collapsed={showCollapsedView}
          />
        ))}
      </nav>

      {/* Bottom section */}
      <div className="border-t border-gray-200 p-2 space-y-1">
        <SidebarNavItem
          href="/settings"
          label="Settings"
          icon={Settings}
          collapsed={showCollapsedView}
        />
        <button
          type="button"
          onClick={handleSignOut}
          disabled={signOut.isPending}
          className={cn(
            'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
            'text-gray-600 hover:bg-gray-100 hover:text-gray-900',
            'focus:outline-none focus:ring-2 focus:ring-gray-200',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            showCollapsedView && 'justify-center px-2'
          )}
          title={showCollapsedView ? 'Log out' : undefined}
        >
          <LogOut
            className="h-5 w-5 flex-shrink-0 text-gray-500"
            aria-hidden="true"
          />
          {!showCollapsedView && <span>{signOut.isPending ? 'Logging out...' : 'Log out'}</span>}
        </button>
      </div>

      {/* Sidebar rail for hover/click toggle */}
      {sidebarContext && <SidebarRail />}

      {/* Keyboard shortcut hint */}
      {!showCollapsedView && (
        <div className="border-t border-gray-100 px-4 py-2 text-center">
          <span className="text-xs text-gray-400">
            <kbd className="rounded bg-gray-100 px-1">⌘</kbd>
            <kbd className="rounded bg-gray-100 px-1 ml-0.5">B</kbd>
            {' '}to toggle
          </span>
        </div>
      )}
    </aside>
  )
}
