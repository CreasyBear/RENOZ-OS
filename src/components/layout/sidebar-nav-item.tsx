/**
 * Sidebar Navigation Item Component
 *
 * Individual navigation item with icon, label, and active state.
 * Supports collapsed mode (icon only) and proper ARIA attributes.
 */
import { Link, useRouterState } from '@tanstack/react-router'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import type { LucideIcon } from 'lucide-react'

export interface NavItemProps {
  href: string
  label: string
  icon: LucideIcon
  collapsed?: boolean
  badge?: string
}

export function SidebarNavItem({ href, label, icon: Icon, collapsed, badge }: NavItemProps) {
  const router = useRouterState()
  const isActive = router.location.pathname === href ||
    router.location.pathname.startsWith(href + '/')

  return (
    <Link
      to={href}
      className={cn(
        'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
        'hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-200',
        isActive
          ? 'bg-gray-100 text-gray-900'
          : 'text-gray-600 hover:text-gray-900',
        collapsed && 'justify-center px-2'
      )}
      aria-current={isActive ? 'page' : undefined}
      title={collapsed ? label : undefined}
    >
      <Icon
        className={cn('h-5 w-5 flex-shrink-0', isActive ? 'text-gray-900' : 'text-gray-500')}
        aria-hidden="true"
      />
      {!collapsed && (
        <span className="flex-1 truncate">{label}</span>
      )}
      {!collapsed && badge && (
        <Badge variant="secondary" className="ml-auto text-[10px] px-1.5 py-0 h-4">
          {badge}
        </Badge>
      )}
    </Link>
  )
}
