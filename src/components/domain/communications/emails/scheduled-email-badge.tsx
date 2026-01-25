/**
 * ScheduledEmailBadge Component
 *
 * Status badge for scheduled emails showing pending/sent/cancelled state.
 *
 * @see DOM-COMMS-002c
 */

import { Clock, XCircle, Send } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// ============================================================================
// TYPES
// ============================================================================

export type ScheduledEmailStatus = "pending" | "sent" | "cancelled";

export interface ScheduledEmailBadgeProps {
  status: ScheduledEmailStatus;
  className?: string;
  showIcon?: boolean;
  size?: "sm" | "default";
}

// ============================================================================
// STATUS CONFIG
// ============================================================================

const STATUS_CONFIG: Record<
  ScheduledEmailStatus,
  {
    label: string;
    variant: "default" | "secondary" | "destructive" | "outline";
    icon: typeof Clock;
    className?: string;
  }
> = {
  pending: {
    label: "Scheduled",
    variant: "secondary",
    icon: Clock,
    className: "bg-amber-100 text-amber-800 hover:bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400",
  },
  sent: {
    label: "Sent",
    variant: "default",
    icon: Send,
    className: "bg-green-100 text-green-800 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-400",
  },
  cancelled: {
    label: "Cancelled",
    variant: "destructive",
    icon: XCircle,
    className: "bg-red-100 text-red-800 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-400",
  },
};

// ============================================================================
// COMPONENT
// ============================================================================

export function ScheduledEmailBadge({
  status,
  className,
  showIcon = true,
  size = "default",
}: ScheduledEmailBadgeProps) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.pending;
  const Icon = config.icon;

  return (
    <Badge
      variant={config.variant}
      className={cn(
        "gap-1",
        config.className,
        size === "sm" && "text-xs px-1.5 py-0",
        className
      )}
    >
      {showIcon && <Icon className={cn("h-3 w-3", size === "sm" && "h-2.5 w-2.5")} />}
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
