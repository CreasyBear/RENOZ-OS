/**
 * StatusBadge Component
 *
 * Configurable badge for displaying status values with semantic colors.
 * Uses the shared color palette from @/lib/status for consistency across
 * React components, PDF documents, and email templates.
 *
 * @see docs/design-system/STATUS-BADGE-STANDARDS.md
 *
 * @example
 * ```tsx
 * // Using built-in variants
 * <StatusBadge status="active" variant="success" />
 * <StatusBadge status="pending" variant="warning" />
 * <StatusBadge status="deleted" variant="error" />
 *
 * // Using custom status config
 * import { ORDER_STATUS_CONFIG } from '@/components/domain/orders';
 *
 * <StatusBadge status={order.status} statusConfig={ORDER_STATUS_CONFIG} />
 * ```
 */
import { Badge } from "~/components/ui/badge";
import { cn } from "~/lib/utils";
import {
  type SemanticColor,
  getStatusColorClasses,
} from "~/lib/status";

/**
 * @deprecated Use StatusConfig from @/lib/status/types instead
 */
export interface StatusConfigItem {
  variant: SemanticColor;
  label?: string;
}

/**
 * @deprecated Use StatusConfig from @/lib/status/types instead
 */
export type StatusConfig = Record<string, StatusConfigItem>;

export interface StatusBadgeProps {
  /** Status value */
  status: string;
  /** Direct variant (used when no statusConfig) */
  variant?: SemanticColor;
  /** Custom status-to-variant mapping */
  statusConfig?: StatusConfig;
  /** Additional class names */
  className?: string;
}

/**
 * Format status for display (e.g., "in_progress" -> "In Progress")
 */
function formatStatus(status: string): string {
  return status
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function StatusBadge({
  status,
  variant,
  statusConfig,
  className,
}: StatusBadgeProps) {
  // Determine variant and label from config or props
  let resolvedVariant: SemanticColor = variant ?? "neutral";
  let label = formatStatus(status);

  if (statusConfig && statusConfig[status]) {
    const config = statusConfig[status];
    resolvedVariant = config.variant;
    if (config.label) {
      label = config.label;
    }
  }

  return (
    <Badge
      variant="outline"
      className={cn(
        "font-medium",
        getStatusColorClasses(resolvedVariant),
        className
      )}
    >
      {label}
    </Badge>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DEPRECATED: Domain configs have moved to their respective domain folders.
// Import from the domain instead:
//   - ORDER_STATUS_CONFIG: @/components/domain/orders
//   - CUSTOMER_STATUS_CONFIG: @/components/domain/customers
//   - QUOTE_STATUS_CONFIG: @/components/domain/pipeline/quotes
// ─────────────────────────────────────────────────────────────────────────────
