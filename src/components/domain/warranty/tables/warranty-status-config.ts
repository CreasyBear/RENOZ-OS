/**
 * Warranty Status Configuration
 *
 * Status badge configurations for warranty statuses.
 * Used with StatusCell component from shared data-table cells.
 */

import { CheckCircle, Clock, XCircle, ArrowRightLeft, Ban } from "lucide-react";
import type { StatusConfigItem } from "@/components/shared/data-table";
import type { WarrantyStatus } from "@/lib/schemas/warranty";

/**
 * Warranty status configuration for StatusCell
 */
export const WARRANTY_STATUS_CONFIG: Record<WarrantyStatus, StatusConfigItem> = {
  active: {
    label: "Active",
    variant: "default",
    icon: CheckCircle,
  },
  expiring_soon: {
    label: "Expiring Soon",
    variant: "outline",
    icon: Clock,
  },
  expired: {
    label: "Expired",
    variant: "destructive",
    icon: XCircle,
  },
  voided: {
    label: "Voided",
    variant: "destructive",
    icon: Ban,
  },
  transferred: {
    label: "Transferred",
    variant: "secondary",
    icon: ArrowRightLeft,
  },
};

/**
 * Check if a warranty is nearing expiry (within 30 days)
 */
export function isWarrantyExpiringSoon(
  expiryDate: string | Date | null | undefined
): boolean {
  if (!expiryDate) return false;
  const expiry = typeof expiryDate === "string" ? new Date(expiryDate) : expiryDate;
  const now = new Date();
  const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  return expiry > now && expiry <= thirtyDaysFromNow;
}

/**
 * Check if a warranty has expired
 */
export function isWarrantyExpired(
  expiryDate: string | Date | null | undefined
): boolean {
  if (!expiryDate) return false;
  const expiry = typeof expiryDate === "string" ? new Date(expiryDate) : expiryDate;
  return expiry < new Date();
}

/**
 * Format expiry date with relative indicator for display
 */
export function formatExpiryDateRelative(
  expiryDate: string | Date | null | undefined
): { text: string; isExpired: boolean; isExpiringSoon: boolean } {
  if (!expiryDate) return { text: "—", isExpired: false, isExpiringSoon: false };

  const expiry = typeof expiryDate === "string" ? new Date(expiryDate) : expiryDate;
  const now = new Date();
  const isExpired = expiry < now;

  const diffMs = expiry.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (isExpired) {
    return {
      text: `${Math.abs(diffDays)}d ago`,
      isExpired: true,
      isExpiringSoon: false,
    };
  }

  if (diffDays === 0) return { text: "Today", isExpired: false, isExpiringSoon: true };
  if (diffDays === 1) return { text: "Tomorrow", isExpired: false, isExpiringSoon: true };
  if (diffDays <= 7) return { text: `${diffDays}d`, isExpired: false, isExpiringSoon: true };
  if (diffDays <= 30) return { text: `${diffDays}d`, isExpired: false, isExpiringSoon: true };

  return {
    text: expiry.toLocaleDateString("en-AU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }),
    isExpired: false,
    isExpiringSoon: false,
  };
}
