/**
 * EmptyState Component
 *
 * Displays empty state with message, icon, and optional actions.
 * Follows CC-EMPTY-001a and CC-EMPTY-002a wireframe specifications.
 *
 * @example
 * ```tsx
 * // Simple empty state
 * <EmptyState
 *   icon={Users}
 *   title="No customers yet"
 *   message="Add your first customer to get started."
 *   primaryAction={{
 *     label: "Add Customer",
 *     onClick: () => setShowAddModal(true),
 *     icon: Plus
 *   }}
 * />
 *
 * // With secondary action and learn more link
 * <EmptyState
 *   icon={Package}
 *   title="No products yet"
 *   message="Add products manually or import from a spreadsheet."
 *   primaryAction={{ label: "Add Product", onClick: handleAdd, icon: Plus }}
 *   secondaryAction={{ label: "Import CSV", onClick: handleImport }}
 *   learnMoreLink={{ label: "Learn more about products", href: "/help/products" }}
 * />
 *
 * // With container variant
 * <EmptyStateContainer variant="page">
 *   <EmptyState ... />
 * </EmptyStateContainer>
 * ```
 */
import type { LucideIcon } from "lucide-react"
import { ArrowRight, Inbox } from "lucide-react"
import { Button } from "~/components/ui/button"
import { cn } from "~/lib/utils"

// ============================================================================
// EMPTY STATE CONTAINER
// ============================================================================

export interface EmptyStateContainerProps {
  /** Layout variant */
  variant?: "page" | "inline" | "card"
  /** Container children */
  children: React.ReactNode
  /** Additional class names */
  className?: string
}

/**
 * Container wrapper for empty states with accessibility and variant support.
 */
export function EmptyStateContainer({
  variant = "inline",
  children,
  className,
}: EmptyStateContainerProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "flex items-center justify-center",
        variant === "page" && "py-24 w-full",
        variant === "inline" && "py-12",
        variant === "card" && "py-8",
        className
      )}
    >
      {children}
    </div>
  )
}

// ============================================================================
// EMPTY STATE
// ============================================================================

export interface EmptyStateProps {
  /** Custom icon (defaults to Inbox) */
  icon?: LucideIcon
  /** Empty state title */
  title?: string
  /** Empty state message */
  message: string
  /** Primary action button with optional icon (CC-EMPTY-002) */
  primaryAction?: {
    label: string
    onClick: () => void
    icon?: LucideIcon
  }
  /** Secondary action button - outline variant (CC-EMPTY-002) */
  secondaryAction?: {
    label: string
    onClick: () => void
  }
  /** Learn more link with arrow (CC-EMPTY-002) */
  learnMoreLink?: {
    label: string
    href: string
    external?: boolean
  }
  /** @deprecated Use primaryAction instead */
  action?: {
    label: string
    onClick: () => void
    variant?: "default" | "outline" | "secondary"
  }
  /** Additional class names */
  className?: string
}

/**
 * Base empty state component with icon, title, message, and optional actions.
 * Supports CC-EMPTY-001 (base) and CC-EMPTY-002 (CTAs) patterns.
 */
export function EmptyState({
  icon: Icon = Inbox,
  title,
  message,
  primaryAction,
  secondaryAction,
  learnMoreLink,
  action,
  className,
}: EmptyStateProps) {
  // Determine if we have any actions to render
  const hasActions = primaryAction || secondaryAction || action
  const hasDualActions = primaryAction && secondaryAction

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center",
        className
      )}
    >
      <div className="rounded-full bg-muted p-4 mb-4">
        <Icon
          className="h-12 w-12 text-muted-foreground"
          aria-hidden="true"
        />
      </div>

      {title && (
        <h3 className="text-lg font-semibold mb-1">{title}</h3>
      )}

      <p className="text-sm text-muted-foreground max-w-sm mb-4">
        {message}
      </p>

      {/* Action buttons - Focus order: Primary → Secondary → Link */}
      {hasActions && (
        <div
          className={cn(
            "flex items-center gap-3",
            hasDualActions ? "flex-row" : "flex-col"
          )}
        >
          {/* Primary action (CC-EMPTY-002) */}
          {primaryAction && (
            <Button onClick={primaryAction.onClick}>
              {primaryAction.icon && (
                <primaryAction.icon className="h-4 w-4 mr-2" aria-hidden="true" />
              )}
              {primaryAction.label}
            </Button>
          )}

          {/* Secondary action (CC-EMPTY-002) */}
          {secondaryAction && (
            <Button variant="outline" onClick={secondaryAction.onClick}>
              {secondaryAction.label}
            </Button>
          )}

          {/* Legacy action prop support */}
          {action && !primaryAction && (
            <Button
              variant={action.variant ?? "default"}
              onClick={action.onClick}
            >
              {action.label}
            </Button>
          )}
        </div>
      )}

      {/* Learn more link (CC-EMPTY-002) */}
      {learnMoreLink && (
        <a
          href={learnMoreLink.href}
          className="inline-flex items-center gap-1 mt-4 text-sm text-primary hover:underline focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded min-h-11"
          {...(learnMoreLink.external && {
            target: "_blank",
            rel: "noopener noreferrer",
          })}
        >
          {learnMoreLink.label}
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </a>
      )}
    </div>
  )
}
