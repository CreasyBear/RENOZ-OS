/**
 * PageHeaderActions Component
 *
 * Responsive action button group that collapses to a dropdown on mobile.
 * Primary action remains visible; secondary actions move to overflow menu.
 *
 * @example
 * ```tsx
 * <PageLayout.Header
 *   title="Customers"
 *   actions={
 *     <PageHeaderActions
 *       actions={[
 *         { label: "Export", icon: <Download className="h-4 w-4" />, onClick: handleExport },
 *         { label: "Import", icon: <Upload className="h-4 w-4" />, onClick: handleImport },
 *         { label: "Add Customer", icon: <Plus className="h-4 w-4" />, onClick: handleAdd, primary: true },
 *       ]}
 *     />
 *   }
 * />
 * ```
 */
import { type ReactNode } from 'react'
import { MoreVertical } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

export interface ActionItem {
  /** Display label for the action */
  label: string
  /** Icon element (should be sized appropriately, e.g., h-4 w-4) */
  icon?: ReactNode
  /** Click handler */
  onClick: () => void
  /** Mark as primary action (stays visible on mobile) */
  primary?: boolean
  /** Disable the action */
  disabled?: boolean
  /** Variant for desktop button (default: "outline" for secondary, "default" for primary) */
  variant?: 'default' | 'outline' | 'ghost' | 'destructive'
}

interface PageHeaderActionsProps {
  /** Array of action items */
  actions: ActionItem[]
  /** Additional class names for the container */
  className?: string
}

export function PageHeaderActions({ actions, className }: PageHeaderActionsProps) {
  const primaryAction = actions.find((a) => a.primary)
  const secondaryActions = actions.filter((a) => !a.primary)

  return (
    <div className={cn('flex items-center gap-2 sm:gap-3', className)}>
      {/* Desktop: show all actions */}
      <div className="hidden sm:flex items-center gap-3">
        {secondaryActions.map((action) => (
          <Button
            key={action.label}
            variant={action.variant ?? 'outline'}
            size="sm"
            onClick={action.onClick}
            disabled={action.disabled}
          >
            {action.icon}
            <span className="ml-2">{action.label}</span>
          </Button>
        ))}
        {primaryAction && (
          <Button
            variant={primaryAction.variant ?? 'default'}
            size="sm"
            onClick={primaryAction.onClick}
            disabled={primaryAction.disabled}
          >
            {primaryAction.icon}
            <span className="ml-2">{primaryAction.label}</span>
          </Button>
        )}
      </div>

      {/* Mobile: dropdown for secondary + icon-only primary */}
      <div className="sm:hidden flex items-center gap-2">
        {secondaryActions.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="icon" variant="ghost" aria-label="More actions">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {secondaryActions.map((action) => (
                <DropdownMenuItem
                  key={action.label}
                  onClick={action.onClick}
                  disabled={action.disabled}
                  className="flex items-center gap-2"
                >
                  {action.icon}
                  {action.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
        {primaryAction && (
          <Button
            size="sm"
            variant={primaryAction.variant ?? 'default'}
            onClick={primaryAction.onClick}
            disabled={primaryAction.disabled}
          >
            {primaryAction.icon}
            <span className="sr-only sm:not-sr-only sm:ml-2">
              {primaryAction.label}
            </span>
          </Button>
        )}
      </div>
    </div>
  )
}
