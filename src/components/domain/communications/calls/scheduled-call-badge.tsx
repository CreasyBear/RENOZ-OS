/**
 * Scheduled Call Status Badge
 *
 * Displays the status of a scheduled call with appropriate styling.
 *
 * @see DOM-COMMS-004c
 */

"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { getStatusColorClasses, getStatusColorClassesSplit } from "@/lib/status";
import { SCHEDULED_CALL_STATUS_CONFIG } from "./scheduled-call-status-config";

// ============================================================================
// TYPES
// ============================================================================

import type { ScheduledCallStatus } from "@/lib/schemas/communications";

interface ScheduledCallBadgeProps {
  status: ScheduledCallStatus;
  variant?: "default" | "dot";
  className?: string;
}

// Re-export for backward compatibility
export type { ScheduledCallStatus };

export function ScheduledCallBadge({
  status,
  variant = "default",
  className,
}: ScheduledCallBadgeProps) {
  const config = SCHEDULED_CALL_STATUS_CONFIG[status] ?? SCHEDULED_CALL_STATUS_CONFIG.pending;
  const Icon = config.icon;

  if (variant === "dot") {
    // Dot variant uses semantic colors for consistency
    const colorClasses = getStatusColorClassesSplit(config.color);
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 text-xs font-medium",
          colorClasses.text,
          className
        )}
        aria-label={`Status: ${config.label}`}
      >
        <span
          className={cn(
            "h-2 w-2 rounded-full",
            status === "pending" && "animate-pulse",
            colorClasses.bg
          )}
        />
        {config.label}
      </span>
    );
  }

  return (
    <Badge
      variant="outline"
      className={cn("gap-1", getStatusColorClasses(config.color), className)}
      aria-label={`Status: ${config.label}`}
    >
      {Icon && <Icon className="h-3 w-3" />}
      {config.label}
    </Badge>
  );
}
