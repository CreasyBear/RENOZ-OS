/**
 * Inventory Status Configuration
 *
 * Status badge configurations for inventory item statuses, movement types,
 * alert severities, and quality statuses.
 * Uses semantic colors from @/lib/status for consistency across React, PDF, and Email.
 *
 * @see docs/design-system/STATUS-BADGE-STANDARDS.md
 */

import {
  CheckCircle,
  Clock,
  XCircle,
  AlertCircle,
  AlertTriangle,
  Package,
  ArrowDown,
  ArrowLeftRight,
  Bell,
  BellOff,
  Truck,
  RotateCcw,
} from "lucide-react";
import type { SemanticStatusConfigItem } from "@/components/shared/data-table";
import type { ItemDetailData } from "./item-detail";
import type { AlertSeverity, AlertType } from "./alerts/alerts-panel";
import type { MovementRecord } from "./item-tabs";

// ─────────────────────────────────────────────────────────────────────────────
// INVENTORY ITEM STATUS
// ─────────────────────────────────────────────────────────────────────────────

export const INVENTORY_STATUS_CONFIG: Record<ItemDetailData["status"], SemanticStatusConfigItem> = {
  available: {
    label: "Available",
    color: "success",
    icon: CheckCircle,
  },
  allocated: {
    label: "Allocated",
    color: "info",
    icon: Clock,
  },
  sold: {
    label: "Sold",
    color: "neutral",
    icon: CheckCircle,
  },
  damaged: {
    label: "Damaged",
    color: "error",
    icon: AlertCircle,
  },
  returned: {
    label: "Returned",
    color: "warning",
    icon: XCircle,
  },
  quarantined: {
    label: "Quarantined",
    color: "pending",
    icon: AlertTriangle,
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// QUALITY STATUS
// ─────────────────────────────────────────────────────────────────────────────

export const QUALITY_STATUS_CONFIG: Record<NonNullable<ItemDetailData["qualityStatus"]>, SemanticStatusConfigItem> = {
  good: {
    label: "Good",
    color: "success",
    icon: CheckCircle,
  },
  damaged: {
    label: "Damaged",
    color: "error",
    icon: AlertCircle,
  },
  expired: {
    label: "Expired",
    color: "warning",
    icon: Clock,
  },
  quarantined: {
    label: "Quarantined",
    color: "pending",
    icon: AlertTriangle,
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// MOVEMENT TYPE
// ─────────────────────────────────────────────────────────────────────────────

export const MOVEMENT_TYPE_CONFIG: Record<MovementRecord["movementType"], SemanticStatusConfigItem> = {
  receive: {
    label: "Received",
    color: "success",
    icon: ArrowDown,
  },
  allocate: {
    label: "Allocated",
    color: "info",
    icon: ArrowLeftRight,
  },
  deallocate: {
    label: "Released",
    color: "neutral",
    icon: ArrowLeftRight,
  },
  pick: {
    label: "Picked",
    color: "info",
    icon: Package,
  },
  ship: {
    label: "Shipped",
    color: "info",
    icon: Truck,
  },
  adjust: {
    label: "Adjusted",
    color: "neutral",
    icon: ArrowLeftRight,
  },
  return: {
    label: "Returned",
    color: "success",
    icon: RotateCcw,
  },
  transfer: {
    label: "Transferred",
    color: "neutral",
    icon: ArrowLeftRight,
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// ALERT SEVERITY
// ─────────────────────────────────────────────────────────────────────────────

export const ALERT_SEVERITY_CONFIG: Record<AlertSeverity, SemanticStatusConfigItem> = {
  critical: {
    label: "Critical",
    color: "error",
    icon: AlertCircle,
  },
  warning: {
    label: "Warning",
    color: "warning",
    icon: AlertTriangle,
  },
  info: {
    label: "Info",
    color: "info",
    icon: Bell,
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// ALERT ACTIVE STATUS
// ─────────────────────────────────────────────────────────────────────────────

export const ALERT_ACTIVE_STATUS_CONFIG: Record<string, SemanticStatusConfigItem> = {
  active: {
    label: "Active",
    color: "success",
    icon: Bell,
  },
  inactive: {
    label: "Inactive",
    color: "inactive",
    icon: BellOff,
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// FORECAST ACCURACY STATUS
// ─────────────────────────────────────────────────────────────────────────────

export const FORECAST_ACCURACY_CONFIG: Record<string, SemanticStatusConfigItem> = {
  high: {
    label: "High",
    color: "success",
    icon: CheckCircle,
  },
  medium: {
    label: "Medium",
    color: "warning",
    icon: AlertTriangle,
  },
  low: {
    label: "Low",
    color: "error",
    icon: AlertCircle,
  },
};

/**
 * Get forecast accuracy level based on percentage
 */
export function getForecastAccuracyLevel(accuracy: number): "high" | "medium" | "low" {
  if (accuracy >= 90) return "high";
  if (accuracy >= 70) return "medium";
  return "low";
}

// ─────────────────────────────────────────────────────────────────────────────
// STOCK STATUS (for dashboard/summaries)
// ─────────────────────────────────────────────────────────────────────────────

export const STOCK_STATUS_CONFIG: Record<string, SemanticStatusConfigItem> = {
  in_stock: {
    label: "In Stock",
    color: "success",
    icon: CheckCircle,
  },
  low_stock: {
    label: "Low Stock",
    color: "warning",
    icon: AlertTriangle,
  },
  out_of_stock: {
    label: "Out of Stock",
    color: "error",
    icon: XCircle,
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// ALERT TYPE CONFIG (for display labels and icons)
// ─────────────────────────────────────────────────────────────────────────────

export const ALERT_TYPE_DISPLAY_CONFIG: Record<AlertType, { label: string; description: string }> = {
  low_stock: {
    label: "Low Stock",
    description: "Stock below reorder point",
  },
  out_of_stock: {
    label: "Out of Stock",
    description: "No available inventory",
  },
  overstock: {
    label: "Overstock",
    description: "Excess inventory above threshold",
  },
  expiry: {
    label: "Expiring Soon",
    description: "Items approaching expiry date",
  },
  slow_moving: {
    label: "Slow Moving",
    description: "Low turnover inventory",
  },
  forecast_deviation: {
    label: "Forecast Deviation",
    description: "Actual differs from forecast",
  },
};
