/**
 * StatusBadge Component
 *
 * Configurable badge for displaying status values with semantic colors.
 *
 * @example
 * ```tsx
 * // Using built-in variants
 * <StatusBadge status="active" variant="success" />
 * <StatusBadge status="pending" variant="warning" />
 * <StatusBadge status="deleted" variant="error" />
 *
 * // Using custom status config
 * const ORDER_STATUS_CONFIG: StatusConfig = {
 *   draft: { variant: 'neutral', label: 'Draft' },
 *   pending: { variant: 'warning', label: 'Pending' },
 *   confirmed: { variant: 'info', label: 'Confirmed' },
 *   completed: { variant: 'success', label: 'Completed' },
 *   cancelled: { variant: 'error', label: 'Cancelled' },
 * }
 *
 * <StatusBadge status={order.status} statusConfig={ORDER_STATUS_CONFIG} />
 * ```
 */
import { Badge } from "~/components/ui/badge"
import { cn } from "~/lib/utils"

export type StatusVariant = "success" | "warning" | "error" | "info" | "neutral"

export interface StatusConfigItem {
  variant: StatusVariant
  label?: string
}

export type StatusConfig = Record<string, StatusConfigItem>

export interface StatusBadgeProps {
  /** Status value */
  status: string
  /** Direct variant (used when no statusConfig) */
  variant?: StatusVariant
  /** Custom status-to-variant mapping */
  statusConfig?: StatusConfig
  /** Additional class names */
  className?: string
}

const VARIANT_CLASSES: Record<StatusVariant, string> = {
  success: "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800",
  warning: "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800",
  error: "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800",
  info: "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800",
  neutral: "bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700",
}

/**
 * Format status for display (e.g., "in_progress" -> "In Progress")
 */
function formatStatus(status: string): string {
  return status
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

export function StatusBadge({
  status,
  variant,
  statusConfig,
  className,
}: StatusBadgeProps) {
  // Determine variant and label from config or props
  let resolvedVariant: StatusVariant = variant ?? "neutral"
  let label = formatStatus(status)

  if (statusConfig && statusConfig[status]) {
    const config = statusConfig[status]
    resolvedVariant = config.variant
    if (config.label) {
      label = config.label
    }
  }

  return (
    <Badge
      variant="outline"
      className={cn(
        "font-medium",
        VARIANT_CLASSES[resolvedVariant],
        className
      )}
    >
      {label}
    </Badge>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Pre-built status configs for common domain objects
// ─────────────────────────────────────────────────────────────────────────────

/** Order status configuration */
export const ORDER_STATUS_CONFIG: StatusConfig = {
  draft: { variant: "neutral", label: "Draft" },
  pending: { variant: "warning", label: "Pending" },
  confirmed: { variant: "info", label: "Confirmed" },
  in_progress: { variant: "info", label: "In Progress" },
  completed: { variant: "success", label: "Completed" },
  cancelled: { variant: "error", label: "Cancelled" },
}

/** Quote status configuration */
export const QUOTE_STATUS_CONFIG: StatusConfig = {
  draft: { variant: "neutral", label: "Draft" },
  sent: { variant: "info", label: "Sent" },
  viewed: { variant: "info", label: "Viewed" },
  accepted: { variant: "success", label: "Accepted" },
  rejected: { variant: "error", label: "Rejected" },
  expired: { variant: "warning", label: "Expired" },
}

/** Inventory alert configuration */
export const INVENTORY_ALERT_CONFIG: StatusConfig = {
  in_stock: { variant: "success", label: "In Stock" },
  low_stock: { variant: "warning", label: "Low Stock" },
  out_of_stock: { variant: "error", label: "Out of Stock" },
  on_order: { variant: "info", label: "On Order" },
}

/** Customer status configuration */
export const CUSTOMER_STATUS_CONFIG: StatusConfig = {
  active: { variant: "success", label: "Active" },
  inactive: { variant: "neutral", label: "Inactive" },
  prospect: { variant: "info", label: "Prospect" },
  churned: { variant: "error", label: "Churned" },
}
