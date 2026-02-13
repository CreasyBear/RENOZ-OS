/**
 * Command Palette Component
 *
 * Cmd+K searchable command interface for quick navigation, actions, and entity search.
 *
 * Features:
 * - Opens on Cmd/Ctrl+K keyboard shortcut
 * - Async entity search via quickSearch (debounced 300ms)
 * - Recently viewed entities section
 * - Searchable navigation items
 * - Quick actions (Create Customer, etc.)
 * - Keyboard navigation (arrow keys, enter to select, esc to close)
 * - Role-based filtering (hides items user can't access)
 * - Dark mode support via shadcn/ui design tokens
 */
import { useState, useCallback, useMemo } from 'react'
import { useNavigate } from '@tanstack/react-router'
import {
  Plus,
  FileText,
  ArrowRight,
  Clock,
  Loader2,
  Search,
} from 'lucide-react'
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandShortcut,
  CommandSeparator,
} from '@/components/ui/command'
import { cn } from '@/lib/utils'
import { getNavRoutes, getSearchableRoutes } from '@/lib/routing'
import { getEntityIcon, getEntityGroupLabel, getEntityUrl } from '@/lib/routing/entity-icons'
import { useCurrentUser } from '@/hooks'
import { hasPermission, type PermissionAction, type Role } from '@/lib/auth/permissions'
import { useDebounce } from '@/hooks/_shared/use-debounce'
import { useQuickSearch } from '@/hooks/search/use-quick-search'
import { useRecentItems } from '@/hooks/search/use-recent-items'
import { useOpenQuickLog } from '@/contexts/open-quick-log-context'
import { useKeyboardShortcut } from './use-keyboard-shortcut'

// ============================================================================
// TYPES
// ============================================================================

interface QuickAction {
  id: string
  label: string
  description: string
  icon: React.ReactNode
  route?: string
  onSelect?: () => void
  shortcut?: string
  requiredPermission?: PermissionAction
}

// ============================================================================
// QUICK ACTIONS
// ============================================================================

const QUICK_ACTIONS_BASE: Omit<QuickAction, 'onSelect'>[] = [
  {
    id: 'create-customer',
    label: 'Create Customer',
    description: 'Add a new customer',
    icon: <Plus className="h-4 w-4" />,
    route: '/customers/new',
    requiredPermission: 'customer.create',
  },
  {
    id: 'create-quote',
    label: 'New Opportunity',
    description: 'Start a new opportunity',
    icon: <FileText className="h-4 w-4" />,
    route: '/pipeline/new',
    requiredPermission: 'quote.create',
  },
  {
    id: 'create-order',
    label: 'Create Order',
    description: 'Create a new order',
    icon: <Plus className="h-4 w-4" />,
    route: '/orders/create',
    requiredPermission: 'order.create',
  },
  {
    id: 'create-purchase-order',
    label: 'Create Purchase Order',
    description: 'Create a new purchase order',
    icon: <FileText className="h-4 w-4" />,
    route: '/purchase-orders/create',
    requiredPermission: 'suppliers.read',
  },
  {
    id: 'create-product',
    label: 'Create Product',
    description: 'Add a new product',
    icon: <Plus className="h-4 w-4" />,
    route: '/products/new',
    requiredPermission: 'product.create',
  },
  {
    id: 'quick-log',
    label: 'Quick Log',
    description: 'Log a call, note, or meeting',
    icon: <Plus className="h-4 w-4" />,
    requiredPermission: 'activity.read',
  },
]

// ============================================================================
// COMPONENT
// ============================================================================

interface CommandPaletteProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function CommandPalette({ open: controlledOpen, onOpenChange }: CommandPaletteProps) {
  const [internalOpen, setInternalOpen] = useState(false)
  const [search, setSearch] = useState('')
  const navigate = useNavigate()
  const { user } = useCurrentUser()
  const openQuickLogContext = useOpenQuickLog()

  const open = controlledOpen ?? internalOpen
  const debouncedSearch = useDebounce(search, 300)
  const isSearching = debouncedSearch.length >= 2

  // Async entity search
  const { data: searchData, isLoading: isSearchLoading } = useQuickSearch(debouncedSearch, {
    limit: 8,
    enabled: open && isSearching,
  })

  // Recent items (shown when not searching)
  const { data: recentData } = useRecentItems({
    limit: 8,
    enabled: open && !search,
  })

  const setOpen = useCallback((isOpen: boolean | ((prev: boolean) => boolean)) => {
    const newOpenState = typeof isOpen === 'function' ? isOpen(open) : isOpen

    if (!newOpenState) {
      setSearch('')
    }

    if (onOpenChange) {
      onOpenChange(newOpenState)
    } else {
      setInternalOpen(newOpenState)
    }
  }, [open, onOpenChange])

