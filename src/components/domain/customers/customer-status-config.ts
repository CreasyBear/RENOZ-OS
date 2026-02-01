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
 * Using a custom config since sizes need colors, not just labels/icons
 */
export interface SizeConfigItem {
  label: string;
  color: string;
}

export const CUSTOMER_SIZE_CONFIG: Record<CustomerSize, SizeConfigItem> = {
  micro: {
    label: "Micro",
    color: "bg-slate-100 text-slate-700",
  },
  small: {
    label: "Small",
    color: "bg-blue-100 text-blue-700",
  },
  medium: {
    label: "Medium",
    color: "bg-purple-100 text-purple-700",
  },
  large: {
    label: "Large",
    color: "bg-orange-100 text-orange-700",
  },
  enterprise: {
    label: "Enterprise",
    color: "bg-red-100 text-red-700",
  },
};

/**
 * Health score color utilities
 */
export function getHealthScoreColor(score: number | null): string {
  if (score === null) return "bg-gray-200 text-gray-600";
  if (score >= 80) return "bg-emerald-100 text-emerald-700";
  if (score >= 60) return "bg-yellow-100 text-yellow-700";
  if (score >= 40) return "bg-orange-100 text-orange-700";
  return "bg-red-100 text-red-700";
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
