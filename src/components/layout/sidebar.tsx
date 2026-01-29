/**
 * Sidebar Component
 *
 * Navigation sidebar with collapsible functionality.
 * Uses SidebarProvider context for state management.
 *
 * CRO Improvements Applied:
 * - Grouped navigation with collapsible sections (progressive disclosure)
 * - "New" badges for recently added features
 * - Clear visual hierarchy (Core always visible, others collapsed)
 *
 * @see src/lib/routing/routes.ts for navigation configuration
 */
import { useMemo, useState, useEffect } from 'react'
import { useNavigate, useRouterState } from '@tanstack/react-router'
import {
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronRightIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { SidebarNavItem } from './sidebar-nav-item'
import { SidebarRail } from './sidebar-rail'
import { OrgSwitcher } from './org-switcher'
import { useSignOut } from '@/lib/auth/hooks'
import { getNavRoutesByGroup, NAV_GROUPS, type NavGroup } from '@/lib/routing'
import {
  useSidebarSafe,
  SIDEBAR_WIDTH,
  SIDEBAR_WIDTH_COLLAPSED,
  type SidebarCollapsible,
} from './sidebar-provider'
import { toast } from '@/hooks'
import { useCurrentUser } from '@/hooks'
import { hasAnyPermission, hasPermission, type Role } from '@/lib/auth/permissions'

// ============================================================================
// TYPES
// ============================================================================

interface SidebarProps {
  collapsed?: boolean
  onCollapsedChange?: (collapsed: boolean) => void
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
  const router = useRouterState()
  const currentPath = router.location.pathname

  // Track expanded groups (persisted in component state, could use localStorage)
  const [expandedGroups, setExpandedGroups] = useState<Set<NavGroup>>(() => {
    // Start with 'core' expanded
    return new Set(['core'])
  })

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
      navigate({ to: '/login', search: { redirect: undefined } })
    } catch {
      toast.error('Failed to sign out')
    }
  }

  // Get grouped navigation items filtered by user permissions
  const groupedNavItems = useMemo(() => {
    const allGrouped = getNavRoutesByGroup()

    // If no user yet, show all routes (loading state)
    if (!user?.role) {
      return allGrouped
    }

    // Filter each group based on user's role and required permissions
    const filtered: typeof allGrouped = {
      core: [],
      operations: [],
      support: [],
      financial: [],
      administration: [],
    }

    for (const [group, routes] of Object.entries(allGrouped)) {
      filtered[group as NavGroup] = routes.filter((route) => {
        if (!route.requiredPermission) return true
        if (Array.isArray(route.requiredPermission)) {
          return hasAnyPermission(user.role as Role, route.requiredPermission)
        }
        return hasPermission(user.role as Role, route.requiredPermission)
      })
    }

    return filtered
  }, [user])

  // Auto-expand group when navigating to a route in that group
  useEffect(() => {
    for (const [group, routes] of Object.entries(groupedNavItems)) {
      if (routes.some(route => currentPath.startsWith(route.path))) {
        setExpandedGroups(prev => {
          if (prev.has(group as NavGroup)) return prev
          return new Set([...prev, group as NavGroup])
        })
        break
      }
    }
  }, [currentPath, groupedNavItems])

  const toggleGroup = (group: NavGroup) => {
    setExpandedGroups(prev => {
      const next = new Set(prev)
      if (next.has(group)) {
        next.delete(group)
      } else {
        next.add(group)
      }
      return next
    })
  }

  // Width based on collapse state and mode
  const width = showCollapsedView ? SIDEBAR_WIDTH_COLLAPSED : SIDEBAR_WIDTH

  // Get group config
  const getGroupConfig = (key: NavGroup) => NAV_GROUPS.find(g => g.key === key)!

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

      {/* Main navigation - Grouped */}
      <nav className="flex-1 overflow-y-auto py-2" aria-label="Primary navigation">
        {showCollapsedView ? (
          // Collapsed view: flat list with icons only
          <div className="px-2 space-y-1">
            {groupedNavItems.core.map((item) => (
              <SidebarNavItem
                key={item.path}
                href={item.path}
                label={item.title}
                icon={item.icon!}
                collapsed={true}
              />
            ))}
            <div className="border-t border-gray-200 my-2" />
            {Object.entries(groupedNavItems)
              .filter(([key]) => key !== 'core')
              .flatMap(([, routes]) => routes)
              .slice(0, 6) // Show first 6 non-core items
              .map((item) => (
                <SidebarNavItem
                  key={item.path}
                  href={item.path}
                  label={item.title}
                  icon={item.icon!}
                  collapsed={true}
                />
              ))}
          </div>
        ) : (
          // Expanded view: grouped with collapsible sections
          <div className="space-y-1">
            {/* Core Group - Always Expanded */}
            <div className="px-3 pb-2">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-3 py-2">
                {getGroupConfig('core').title}
              </p>
              <div className="space-y-0.5">
                {groupedNavItems.core.map((item) => (
                  <SidebarNavItem
                    key={item.path}
                    href={item.path}
                    label={item.title}
                    icon={item.icon!}
                    badge={item.badge}
                  />
                ))}
              </div>
            </div>

            {/* Other Groups - Collapsible */}
            {(['operations', 'support', 'financial', 'administration'] as NavGroup[]).map((groupKey) => {
              const groupItems = groupedNavItems[groupKey]
              if (groupItems.length === 0) return null

              const config = getGroupConfig(groupKey)
              const isExpanded = expandedGroups.has(groupKey)

              return (
                <div key={groupKey} className="border-t border-gray-100">
                  <button
                    onClick={() => toggleGroup(groupKey)}
                    className={cn(
                      'w-full flex items-center justify-between px-6 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider',
                      'hover:text-gray-700 hover:bg-gray-50 transition-colors'
                    )}
                  >
                    <span>{config.title}</span>
                    {isExpanded ? (
                      <ChevronDown className="h-3.5 w-3.5" />
                    ) : (
                      <ChevronRightIcon className="h-3.5 w-3.5" />
                    )}
                  </button>

                  {isExpanded && (
                    <div className="px-3 pb-2 space-y-0.5 motion-safe:animate-in motion-safe:slide-in-from-top-1 motion-safe:duration-200">
                      {groupItems.map((item) => (
                        <SidebarNavItem
                          key={item.path}
                          href={item.path}
                          label={item.title}
                          icon={item.icon!}
                          badge={item.badge}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
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
