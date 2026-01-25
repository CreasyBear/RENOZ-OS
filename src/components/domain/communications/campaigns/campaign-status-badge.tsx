/**
 * CampaignStatusBadge Component
 *
 * Status badge for email campaigns showing draft/scheduled/sending/sent/paused/cancelled/failed state.
 *
 * @see DOM-COMMS-003d
 */

import {
  FileEdit,
  Clock,
  Loader2,
  CheckCircle2,
  Pause,
  XCircle,
  AlertTriangle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// ============================================================================
// TYPES
// ============================================================================

export type CampaignStatus =
  | "draft"
  | "scheduled"
  | "sending"
  | "sent"
  | "paused"
  | "cancelled"
  | "failed";

export interface CampaignStatusBadgeProps {
  status: CampaignStatus;
  className?: string;
  showIcon?: boolean;
  size?: "sm" | "default";
}

// ============================================================================
// STATUS CONFIG
// ============================================================================

const STATUS_CONFIG: Record<
  CampaignStatus,
  {
    label: string;
    variant: "default" | "secondary" | "destructive" | "outline";
    icon: typeof FileEdit;
    className?: string;
  }
> = {
  draft: {
    label: "Draft",
    variant: "secondary",
    icon: FileEdit,
    className:
      "bg-slate-100 text-slate-800 hover:bg-slate-100 dark:bg-slate-900/30 dark:text-slate-400",
  },
  scheduled: {
    label: "Scheduled",
    variant: "secondary",
    icon: Clock,
    className:
      "bg-amber-100 text-amber-800 hover:bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400",
  },
  sending: {
    label: "Sending",
    variant: "default",
    icon: Loader2,
    className:
      "bg-blue-100 text-blue-800 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400",
  },
  sent: {
    label: "Sent",
    variant: "default",
    icon: CheckCircle2,
    className:
      "bg-green-100 text-green-800 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-400",
  },
  paused: {
    label: "Paused",
    variant: "outline",
    icon: Pause,
    className:
      "bg-orange-100 text-orange-800 hover:bg-orange-100 dark:bg-orange-900/30 dark:text-orange-400",
  },
  cancelled: {
    label: "Cancelled",
    variant: "destructive",
    icon: XCircle,
    className:
      "bg-red-100 text-red-800 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-400",
  },
  failed: {
    label: "Failed",
    variant: "destructive",
    icon: AlertTriangle,
    className:
      "bg-red-100 text-red-800 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-400",
  },
};

// ============================================================================
// COMPONENT
// ============================================================================

export function CampaignStatusBadge({
  status,
  className,
  showIcon = true,
  size = "default",
}: CampaignStatusBadgeProps) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.draft;
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
      {showIcon && (
        <Icon
          className={cn(
            "h-3 w-3",
            size === "sm" && "h-2.5 w-2.5",
            status === "sending" && "animate-spin"
          )}
        />
      )}
      {config.label}
    </Badge>
  );
}

/**
 * Indicator dot for inline status display
 */
export function CampaignStatusDot({
  status,
  className,
}: {
  status: CampaignStatus;
  className?: string;
}) {
  const colors: Record<CampaignStatus, string> = {
    draft: "bg-slate-500",
    scheduled: "bg-amber-500",
    sending: "bg-blue-500 animate-pulse",
    sent: "bg-green-500",
    paused: "bg-orange-500",
    cancelled: "bg-red-500",
    failed: "bg-red-500",
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
