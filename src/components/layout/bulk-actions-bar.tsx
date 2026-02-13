/**
 * BulkActionsBar Component
 *
 * Floating bottom bar for bulk selection actions.
 * Appears when items are selected, slides up with spring animation.
 *
 * Features:
 * - Fixed position at bottom of viewport
 * - Slide-up animation on mount
 * - Accessible with aria-live for screen readers
 * - Keyboard navigable
 *
 * @example
 * ```tsx
 * <BulkActionsBar
 *   selectedCount={selectedIds.length}
 *   onClear={() => setSelectedIds([])}
 *   actions={[
 *     { label: 'Delete', icon: Trash2, onClick: handleBulkDelete, variant: 'destructive' },
 *     { label: 'Export', icon: Download, onClick: handleExport },
 *   ]}
 * />
 * ```
 */
import { type LucideIcon, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

export interface BulkAction {
  /** Button label */
  label: string
  /** Optional icon */
  icon?: LucideIcon
  /** Click handler */
  onClick: () => void
  /** Button variant */
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost'
  /** Disable this action */
  disabled?: boolean
  /** Loading state */
  loading?: boolean
}

export interface BulkActionsBarProps {
  /** Number of selected items */
  selectedCount: number
  /** Handler to clear selection */
  onClear: () => void
  /** Available bulk actions */
  actions: BulkAction[]
  /** Additional class names */
  className?: string
}

export function BulkActionsBar({
  selectedCount,
  onClear,
  actions,
  className,
}: BulkActionsBarProps) {
  // Don't render unless 2+ items selected (bulk implies multiple)
  if (selectedCount < 2) {
    return null
  }

  const itemLabel = selectedCount === 1 ? 'item' : 'items'

  return (
    <div
      role="region"
      aria-live="polite"
      aria-label={`${selectedCount} ${itemLabel} selected`}
      className={cn(
        // Fixed positioning at bottom center
        'fixed bottom-4 left-1/2 -translate-x-1/2 z-50',
        // Container styling
        'flex items-center gap-2 sm:gap-4 px-4 py-3 rounded-lg',
        'bg-background border shadow-lg',
        // Animation: slide up from bottom
        'animate-in slide-in-from-bottom-5 duration-300',
        // Dark mode support
        'dark:bg-card dark:border-border',
        className
      )}
    >
      {/* Screen reader announcement */}
      <span className="sr-only">
        {selectedCount} {itemLabel} selected. Use Tab to navigate bulk actions.
      </span>

      {/* Selection count */}
      <div className="flex items-center gap-2 pr-2 sm:pr-4 border-r border-border">
        <span className="text-sm font-medium whitespace-nowrap">
          {selectedCount} {itemLabel}
        </span>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onClear}
          aria-label="Clear selection"
          className="h-6 w-6"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-2">
        {actions.map((action) => {
          const Icon = action.icon
          return (
            <Button
              key={action.label}
              variant={action.variant ?? 'default'}
              size="sm"
              onClick={action.onClick}
              disabled={action.disabled || action.loading}
              className="whitespace-nowrap"
            >
              {Icon && <Icon className="h-4 w-4" />}
              <span className="hidden sm:inline">{action.label}</span>
              {/* Show icon-only on mobile, full on desktop */}
              <span className="sm:hidden" aria-label={action.label}>
                {!Icon && action.label}
              </span>
            </Button>
          )
        })}
      </div>
    </div>
  )
}

// Re-export types
export type { BulkActionsBarProps as BulkActionsBarPropsType }
