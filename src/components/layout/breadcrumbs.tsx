/**
 * Breadcrumbs Component
 *
 * Displays navigation breadcrumbs based on the current route.
 * Uses centralized ROUTE_METADATA for labels.
 * Collapses middle segments on mobile with an ellipsis dropdown.
 */
import { Link, useRouterState, type LinkProps } from '@tanstack/react-router'
import { ChevronRight, Home, MoreHorizontal } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getBreadcrumbLabel } from '@/lib/routing'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

// Helper to create Link with dynamic href (bypasses strict route typing)
type DynamicLinkProps = Omit<LinkProps, 'to'> & { to: string }
function DynamicLink({ to, ...props }: DynamicLinkProps) {
  return <Link to={to as LinkProps['to']} {...props} />
}

interface BreadcrumbItem {
  label: string
  href: string
  current: boolean
}

export function Breadcrumbs() {
  const router = useRouterState()
  const pathname = router.location.pathname

  // Parse pathname into breadcrumb items
  const segments = pathname.split('/').filter(Boolean)
  const breadcrumbs: BreadcrumbItem[] = segments.map((_, index) => {
    const href = '/' + segments.slice(0, index + 1).join('/')
    const label = getBreadcrumbLabel(href)
    const current = index === segments.length - 1

    return { label, href, current }
  })

  // Don't show breadcrumbs for root/dashboard only
  if (breadcrumbs.length <= 1 && breadcrumbs[0]?.label === 'Dashboard') {
    return null
  }

  // On mobile, collapse middle items when there are more than 2 breadcrumbs
  // Show: Home > ... (dropdown) > Current
  const shouldCollapse = breadcrumbs.length > 2
  const firstItem = breadcrumbs[0]
  const middleItems = breadcrumbs.slice(1, -1)
  const lastItem = breadcrumbs[breadcrumbs.length - 1]

  return (
    <nav aria-label="Breadcrumb" className="flex items-center space-x-1 text-sm">
      <Link
        to="/dashboard"
        className={cn(
          'text-gray-500 hover:text-gray-700 transition-colors',
          'focus:outline-none focus:ring-2 focus:ring-gray-200 rounded'
        )}
      >
        <Home className="h-4 w-4" aria-label="Home" />
      </Link>

      {/* Desktop: show all breadcrumbs */}
      <div className="hidden sm:flex sm:items-center">
        {breadcrumbs.map((item) => (
          <div key={item.href} className="flex items-center">
            <ChevronRight className="h-4 w-4 text-gray-400" aria-hidden="true" />
            {item.current ? (
              <span
                className="ml-1 font-medium text-gray-900 truncate max-w-[200px]"
                aria-current="page"
              >
                {item.label}
              </span>
            ) : (
              <DynamicLink
                to={item.href}
                className={cn(
                  'ml-1 text-gray-500 hover:text-gray-700 transition-colors truncate max-w-[150px]',
                  'focus:outline-none focus:ring-2 focus:ring-gray-200 rounded'
                )}
              >
                {item.label}
              </DynamicLink>
            )}
          </div>
        ))}
      </div>

      {/* Mobile: collapse middle items into dropdown */}
      <div className="flex sm:hidden items-center">
        {/* First item (if not current) */}
        {shouldCollapse && firstItem && !firstItem.current && (
          <div className="flex items-center">
            <ChevronRight className="h-4 w-4 text-gray-400" aria-hidden="true" />
            <DynamicLink
              to={firstItem.href}
              className={cn(
                'ml-1 text-gray-500 hover:text-gray-700 transition-colors truncate max-w-[80px]',
                'focus:outline-none focus:ring-2 focus:ring-gray-200 rounded'
              )}
            >
              {firstItem.label}
            </DynamicLink>
          </div>
        )}

        {/* Collapsed middle items as dropdown */}
        {shouldCollapse && middleItems.length > 0 && (
          <div className="flex items-center">
            <ChevronRight className="h-4 w-4 text-gray-400" aria-hidden="true" />
            <DropdownMenu>
              <DropdownMenuTrigger
                className={cn(
                  'ml-1 p-1 text-gray-500 hover:text-gray-700 transition-colors',
                  'focus:outline-none focus:ring-2 focus:ring-gray-200 rounded'
                )}
                aria-label="Show hidden breadcrumbs"
              >
                <MoreHorizontal className="h-4 w-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                {middleItems.map((item) => (
                  <DropdownMenuItem key={item.href} asChild>
                    <DynamicLink to={item.href}>{item.label}</DynamicLink>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}

        {/* Last item (current page) */}
        {shouldCollapse && lastItem && (
          <div className="flex items-center">
            <ChevronRight className="h-4 w-4 text-gray-400" aria-hidden="true" />
            <span
              className="ml-1 font-medium text-gray-900 truncate max-w-[120px]"
              aria-current="page"
            >
              {lastItem.label}
            </span>
          </div>
        )}

        {/* When not collapsing (2 or fewer items), show all on mobile */}
        {!shouldCollapse &&
          breadcrumbs.map((item) => (
            <div key={item.href} className="flex items-center">
              <ChevronRight className="h-4 w-4 text-gray-400" aria-hidden="true" />
              {item.current ? (
                <span
                  className="ml-1 font-medium text-gray-900 truncate max-w-[120px]"
                  aria-current="page"
                >
                  {item.label}
                </span>
              ) : (
                <DynamicLink
                  to={item.href}
                  className={cn(
                    'ml-1 text-gray-500 hover:text-gray-700 transition-colors truncate max-w-[100px]',
                    'focus:outline-none focus:ring-2 focus:ring-gray-200 rounded'
                  )}
                >
                  {item.label}
                </DynamicLink>
              )}
            </div>
          ))}
      </div>
    </nav>
  )
}