  // Handle Cmd+K keyboard shortcut (via centralized provider)
  useKeyboardShortcut('command-palette', () => setOpen((prev) => !prev))

  const handleSelect = useCallback((callback: () => void) => {
    setOpen(false)
    callback()
  }, [setOpen])

  // Build navigation items filtered by permissions
  const { navigationItems, morePages } = useMemo(() => {
    const navRoutes = getNavRoutes()
    const allRoutes = getSearchableRoutes()
    const navPaths = new Set(navRoutes.map((r) => r.path))

    const filterByPermission = (routes: typeof allRoutes) =>
      user?.role
        ? routes.filter((route) => {
            if (!route.requiredPermission) return true
            const permission = Array.isArray(route.requiredPermission)
              ? route.requiredPermission[0]
              : route.requiredPermission
            return hasPermission(user.role as Role, permission)
          })
        : routes

    const mapRoute = (route: (typeof allRoutes)[number]) => ({
      id: `nav-${route.path}`,
      label: route.title,
      description: route.description,
      icon: route.icon,
      onSelect: () => navigate({ to: route.path }),
    })

    const filteredNav = filterByPermission(navRoutes).map(mapRoute)
    const filteredMore = filterByPermission(
      allRoutes.filter((r) => !navPaths.has(r.path))
    ).map(mapRoute)

    return { navigationItems: filteredNav, morePages: filteredMore }
  }, [user, navigate])

  // Build quick actions: wire quick-log to context when available
  const quickActions = useMemo((): QuickAction[] => {
    return QUICK_ACTIONS_BASE.map((base) =>
      base.id === 'quick-log'
        ? { ...base, onSelect: openQuickLogContext?.openQuickLog }
        : (base as QuickAction)
    )
  }, [openQuickLogContext])

  // Build action items filtered by permissions (exclude quick-log if no handler)
  const actionItems = useMemo(() => {
    const eligible = quickActions.filter(
      (action) =>
        action.id !== 'quick-log' || (action.onSelect != null)
    )
    return user?.role
      ? eligible.filter((action) => {
          if (!action.requiredPermission) return true
          const permission = Array.isArray(action.requiredPermission)
            ? action.requiredPermission[0]
            : action.requiredPermission
          return hasPermission(user.role as Role, permission)
        })
      : eligible
  }, [user, quickActions])

  // Group search results by entity type
  const searchResultGroups = useMemo(() => {
    if (!searchData?.results?.length) return []

    const groups = new Map<string, typeof searchData.results>()
    for (const result of searchData.results) {
      const existing = groups.get(result.entityType) ?? []
      existing.push(result)
      groups.set(result.entityType, existing)
    }

    return Array.from(groups.entries()).map(([entityType, results]) => ({
      entityType,
      label: getEntityGroupLabel(entityType),
      results,
    }))
  }, [searchData])

