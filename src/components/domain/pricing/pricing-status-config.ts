/**
 * Pricing Status Configuration
 *
 * Status badge configurations for price list statuses.
 * Used with StatusCell component from shared data-table cells.
 *
 * @see docs/design-system/STATUS-BADGE-STANDARDS.md
 */

import { CheckCircle, XCircle, FileEdit } from "lucide-react";
import type { SemanticStatusConfigItem } from "@/components/shared/data-table";
import type { PriceListStatus } from "@/lib/schemas/pricing";

/**
 * Price list status configuration for StatusCell
 */
export const PRICE_LIST_STATUS_CONFIG: Record<PriceListStatus, SemanticStatusConfigItem> = {
  active: {
    label: "Active",
    color: "success",
    icon: CheckCircle,
  },
  expired: {
    label: "Expired",
    color: "error",
    icon: XCircle,
  },
  draft: {
    label: "Draft",
    color: "draft",
    icon: FileEdit,
  },
};

/**
 * Check if a price list is expired based on expiry date
 */
export function isPriceListExpired(
  expiryDate: string | Date | null | undefined
): boolean {
  if (!expiryDate) return false;
  const expiry = typeof expiryDate === "string" ? new Date(expiryDate) : expiryDate;
  return expiry < new Date();
}

/**
 * Format valid period for display
 */
export function formatValidPeriod(
  effectiveDate: string | null | undefined,
  expiryDate: string | null | undefined
): { effectiveText: string; expiryText: string | null; isExpired: boolean } {
  const formatDate = (date: string | null | undefined): string => {
    if (!date) return "-";
    return new Date(date).toLocaleDateString("en-AU", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const isExpired = isPriceListExpired(expiryDate);

  return {
    effectiveText: formatDate(effectiveDate),
    expiryText: expiryDate ? formatDate(expiryDate) : null,
    isExpired,
  };
}
