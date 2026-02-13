/**
 * CampaignStatusBadge Component
 *
 * Status badge for email campaigns showing draft/scheduled/sending/sent/paused/cancelled/failed state.
 *
 * @see DOM-COMMS-003d
 */

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { getStatusColorClasses } from "@/lib/status";
import { CAMPAIGN_STATUS_CONFIG } from "./campaign-status-config";

// ============================================================================
// TYPES
// ============================================================================

import type { CampaignStatus } from "@/lib/schemas/communications";

export interface CampaignStatusBadgeProps {
  status: CampaignStatus;
  className?: string;
  showIcon?: boolean;
  size?: "sm" | "default";
}

// Re-export for backward compatibility
export type { CampaignStatus };

// ============================================================================
// COMPONENT
// ============================================================================

export function CampaignStatusBadge({
  status,
  className,
  showIcon = true,
  size = "default",
}: CampaignStatusBadgeProps) {
  const config = CAMPAIGN_STATUS_CONFIG[status] ?? CAMPAIGN_STATUS_CONFIG.draft;
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
      {showIcon && Icon && (
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
