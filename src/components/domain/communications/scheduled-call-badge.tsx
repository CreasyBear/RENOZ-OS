/**
 * Scheduled Call Status Badge
 *
 * Displays the status of a scheduled call with appropriate styling.
 *
 * @see DOM-COMMS-004c
 */

"use client";

import { Badge } from "@/components/ui/badge";
import { Phone, CheckCircle, XCircle, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

export type ScheduledCallStatus =
  | "pending"
  | "completed"
  | "cancelled"
  | "rescheduled";

interface ScheduledCallBadgeProps {
  status: ScheduledCallStatus;
  variant?: "default" | "dot";
  className?: string;
}

const statusConfig: Record<
  ScheduledCallStatus,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ElementType }
> = {
  pending: {
    label: "Scheduled",
    variant: "default",
    icon: Phone,
  },
  completed: {
    label: "Completed",
    variant: "secondary",
    icon: CheckCircle,
  },
  cancelled: {
    label: "Cancelled",
    variant: "destructive",
    icon: XCircle,
  },
  rescheduled: {
    label: "Rescheduled",
    variant: "outline",
    icon: RefreshCw,
  },
};

export function ScheduledCallBadge({
  status,
  variant = "default",
  className,
}: ScheduledCallBadgeProps) {
  const config = statusConfig[status];
  const Icon = config.icon;

  if (variant === "dot") {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 text-xs font-medium",
          status === "pending" && "text-primary",
          status === "completed" && "text-muted-foreground",
          status === "cancelled" && "text-destructive",
          status === "rescheduled" && "text-muted-foreground",
          className
        )}
        aria-label={`Status: ${config.label}`}
      >
        <span
          className={cn(
            "h-2 w-2 rounded-full",
            status === "pending" && "bg-primary animate-pulse",
            status === "completed" && "bg-muted-foreground",
            status === "cancelled" && "bg-destructive",
            status === "rescheduled" && "bg-muted-foreground"
          )}
        />
        {config.label}
      </span>
    );
  }

  return (
    <Badge
      variant={config.variant}
      className={cn("gap-1", className)}
      aria-label={`Status: ${config.label}`}
    >
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  );
}
