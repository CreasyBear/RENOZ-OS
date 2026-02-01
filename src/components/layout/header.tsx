/**
 * Header Component
 *
 * Top header with breadcrumbs, search trigger, notifications, and user menu.
 *
 * Features:
 * - Breadcrumbs based on current route
 * - Search trigger with Cmd+K hint
 * - Notification bell (placeholder)
 * - User avatar dropdown
 * - Responsive layout
 */
import { Bell, Search, Menu, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Breadcrumbs } from './breadcrumbs'
import { UserMenu } from './user-menu'

interface HeaderProps {
  onMobileMenuClick?: () => void
  onAIClick?: () => void
}

export function Header({ onMobileMenuClick, onAIClick }: HeaderProps) {
  return (
    <header
      role="banner"
      className={cn(
        'sticky top-0 z-40 flex h-16 items-center justify-between',
        'border-b border-border bg-background/80 backdrop-blur-sm',
        'px-4 md:px-6 transition-transform duration-200 ease-out'
      )}
    >
      {/* Left side - Mobile menu + Breadcrumbs */}
      <div className="flex items-center gap-4">
        {/* Mobile menu button */}
        {onMobileMenuClick && (
          <button
            type="button"
            onClick={onMobileMenuClick}
            className={cn(
              'md:hidden p-2 rounded-md text-muted-foreground',
              'hover:text-foreground hover:bg-muted',
              'transition-colors duration-200',
              'focus:outline-none focus:ring-2 focus:ring-ring'
            )}
            aria-label="Open sidebar menu"
          >
            <Menu className="h-5 w-5" aria-hidden="true" />
          </button>
        )}

        {/* Breadcrumbs - hidden on mobile */}
        <div className="hidden md:block">
          <Breadcrumbs />
        </div>
      </div>

      {/* Right side - Search, Notifications, User */}
      <div className="flex items-center gap-2 md:gap-4">
        {/* Search trigger */}
        <button
          type="button"
          className={cn(
            'flex items-center gap-2 rounded-lg px-3 py-2',
            'text-muted-foreground hover:bg-muted transition-colors duration-200',
            'focus:outline-none focus:ring-2 focus:ring-ring',
            'hidden md:flex'
          )}
          aria-label="Search"
        >
          <Search className="h-4 w-4" aria-hidden="true" />
          <span className="text-sm text-muted-foreground">Search...</span>
          <kbd
            className={cn(
              'ml-2 hidden lg:inline-flex items-center gap-1 rounded',
              'bg-muted px-1.5 py-0.5 text-xs text-muted-foreground'
            )}
          >
            <span className="text-xs">⌘</span>K
          </kbd>
        </button>

        {/* Mobile search button */}
        <button
          type="button"
          className={cn(
            'md:hidden p-2 rounded-md text-muted-foreground',
            'hover:text-foreground hover:bg-muted',
            'transition-colors duration-200',
            'focus:outline-none focus:ring-2 focus:ring-ring'
          )}
          aria-label="Search"
        >
          <Search className="h-5 w-5" aria-hidden="true" />
        </button>

        {/* AI Assistant toggle */}
        <button
          type="button"
          onClick={onAIClick}
          className={cn(
            'p-2 rounded-lg text-muted-foreground',
            'hover:bg-primary/10 hover:text-primary transition-colors duration-200',
            'focus:outline-none focus:ring-2 focus:ring-ring'
          )}
          aria-label="Open AI assistant (⌘⇧A)"
          title="AI Assistant (⌘⇧A)"
        >
          <Sparkles className="h-5 w-5" aria-hidden="true" />
        </button>

        {/* Notifications - placeholder */}
        <button
          type="button"
          className={cn(
            'relative p-2 rounded-lg text-muted-foreground',
            'hover:bg-muted transition-colors duration-200',
            'focus:outline-none focus:ring-2 focus:ring-ring'
          )}
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5" aria-hidden="true" />
          {/* Notification badge with subtle pulse */}
          <span
            className={cn(
              'absolute top-1 right-1 h-2 w-2 rounded-full',
              'bg-destructive animate-pulse'
            )}
            aria-hidden="true"
          />
        </button>

        {/* User menu */}
        <UserMenu />
      </div>
    </header>
  )
}