  return (
    <CommandDialog
      open={open}
      onOpenChange={setOpen}
      title="Command Palette"
      description="Search commands, entities, or navigate to any page"
      showCloseButton={false}
    >
      <CommandInput
        placeholder="Search commands, pages, or entities..."
        value={search}
        onValueChange={setSearch}
      />
      <CommandList className="max-h-80">
        <CommandEmpty>
          <div className="py-6 text-center">
            <Search className="mx-auto h-10 w-10 text-muted-foreground/50" aria-hidden="true" />
            <p className="mt-2 text-sm font-medium">No results found</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Try searching for customers, orders, or projects
            </p>
          </div>
        </CommandEmpty>

        {/* Loading indicator for async search */}
        <div aria-live="polite" aria-atomic="true">
          {isSearching && isSearchLoading && (
            <div className="flex items-center justify-center gap-2 py-4 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              <span>Searching...</span>
            </div>
          )}
        </div>

        {/* Search results (grouped by entity type) */}
        {searchResultGroups.map((group) => {
          const Icon = getEntityIcon(group.entityType)
          return (
            <CommandGroup key={group.entityType} heading={group.label}>
              {group.results.map((result) => (
                <CommandItem
                  key={`${result.entityType}-${result.entityId}`}
                  value={`${result.title} ${result.subtitle ?? ''}`}
                  onSelect={() =>
                    handleSelect(() =>
                      navigate({ to: getEntityUrl(result.entityType, result.entityId, result.url) })
                    )
                  }
                  className="cursor-pointer"
                >
                  <Icon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                  <div className="flex-1 overflow-hidden">
                    <span className="truncate">{result.title}</span>
                    {result.subtitle && (
                      <span className="ml-2 text-xs text-muted-foreground truncate">
                        {result.subtitle}
                      </span>
                    )}
                  </div>
                  <ArrowRight className="h-3 w-3 text-muted-foreground" aria-hidden="true" />
                </CommandItem>
              ))}
            </CommandGroup>
          )
        })}

        {searchResultGroups.length > 0 && <CommandSeparator />}

        {/* Recently viewed (when not searching) */}
        {!search && recentData?.items && recentData.items.length > 0 && (
          <>
            <CommandGroup heading="Recently Viewed">
              {recentData.items.map((item) => {
                const Icon = getEntityIcon(item.entityType)
                return (
                  <CommandItem
                    key={`recent-${item.entityType}-${item.entityId}`}
                    value={`${item.title} ${item.subtitle ?? ''}`}
                    onSelect={() =>
                      handleSelect(() =>
                        navigate({ to: getEntityUrl(item.entityType, item.entityId, item.url) })
                      )
                    }
                    className="cursor-pointer"
                  >
                    <Clock className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
                    <Icon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                    <div className="flex-1 overflow-hidden">
                      <span className="truncate">{item.title}</span>
                      {item.subtitle && (
                        <span className="ml-2 text-xs text-muted-foreground truncate">
                          {item.subtitle}
                        </span>
                      )}
                    </div>
                  </CommandItem>
                )
              })}
            </CommandGroup>
            <CommandSeparator />
          </>
        )}

        {/* Navigation group */}
        <CommandGroup heading="Navigation">
          {navigationItems.map((item) => (
            <CommandItem
              key={item.id}
              value={`${item.label} ${item.description ?? ''}`}
              onSelect={() => handleSelect(item.onSelect)}
              className="cursor-pointer"
            >
              {item.icon && <item.icon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />}
              <span className="flex-1">{item.label}</span>
              <ArrowRight className="h-3 w-3 text-muted-foreground" aria-hidden="true" />
            </CommandItem>
          ))}
        </CommandGroup>

        {/* More pages (hidden from sidebar but searchable) */}
        {morePages.length > 0 && (
          <CommandGroup heading="More Pages">
            {morePages.map((item) => (
              <CommandItem
                key={item.id}
                value={`${item.label} ${item.description ?? ''}`}
                onSelect={() => handleSelect(item.onSelect)}
                className="cursor-pointer"
              >
                {item.icon && <item.icon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />}
                <div className="flex-1">
                  <span>{item.label}</span>
                  {item.description && (
                    <span className="ml-2 text-xs text-muted-foreground">{item.description}</span>
                  )}
                </div>
                <ArrowRight className="h-3 w-3 text-muted-foreground" aria-hidden="true" />
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        <CommandSeparator />

        {/* Quick Actions group */}
        <CommandGroup heading="Quick Actions">
          {actionItems.map((action) => (
            <CommandItem
              key={action.id}
              value={`${action.label} ${action.description}`}
              onSelect={() =>
                handleSelect(() => {
                  if (action.onSelect) {
                    action.onSelect()
                    return
                  }
                  if (action.route) {
                    navigate({ to: action.route })
                  }
                })
              }
              className="cursor-pointer"
            >
              <span className="text-muted-foreground">{action.icon}</span>
              <div className="flex-1">
                <div>{action.label}</div>
                <div className="text-xs text-muted-foreground">{action.description}</div>
              </div>
              {action.shortcut && <CommandShortcut>{action.shortcut}</CommandShortcut>}
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>

      {/* Footer with keyboard hints */}
      <div className="flex items-center gap-4 border-t px-3 py-2 text-xs text-muted-foreground">
        <span>
          <kbd className={cn(
            "pointer-events-none inline-flex h-5 select-none items-center gap-1",
            "rounded border bg-muted px-1.5 font-mono text-[10px] font-medium"
          )}>
            <span className="text-xs">↑↓</span>
          </kbd>
          {' '}Navigate
        </span>
        <span>
          <kbd className={cn(
            "pointer-events-none inline-flex h-5 select-none items-center gap-1",
            "rounded border bg-muted px-1.5 font-mono text-[10px] font-medium"
          )}>
            ↵
          </kbd>
          {' '}Select
        </span>
        <span>
          <kbd className={cn(
            "pointer-events-none inline-flex h-5 select-none items-center gap-1",
            "rounded border bg-muted px-1.5 font-mono text-[10px] font-medium"
          )}>
            esc
          </kbd>
          {' '}Close
        </span>
      </div>
    </CommandDialog>
  )
}
