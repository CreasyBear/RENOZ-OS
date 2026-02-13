/**
 * Campaign Recipient Status Configuration
 *
 * Status badge configurations for campaign recipient statuses.
 * Uses semantic colors from @/lib/status for consistency across React, PDF, and Email.
 *
 * @see docs/design-system/STATUS-BADGE-STANDARDS.md
 */

import {
  Clock,
  Send,
  CheckCircle2,
  Eye,
  MousePointerClick,
  AlertTriangle,
  XCircle,
  Ban,
} from "lucide-react";
import type { SemanticStatusConfigItem } from "@/components/shared/data-table";
import type { CampaignRecipient } from "@/lib/schemas/communications";

/**
 * Campaign recipient status configuration for StatusCell
 */
export const CAMPAIGN_RECIPIENT_STATUS_CONFIG: Record<
  CampaignRecipient["status"],
  SemanticStatusConfigItem
> = {
  pending: {
    label: "Pending",
    color: "neutral",
    icon: Clock,
  },
  sent: {
    label: "Sent",
    color: "info",
    icon: Send,
  },
  delivered: {
    label: "Delivered",
    color: "success",
    icon: CheckCircle2,
  },
  opened: {
    label: "Opened",
    color: "success",
    icon: Eye,
  },
  clicked: {
    label: "Clicked",
    color: "success",
    icon: MousePointerClick,
  },
  bounced: {
    label: "Bounced",
    color: "warning",
    icon: AlertTriangle,
  },
  failed: {
    label: "Failed",
    color: "error",
    icon: XCircle,
  },
  unsubscribed: {
    label: "Unsubscribed",
    color: "inactive",
    icon: Ban,
  },
};
