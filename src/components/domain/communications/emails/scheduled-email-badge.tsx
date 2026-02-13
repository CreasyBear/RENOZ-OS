/**
 * ScheduledEmailBadge Component
 *
 * Status badge for scheduled emails showing pending/sent/cancelled state.
 *
 * @see DOM-COMMS-002c
 */

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { getStatusColorClasses } from "@/lib/status";
import { SCHEDULED_EMAIL_STATUS_CONFIG } from "./scheduled-email-status-config";

// ============================================================================
// TYPES
// ============================================================================

import type { ScheduledEmailStatus } from "@/lib/schemas/communications";

export interface ScheduledEmailBadgeProps {
  status: ScheduledEmailStatus;
  className?: string;
  showIcon?: boolean;
  size?: "sm" | "default";
}

// Re-export for backward compatibility
export type { ScheduledEmailStatus };

// ============================================================================
// COMPONENT
// ============================================================================

export function ScheduledEmailBadge({
  status,
  className,
  showIcon = true,
  size = "default",
}: ScheduledEmailBadgeProps) {
  const config = SCHEDULED_EMAIL_STATUS_CONFIG[status] ?? SCHEDULED_EMAIL_STATUS_CONFIG.pending;
  const Icon = config.icon;

  return (
    <Badge
      variant="outline"
      className={cn(
        "gap-1",
        getStatusColorClasses(config.color),
        size === "sm" && "text-xs px-1.5 py-0",
        className
      )}
    >
      {showIcon && Icon && <Icon className={cn("h-3 w-3", size === "sm" && "h-2.5 w-2.5")} />}
      {config.label}
    </Badge>
  );
}

/**
 * Indicator dot for inline status display
 */
export function ScheduledEmailDot({
  status,
  className,
}: {
  status: ScheduledEmailStatus;
  className?: string;
}) {
  const colors: Record<ScheduledEmailStatus, string> = {
    pending: "bg-amber-500",
    sent: "bg-green-500",
    cancelled: "bg-red-500",
  };

  return (
    <span
      className={cn(
        "inline-block h-2 w-2 rounded-full",
        colors[status],
        className
      )}
      role="status"
      aria-label={`Status: ${status}`}
    />
  );
}
