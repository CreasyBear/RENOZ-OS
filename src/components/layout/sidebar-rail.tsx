/**
 * Sidebar Rail Component
 *
 * Edge toggle for expanding/collapsing the sidebar.
 * Shows on hover and provides a clickable area to toggle.
 *
 * @example
 * ```tsx
 * <Sidebar>
 *   <SidebarContent />
 *   <SidebarRail />
 * </Sidebar>
 * ```
 */
import { cn } from '@/lib/utils'
import { useSidebarSafe } from './sidebar-provider'

interface SidebarRailProps {
  className?: string
}

export function SidebarRail({ className }: SidebarRailProps) {
  const context = useSidebarSafe()
  
  // Don't render if no context (shouldn't happen, but protects against HMR issues)
  if (!context) {
    return null
  }
  
  const { toggle, collapsible, isCollapsed } = context

  // Don't render if collapsible is 'none'
  if (collapsible === 'none') {
    return null
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className={cn(
        // Positioning
        'absolute right-0 top-0 bottom-0 w-1',
        'translate-x-full',
        // Visual
        'bg-transparent hover:bg-gray-300',
        'transition-all duration-200',
        // Cursor
        'cursor-ew-resize',
        // Hover indicator
        'after:absolute after:inset-y-0 after:right-0 after:w-4',
        'after:translate-x-full after:content-[""]',
        // Focus
        'focus:outline-none focus-visible:bg-gray-400',
        className
      )}
      aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      title={`${isCollapsed ? 'Expand' : 'Collapse'} sidebar (⌘B)`}
    >
      {/* Visual indicator on hover */}
      <span
        className={cn(
          'absolute top-1/2 -translate-y-1/2 right-0 translate-x-full',
          'w-1 h-8 rounded-full bg-gray-400 opacity-0',
          'group-hover:opacity-100 transition-opacity'
        )}
        aria-hidden="true"
      />
    </button>
  )
}
