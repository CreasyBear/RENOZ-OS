/**
 * Campaign Status Configuration
 *
 * Status badge configurations for email campaign statuses.
 * Uses semantic colors from @/lib/status for consistency across React, PDF, and Email.
 *
 * @see docs/design-system/STATUS-BADGE-STANDARDS.md
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
import type { SemanticStatusConfigItem } from "@/components/shared/data-table";
import type { CampaignStatus } from "@/lib/schemas/communications";

/**
 * Campaign status configuration for StatusCell and EntityHeader
 */
export const CAMPAIGN_STATUS_CONFIG: Record<CampaignStatus, SemanticStatusConfigItem> = {
  draft: {
    label: "Draft",
    color: "draft",
    icon: FileEdit,
  },
  scheduled: {
    label: "Scheduled",
    color: "pending",
    icon: Clock,
  },
  sending: {
    label: "Sending",
    color: "progress",
    icon: Loader2,
  },
  sent: {
    label: "Sent",
    color: "success",
    icon: CheckCircle2,
  },
  paused: {
    label: "Paused",
    color: "warning",
    icon: Pause,
  },
  cancelled: {
    label: "Cancelled",
    color: "error",
    icon: XCircle,
  },
  failed: {
    label: "Failed",
    color: "error",
    icon: AlertTriangle,
  },
};

/**
 * Map campaign status to semantic color variant for EntityHeader
 */
export function getCampaignStatusVariant(
  status: CampaignStatus
): "success" | "warning" | "error" | "neutral" {
  const config = CAMPAIGN_STATUS_CONFIG[status];
  switch (config.color) {
    case "success":
      return "success";
    case "warning":
    case "pending":
    case "progress":
      return "warning";
    case "error":
      return "error";
    case "draft":
    case "inactive":
    case "neutral":
    default:
      return "neutral";
  }
}

/**
 * Get current campaign stage index for progress indicator
 */
export function getCampaignStageIndex(status: CampaignStatus): number {
  switch (status) {
    case "draft":
      return 0;
    case "scheduled":
      return 1;
    case "sending":
      return 2;
    case "sent":
      return 3;
    case "paused":
      return 1; // Paused campaigns are still at scheduled stage
    case "cancelled":
    case "failed":
      return -1; // Failed/cancelled don't show progress
    default:
      return 0;
  }
}

/**
 * Campaign lifecycle stages for progress indicator
 */
export const CAMPAIGN_STAGES = [
  { label: "Draft", status: "draft" as const },
  { label: "Scheduled", status: "scheduled" as const },
  { label: "Sending", status: "sending" as const },
  { label: "Sent", status: "sent" as const },
] as const;
