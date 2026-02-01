/**
 * Alert Type Configuration
 *
 * Alert type badge configurations for inventory alert rules.
 * Used with TypeCell component from shared data-table cells.
 */

import {
  AlertTriangle,
  AlertCircle,
  Clock,
  TrendingDown,
  Archive,
} from "lucide-react";
import type { TypeConfigItem } from "@/components/shared/data-table";

/**
 * Alert type enumeration
 */
export type AlertType =
  | "low_stock"
  | "out_of_stock"
  | "overstock"
  | "expiry"
  | "slow_moving"
  | "forecast_deviation";

/**
 * Extended config item with color for custom styling
 */
export interface AlertTypeConfigItem extends TypeConfigItem {
  /** Text color class for the icon */
  color: string;
}

/**
 * Alert type configuration for displaying alert badges
 */
export const ALERT_TYPE_CONFIG: Record<AlertType, AlertTypeConfigItem> = {
  low_stock: {
    label: "Low Stock",
    icon: TrendingDown,
    color: "text-orange-600",
  },
  out_of_stock: {
    label: "Out of Stock",
    icon: AlertCircle,
    color: "text-red-600",
  },
  overstock: {
    label: "Overstock",
    icon: Archive,
    color: "text-blue-600",
  },
  expiry: {
    label: "Expiry",
    icon: Clock,
    color: "text-purple-600",
  },
  slow_moving: {
    label: "Slow Moving",
    icon: Clock,
    color: "text-gray-600",
  },
  forecast_deviation: {
    label: "Forecast Deviation",
    icon: AlertTriangle,
    color: "text-yellow-600",
  },
};

/**
 * Get display label for an alert type
 */
export function getAlertTypeLabel(alertType: AlertType): string {
  return ALERT_TYPE_CONFIG[alertType]?.label ?? alertType;
}

/**
 * Format threshold value based on alert type
 */
export function formatThresholdValue(
  alertType: AlertType,
  thresholdValue: number,
  thresholdPercentage?: number | null
): { value: string; suffix?: string } {
  if (alertType === "forecast_deviation" && thresholdPercentage) {
    return { value: `${thresholdPercentage}%` };
  }

  if (alertType === "expiry") {
    return { value: thresholdValue.toLocaleString(), suffix: "days" };
  }

  return { value: thresholdValue.toLocaleString() };
}
