/**
 * Breadcrumbs Component
 *
 * Displays navigation breadcrumbs based on the current route.
 * Uses centralized ROUTE_METADATA for labels.
 */
import { Link, useRouterState } from '@tanstack/react-router'
import { ChevronRight, Home } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getBreadcrumbLabel } from '@/lib/routing'

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

      {breadcrumbs.map((item) => (
        <div key={item.href} className="flex items-center">
          <ChevronRight className="h-4 w-4 text-gray-400" aria-hidden="true" />
          {item.current ? (
            <span
              className="ml-1 font-medium text-gray-900"
              aria-current="page"
            >
              {item.label}
            </span>
          ) : (
            <Link
              to={item.href}
              className={cn(
                'ml-1 text-gray-500 hover:text-gray-700 transition-colors',
                'focus:outline-none focus:ring-2 focus:ring-gray-200 rounded'
              )}
            >
              {item.label}
            </Link>
          )}
        </div>
      ))}
    </nav>
  )
}
