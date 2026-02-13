/**
 * Customer Status Configuration
 *
 * Status badge configurations for customer status, type, and size.
 * Uses semantic colors from @/lib/status for consistency across React, PDF, and Email.
 *
 * @see docs/design-system/STATUS-BADGE-STANDARDS.md
 */

import {
  CheckCircle2,
  XCircle,
  AlertCircle,
  User,
  Building2,
  Landmark,
  Heart,
} from "lucide-react";
import type { SemanticStatusConfigItem, TypeConfigItem } from "@/components/shared/data-table";
import { getStatusColorClasses, type SemanticColor } from "@/lib/status/colors";

/**
 * Customer status values (matches schema)
 */
export type CustomerStatus =
  | "prospect"
  | "active"
  | "inactive"
  | "suspended"
  | "blacklisted";

/**
 * Customer type values (matches schema)
 */
export type CustomerType =
  | "individual"
  | "business"
  | "government"
  | "non_profit";

/**
 * Customer size values (matches schema)
 */
export type CustomerSize =
  | "micro"
  | "small"
  | "medium"
  | "large"
  | "enterprise";

/**
 * Customer status configuration for StatusCell
 */
export const CUSTOMER_STATUS_CONFIG: Record<CustomerStatus, SemanticStatusConfigItem> = {
  prospect: {
    label: "Prospect",
    color: "info",
    icon: AlertCircle,
  },
  active: {
    label: "Active",
    color: "success",
    icon: CheckCircle2,
  },
  inactive: {
    label: "Inactive",
    color: "inactive",
    icon: XCircle,
  },
  suspended: {
    label: "Suspended",
    color: "warning",
    icon: XCircle,
  },
  blacklisted: {
    label: "Blacklisted",
    color: "error",
    icon: XCircle,
  },
};

/**
 * Customer type configuration for TypeCell
 */
export const CUSTOMER_TYPE_CONFIG: Record<CustomerType, TypeConfigItem> = {
  individual: {
    label: "Individual",
    icon: User,
  },
  business: {
    label: "Business",
    icon: Building2,
  },
  government: {
    label: "Government",
    icon: Landmark,
  },
  non_profit: {
    label: "Non-Profit",
    icon: Heart,
  },
};

/**
 * Customer size configuration
 * Maps sizes to semantic colors based on business value:
 * - micro/small: neutral (smallest businesses)
 * - medium: info (growing businesses)
 * - large: pending (established businesses)
 * - enterprise: success (premium tier)
 *
 * Uses semantic colors from @/lib/status/colors per STATUS-BADGE-STANDARDS.md
 */
export interface SizeConfigItem {
  label: string;
  semanticColor: SemanticColor;
}

/**
 * Get size badge color classes using semantic colors
 */
export function getSizeColorClasses(size: CustomerSize): string {
  const config = CUSTOMER_SIZE_CONFIG[size];
  return getStatusColorClasses(config.semanticColor);
}

export const CUSTOMER_SIZE_CONFIG: Record<CustomerSize, SizeConfigItem> = {
  micro: {
    label: "Micro",
    semanticColor: "neutral", // Smallest businesses
  },
  small: {
    label: "Small",
    semanticColor: "neutral", // Small businesses
  },
  medium: {
    label: "Medium",
    semanticColor: "info", // Growing businesses
  },
  large: {
    label: "Large",
    semanticColor: "pending", // Established businesses
  },
  enterprise: {
    label: "Enterprise",
    semanticColor: "success", // Premium tier
  },
};

/**
 * Health score color utilities
 * Uses semantic colors from @/lib/status/colors per STATUS-BADGE-STANDARDS.md
 */
export function getHealthScoreColor(score: number | null): string {
  if (score === null) return getStatusColorClasses("neutral");
  if (score >= 80) return getStatusColorClasses("success");
  if (score >= 60) return getStatusColorClasses("warning");
  if (score >= 40) return getStatusColorClasses("pending");
  return getStatusColorClasses("error");
}

/**
 * Get semantic color for health score (for use in StatusCell or other components)
 */
export function getHealthScoreSemanticColor(score: number | null): SemanticColor {
  if (score === null) return "neutral";
  if (score >= 80) return "success";
  if (score >= 60) return "warning";
  if (score >= 40) return "pending";
  return "error";
}

/**
 * Get health score label (e.g., "Excellent", "Good", "Fair", "At Risk")
 * Centralized logic to eliminate DRY violations across components
 */
export function getHealthScoreLabel(score: number | null | undefined): string {
  if (score === null || score === undefined) return "Not Rated";
  if (score >= 80) return "Excellent";
  if (score >= 60) return "Good";
  if (score >= 40) return "Fair";
  return "At Risk";
}

/**
 * Format relative time for display (e.g., "2d ago", "3h ago")
 */
export function formatRelativeTime(date: string | Date | null | undefined): string {
  if (!date) return "-";
  const d = new Date(date);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  return d.toLocaleDateString();
}
