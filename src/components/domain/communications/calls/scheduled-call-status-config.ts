/**
 * Scheduled Call Status Configuration
 *
 * Status badge configurations for scheduled call statuses.
 * Uses semantic colors from @/lib/status for consistency across React, PDF, and Email.
 *
 * @see docs/design-system/STATUS-BADGE-STANDARDS.md
 */

import { Phone, CheckCircle, XCircle, RefreshCw } from "lucide-react";
import type { SemanticStatusConfigItem } from "@/components/shared/data-table";
import type { ScheduledCallStatus } from "@/lib/schemas/communications";

/**
 * Scheduled call status configuration for StatusCell
 */
export const SCHEDULED_CALL_STATUS_CONFIG: Record<
  ScheduledCallStatus,
  SemanticStatusConfigItem
> = {
  pending: {
    label: "Scheduled",
    color: "pending",
    icon: Phone,
  },
  completed: {
    label: "Completed",
    color: "success",
    icon: CheckCircle,
  },
  cancelled: {
    label: "Cancelled",
    color: "error",
    icon: XCircle,
  },
  rescheduled: {
    label: "Rescheduled",
    color: "info",
    icon: RefreshCw,
  },
};
