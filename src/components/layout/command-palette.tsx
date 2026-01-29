/**
 * Command Palette Component
 *
 * Cmd+K searchable command interface for quick navigation and actions.
 *
 * Features:
 * - Opens on Cmd/Ctrl+K keyboard shortcut
 * - Searchable navigation items
 * - Quick actions (Create Customer, etc.)
 * - Recent pages section
 * - Keyboard navigation (arrow keys, enter to select)
 * - Role-based filtering (hides items user can't access)
 */
import { useEffect, useState, useCallback, useMemo } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { Command } from 'cmdk'
import * as Dialog from '@radix-ui/react-dialog'
import {
  Search,
  Plus,
  FileText,
  ArrowRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { getNavRoutes } from '@/lib/routing'
import { useCurrentUser } from '@/hooks'
import { hasPermission, type PermissionAction, type Role } from '@/lib/auth/permissions'

// ============================================================================
// TYPES
// ============================================================================

interface CommandItem {
  id: string
  label: string
  description?: string
  icon?: React.ReactNode
  shortcut?: string[]
  onSelect: () => void
  group: 'navigation' | 'actions' | 'recent'
}

// ============================================================================
// QUICK ACTIONS
// ============================================================================

interface QuickAction {
  id: string
  label: string
  description: string
  icon: React.ReactNode
  route: string
  /** Required permission to see this action */
  requiredPermission?: PermissionAction
}

const QUICK_ACTIONS: QuickAction[] = [
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
    label: 'Create Quote',
    description: 'Start a new quote',
    icon: <FileText className="h-4 w-4" />,
    route: '/pipeline/$opportunityId',
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

  const open = controlledOpen ?? internalOpen

  // Wrap setOpen to handle search reset on close
  const setOpen = useCallback((isOpen: boolean | ((prev: boolean) => boolean)) => {
    const newOpenState = typeof isOpen === 'function' ? isOpen(open) : isOpen

    // Reset search when closing
    if (!newOpenState) {
      setSearch('')
    }

    if (onOpenChange) {
      onOpenChange(newOpenState)
    } else {
      setInternalOpen(newOpenState)
    }
  }, [open, onOpenChange])

  // Handle Cmd+K keyboard shortcut
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen(!open)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, setOpen])

  const handleSelect = useCallback((callback: () => void) => {
    setOpen(false)
    callback()
  }, [setOpen])

  // Build navigation items filtered by permissions
  const navigationItems = useMemo((): CommandItem[] => {
    const navRoutes = getNavRoutes()

    // Filter routes based on user permissions
    const filteredRoutes = user?.role
      ? navRoutes.filter((route) => {
          if (!route.requiredPermission) return true
          return hasPermission(user.role as Role, route.requiredPermission)
        })
      : navRoutes

    return filteredRoutes.map((route) => ({
      id: `nav-${route.path}`,
      label: route.title,
      description: route.description,
      icon: route.icon ? <route.icon className="h-4 w-4" /> : null,
      onSelect: () => navigate({ to: route.path }),
      group: 'navigation' as const,
    }))
  }, [user, navigate])

  // Build action items filtered by permissions
  const actionItems = useMemo((): CommandItem[] => {
    // Filter actions based on user permissions
    const filteredActions = user?.role
      ? QUICK_ACTIONS.filter((action) => {
          if (!action.requiredPermission) return true
          return hasPermission(user.role as Role, action.requiredPermission)
        })
      : QUICK_ACTIONS

    return filteredActions.map((action) => ({
      id: action.id,
      label: action.label,
      description: action.description,
      icon: action.icon,
      onSelect: () => navigate({ to: action.route }),
      group: 'actions' as const,
    }))
  }, [user, navigate])

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Portal>
        <Dialog.Overlay
          className={cn(
            'fixed inset-0 z-50 bg-black/50',
            'data-[state=open]:animate-in data-[state=closed]:animate-out',
            'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0'
          )}
        />
        <Dialog.Content
          className={cn(
            'fixed left-1/2 top-1/4 z-50 w-full max-w-lg -translate-x-1/2',
            'bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden',
            'data-[state=open]:animate-in data-[state=closed]:animate-out',
            'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
            'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
            'data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%]',
            'data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]'
          )}
        >
          <Command
            className="flex flex-col"
            shouldFilter={true}
          >
            {/* Search input */}
            <div className="flex items-center border-b border-gray-200 px-4">
              <Search className="h-4 w-4 text-gray-400" aria-hidden="true" />
              <Command.Input
                value={search}
                onValueChange={setSearch}
                placeholder="Type a command or search..."
                className={cn(
                  'flex-1 h-12 px-3 bg-transparent text-sm',
                  'placeholder:text-gray-400 focus:outline-none'
                )}
              />
              <kbd className="hidden sm:inline-flex items-center gap-1 rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-500">
                esc
              </kbd>
            </div>

            {/* Results */}
            <Command.List className="max-h-80 overflow-y-auto p-2">
              <Command.Empty className="py-6 text-center text-sm text-gray-500">
                No results found.
              </Command.Empty>

              {/* Navigation group */}
              <Command.Group
                heading="Navigation"
                className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-gray-500"
              >
                {navigationItems.map((item) => (
                  <Command.Item
                    key={item.id}
                    value={item.label}
                    onSelect={() => handleSelect(item.onSelect)}
                    className={cn(
                      'flex items-center gap-3 px-2 py-2 rounded-lg cursor-pointer',
                      'text-sm text-gray-700',
                      'aria-selected:bg-gray-100'
                    )}
                  >
                    <span className="text-gray-500">{item.icon}</span>
                    <span className="flex-1">{item.label}</span>
                    <ArrowRight className="h-4 w-4 text-gray-400" aria-hidden="true" />
                  </Command.Item>
                ))}
              </Command.Group>

              {/* Actions group */}
              <Command.Group
                heading="Quick Actions"
                className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-gray-500"
              >
                {actionItems.map((item) => (
                  <Command.Item
                    key={item.id}
                    value={`${item.label} ${item.description || ''}`}
                    onSelect={() => handleSelect(item.onSelect)}
                    className={cn(
                      'flex items-center gap-3 px-2 py-2 rounded-lg cursor-pointer',
                      'text-sm text-gray-700',
                      'aria-selected:bg-gray-100'
                    )}
                  >
                    <span className="text-gray-500">{item.icon}</span>
                    <div className="flex-1">
                      <div>{item.label}</div>
                      {item.description && (
                        <div className="text-xs text-gray-500">{item.description}</div>
                      )}
                    </div>
                  </Command.Item>
                ))}
              </Command.Group>
            </Command.List>

            {/* Footer */}
            <div className="flex items-center justify-between border-t border-gray-200 px-4 py-2 text-xs text-gray-500">
              <span>
                <kbd className="rounded bg-gray-100 px-1">↑↓</kbd> to navigate
              </span>
              <span>
                <kbd className="rounded bg-gray-100 px-1">↵</kbd> to select
              </span>
            </div>
          </Command>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
