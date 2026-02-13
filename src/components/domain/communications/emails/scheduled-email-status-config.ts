/**
 * Scheduled Email Status Configuration
 *
 * Status badge configurations for scheduled email statuses.
 * Uses semantic colors from @/lib/status for consistency across React, PDF, and Email.
 *
 * @see docs/design-system/STATUS-BADGE-STANDARDS.md
 */

import { Clock, Send, XCircle } from "lucide-react";
import type { SemanticStatusConfigItem } from "@/components/shared/data-table";
import type { ScheduledEmailStatus } from "@/lib/schemas/communications";

/**
 * Scheduled email status configuration for StatusCell
 */
export const SCHEDULED_EMAIL_STATUS_CONFIG: Record<
  ScheduledEmailStatus,
  SemanticStatusConfigItem
> = {
  pending: {
    label: "Scheduled",
    color: "pending",
    icon: Clock,
  },
  sent: {
    label: "Sent",
    color: "success",
    icon: Send,
  },
  cancelled: {
    label: "Cancelled",
    color: "error",
    icon: XCircle,
  },
};
