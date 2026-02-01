/**
 * Sidebar Component
 *
 * Navigation sidebar with simplified architecture for battery installation CRM.
 *
 * Structure:
 * - Search (⌘K)
 * - Daily Work (Dashboard, My Tasks, Schedule)
 * - Sales (Customers, Pipeline, Orders)
 * - Delivery (Projects, Installers)
 * - Active Projects (contextual, shows recent in-progress projects)
 * - Footer (Inventory, Support, Reports icons + Settings modal)
 *
 * @see src/lib/routing/routes.ts for navigation configuration
 */
import { useMemo, useState } from 'react'
import { useNavigate, useRouterState, Link } from '@tanstack/react-router'
import {
  Settings,
  LogOut,
  Search,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { SidebarNavItem } from './sidebar-nav-item'
import { SidebarRail } from './sidebar-rail'
import { OrgSwitcher } from './org-switcher'
import { useSignOut } from '@/lib/auth/hooks'
import { getNavRoutesByGroup, type NavGroup } from '@/lib/routing'
import {
  useSidebarSafe,
  SIDEBAR_WIDTH,
  SIDEBAR_WIDTH_COLLAPSED,
  type SidebarCollapsible,
} from './sidebar-provider'
import { toast, useActiveProjects } from '@/hooks'
import { useCurrentUser } from '@/hooks'
import { hasAnyPermission, hasPermission, type Role } from '@/lib/auth/permissions'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Skeleton } from '@/components/ui/skeleton'
import { SettingsDialog } from './settings-dialog'

// ============================================================================
// TYPES
// ============================================================================

interface SidebarProps {
  collapsed?: boolean
  onCollapsedChange?: (collapsed: boolean) => void
  collapsible?: SidebarCollapsible
}

// ============================================================================
// PROGRESS INDICATOR
// ============================================================================

