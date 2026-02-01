/**
 * Quote Status Configuration
 *
 * Status badge configurations for quotes.
 * Used with StatusCell component from shared data-table cells.
 *
 * @see docs/design-system/STATUS-BADGE-STANDARDS.md
 */

import {
  FileEdit,
  Send,
  Eye,
  CheckCircle2,
  XCircle,
  Clock,
} from "lucide-react";
import type { SemanticStatusConfigItem } from "@/components/shared/data-table";

/**
 * Quote status types
 *
 * Extended from schema to include 'viewed' status for UI display.
 */
export type QuoteDisplayStatus =
  | "draft"
  | "sent"
  | "viewed"
  | "accepted"
  | "rejected"
  | "expired";

/**
 * Quote status configuration for StatusCell
 *
 * Uses semantic colors for consistent meaning:
 * - draft: draft (initial state)
 * - sent: info (awaiting response)
 * - viewed: info (customer has seen it)
 * - accepted: success (positive outcome)
 * - rejected: error (negative outcome)
 * - expired: warning (needs attention)
 */
export const QUOTE_STATUS_CONFIG: Record<
  QuoteDisplayStatus,
  SemanticStatusConfigItem
> = {
  draft: {
    label: "Draft",
    color: "draft",
    icon: FileEdit,
  },
  sent: {
    label: "Sent",
    color: "info",
    icon: Send,
  },
  viewed: {
    label: "Viewed",
    color: "info",
    icon: Eye,
  },
  accepted: {
    label: "Accepted",
    color: "success",
    icon: CheckCircle2,
  },
  rejected: {
    label: "Rejected",
    color: "error",
    icon: XCircle,
  },
  expired: {
    label: "Expired",
    color: "warning",
    icon: Clock,
  },
};

/**
 * Determine quote display status from expiration date
 *
 * @param expiresAt Quote expiration date
 * @param baseStatus The current stored status
 * @returns The appropriate display status considering expiration
 */
export function getQuoteDisplayStatus(
  expiresAt: Date | string | null | undefined,
  baseStatus?: string
): QuoteDisplayStatus {
  // If already expired status, return it
  if (baseStatus === "expired") return "expired";

  // If we have an expiration date, check if expired
  if (expiresAt) {
    const expiryDate = new Date(expiresAt);
    if (expiryDate < new Date()) {
      return "expired";
    }
  }

  // Map base status to display status
  if (baseStatus === "draft") return "draft";
  if (baseStatus === "sent") return "sent";
  if (baseStatus === "viewed") return "viewed";
  if (baseStatus === "accepted") return "accepted";
  if (baseStatus === "rejected") return "rejected";

  // Default to draft if no status
  return "draft";
}

/**
 * Calculate days until quote expires
 *
 * @param expiresAt Quote expiration date
 * @returns Days until expiry (negative if expired)
 */
export function getDaysUntilExpiry(
  expiresAt: Date | string | null | undefined
): number | null {
  if (!expiresAt) return null;

  const expiryDate = new Date(expiresAt);
  const now = new Date();
  const diffMs = expiryDate.getTime() - now.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Get expiry status for display
 */
export function getExpiryStatus(
  expiresAt: Date | string | null | undefined
): "expired" | "expiring" | "valid" | null {
  const days = getDaysUntilExpiry(expiresAt);
  if (days === null) return null;
  if (days < 0) return "expired";
  if (days <= 7) return "expiring";
  return "valid";
}