function ProgressCircle({ progress, className }: { progress: number; className?: string }) {
  const circumference = 2 * Math.PI * 6 // radius = 6
  const strokeDashoffset = circumference - (progress / 100) * circumference

  return (
    <svg className={cn('h-4 w-4', className)} viewBox="0 0 16 16">
      {/* Background circle */}
      <circle
        cx="8"
        cy="8"
        r="6"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        className="text-muted/30"
      />
      {/* Progress circle */}
      <circle
        cx="8"
        cy="8"
        r="6"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={strokeDashoffset}
        className="text-primary transition-all duration-300"
        transform="rotate(-90 8 8)"
      />
    </svg>
  )
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

  // Fetch active projects for contextual section
  const { data: activeProjects, isLoading: projectsLoading } = useActiveProjects(5)

  // Settings dialog state
  const [settingsOpen, setSettingsOpen] = useState(false)

  // Use context if available, otherwise fall back to legacy props
  const isCollapsed = sidebarContext?.isCollapsed ?? legacyCollapsed ?? false
  const collapsible = sidebarContext?.collapsible ?? propCollapsible
  // Toggle is available from context or legacy callback (used by SidebarRail)
  void (sidebarContext?.toggle ?? (() => legacyOnCollapsedChange?.(!isCollapsed)))

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
      daily: [],
      sales: [],
      delivery: [],
      footer: [],
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

  // Width based on collapse state and mode
  const width = showCollapsedView ? SIDEBAR_WIDTH_COLLAPSED : SIDEBAR_WIDTH

  return (
    <aside
      role="navigation"
      aria-label="Main navigation"
      className={cn(
        'group relative flex h-full flex-col border-r border-border bg-background',
        'transition-all duration-200 ease-in-out'
      )}
      style={{ width }}
    >
      {/* Logo/Brand area */}
      <div
        className={cn(
          'flex h-16 items-center border-b border-border',
          showCollapsedView ? 'justify-center px-2' : 'justify-between px-4'
        )}
      >
        {!showCollapsedView && (
          <span className="text-xl font-semibold text-foreground">Renoz</span>
        )}
        {showCollapsedView && (
          <span className="text-xl font-semibold text-foreground">R</span>
        )}
      </div>

      {/* Organization switcher */}
      <div className="border-b border-border p-2">
        <OrgSwitcher collapsed={showCollapsedView} />
      </div>

      {/* Search trigger */}
      {!showCollapsedView && (
        <div className="px-3 py-2">
          <button
            type="button"
            className={cn(
              'flex w-full items-center gap-2 rounded-lg px-3 py-2',
              'bg-muted/50 text-muted-foreground',
              'hover:bg-muted transition-colors duration-200',
              'focus:outline-none focus:ring-2 focus:ring-ring'
            )}
            onClick={() => {
              // Trigger command palette
              const event = new KeyboardEvent('keydown', { key: 'k', metaKey: true })
              document.dispatchEvent(event)
            }}
          >
            <Search className="h-4 w-4" />
            <span className="flex-1 text-left text-sm">Search...</span>
            <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded bg-background px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground border border-border">
              <span>⌘</span>K
            </kbd>
          </button>
        </div>
      )}

      {/* Main navigation */}
      <nav className="flex-1 overflow-y-auto py-2" aria-label="Primary navigation">
        {showCollapsedView ? (
          // Collapsed view: flat list with icons only
          <div className="px-2 space-y-1">
            {[...groupedNavItems.daily, ...groupedNavItems.sales, ...groupedNavItems.delivery].map((item) => (
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
          // Expanded view: grouped sections
          <div className="space-y-4">
            {/* Daily Work */}
            <div className="px-3">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-3 mb-1">
                Daily
              </p>
              <div className="space-y-0.5">
                {groupedNavItems.daily.map((item) => (
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

            {/* Sales */}
            <div className="px-3">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-3 mb-1">
                Sales
              </p>
              <div className="space-y-0.5">
                {groupedNavItems.sales.map((item) => (
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

            {/* Delivery */}
            <div className="px-3">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-3 mb-1">
                Delivery
              </p>
              <div className="space-y-0.5">
                {groupedNavItems.delivery.map((item) => (
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

            {/* Active Projects - Contextual Section */}
            <div className="px-3 border-t border-border pt-4">
              <div className="flex items-center justify-between px-3 mb-1">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Active Projects
                </p>
                <Link
                  to="/projects"
                  className="text-[10px] text-muted-foreground hover:text-foreground transition-colors"
                >
                  View all
                </Link>
              </div>
              <div className="space-y-0.5">
                {projectsLoading ? (
                  // Loading skeleton
                  <>
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="flex items-center gap-3 px-3 py-2">
                        <Skeleton className="h-4 w-4 rounded-full" />
                        <Skeleton className="h-4 flex-1" />
                      </div>
                    ))}
                  </>
                ) : activeProjects && activeProjects.length > 0 ? (
                  activeProjects.map((project) => (
                    <Link
                      key={project.id}
                      to="/projects/$projectId"
                      params={{ projectId: project.id }}
                      className={cn(
                        'flex items-center gap-3 rounded-lg px-3 py-2 text-sm',
                        'text-muted-foreground hover:text-foreground hover:bg-muted',
                        'transition-colors duration-200',
                        currentPath.includes(project.id) && 'bg-muted text-foreground'
                      )}
                    >
                      <ProgressCircle progress={project.progress} />
                      <span className="flex-1 truncate">{project.title}</span>
                      <span className="text-[10px] text-muted-foreground">
                        {project.progress}%
                      </span>
                    </Link>
                  ))
                ) : (
                  <p className="px-3 py-2 text-sm text-muted-foreground">
                    No active projects
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* Footer - Icon buttons for secondary navigation */}
      <div className="border-t border-border p-2">
        {/* Footer nav items (Inventory, Support, Reports) */}
        <div className={cn(
          'flex items-center gap-1 mb-2',
          showCollapsedView ? 'flex-col' : 'justify-center'
        )}>
          {groupedNavItems.footer.map((item) => (
            <Tooltip key={item.path} delayDuration={0}>
              <TooltipTrigger asChild>
                <Link
                  to={item.path}
                  className={cn(
                    'flex items-center justify-center rounded-lg p-2',
                    'text-muted-foreground hover:text-foreground hover:bg-muted',
                    'transition-colors duration-200',
                    currentPath.startsWith(item.path) && 'bg-muted text-foreground'
                  )}
                >
                  {item.icon && <item.icon className="h-5 w-5" />}
                </Link>
              </TooltipTrigger>
              <TooltipContent side={showCollapsedView ? 'right' : 'top'}>
                {item.title}
              </TooltipContent>
            </Tooltip>
          ))}

          {/* Settings - Opens Modal */}
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={() => setSettingsOpen(true)}
                className={cn(
                  'flex items-center justify-center rounded-lg p-2',
                  'text-muted-foreground hover:text-foreground hover:bg-muted',
                  'transition-colors duration-200'
                )}
              >
                <Settings className="h-5 w-5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side={showCollapsedView ? 'right' : 'top'}>
              Settings
            </TooltipContent>
          </Tooltip>
        </div>

        {/* Sign out button */}
        <button
          type="button"
          onClick={handleSignOut}
          disabled={signOut.isPending}
          className={cn(
            'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium',
            'text-muted-foreground hover:bg-muted hover:text-foreground',
            'transition-colors duration-200',
            'focus:outline-none focus:ring-2 focus:ring-ring',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            showCollapsedView && 'justify-center px-2'
          )}
          title={showCollapsedView ? 'Log out' : undefined}
        >
          <LogOut className="h-5 w-5 flex-shrink-0" aria-hidden="true" />
          {!showCollapsedView && <span>{signOut.isPending ? 'Logging out...' : 'Log out'}</span>}
        </button>
      </div>

      {/* Sidebar rail for hover/click toggle */}
      {sidebarContext && <SidebarRail />}

      {/* Keyboard shortcut hint */}
      {!showCollapsedView && (
        <div className="border-t border-border px-4 py-2 text-center">
          <span className="text-xs text-muted-foreground">
            <kbd className="rounded bg-muted px-1 border border-border">⌘</kbd>
            <kbd className="rounded bg-muted px-1 ml-0.5 border border-border">B</kbd>
            {' '}to toggle
          </span>
        </div>
      )}

      {/* Settings Dialog */}
      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
    </aside>
  )
}
