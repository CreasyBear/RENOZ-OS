/**
 * Product Status Configuration
 *
 * Status badge configurations for product status and type.
 * Used with StatusCell and TypeCell components from shared data-table cells.
 *
 * @see docs/design-system/STATUS-BADGE-STANDARDS.md
 */

import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  Package,
  Wrench,
  FileDigit,
  Layers,
} from "lucide-react";
import type { SemanticStatusConfigItem, TypeConfigItem } from "@/components/shared/data-table";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export type ProductStatus = "active" | "inactive" | "discontinued";
export type ProductType = "physical" | "service" | "digital" | "bundle";
export type StockStatus = "in_stock" | "low_stock" | "out_of_stock" | "not_tracked";

// ============================================================================
// STATUS CONFIGURATION
// ============================================================================

/**
 * Product status configuration for StatusCell
 */
export const PRODUCT_STATUS_CONFIG: Record<ProductStatus, SemanticStatusConfigItem> = {
  active: {
    label: "Active",
    color: "success",
    icon: CheckCircle,
  },
  inactive: {
    label: "Inactive",
    color: "inactive",
    icon: XCircle,
  },
  discontinued: {
    label: "Discontinued",
    color: "error",
    icon: AlertTriangle,
  },
};

// ============================================================================
// TYPE CONFIGURATION
// ============================================================================

/**
 * Product type configuration for TypeCell
 */
export const PRODUCT_TYPE_CONFIG: Record<ProductType, TypeConfigItem> = {
  physical: {
    label: "Physical",
    icon: Package,
  },
  service: {
    label: "Service",
    icon: Wrench,
  },
  digital: {
    label: "Digital",
    icon: FileDigit,
  },
  bundle: {
    label: "Bundle",
    icon: Layers,
  },
};

// ============================================================================
// STOCK STATUS CONFIGURATION
// ============================================================================

/**
 * Stock status configuration for display
 */
export const STOCK_STATUS_CONFIG: Record<Exclude<StockStatus, "not_tracked">, SemanticStatusConfigItem> = {
  in_stock: {
    label: "In Stock",
    color: "success",
  },
  low_stock: {
    label: "Low",
    color: "warning",
  },
  out_of_stock: {
    label: "Out",
    color: "error",
  },
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Calculate margin percentage from base price and cost price
 */
export function calculateMargin(basePrice: number, costPrice: number | null): number | null {
  if (!costPrice || costPrice <= 0 || basePrice <= 0) return null;
  return ((basePrice - costPrice) / basePrice) * 100;
}

/**
 * Format margin with color coding for display
 */
export function formatMargin(margin: number | null): { text: string; color: string } {
  if (margin === null) return { text: "-", color: "text-muted-foreground" };
  if (margin < 0) return { text: `${margin.toFixed(1)}%`, color: "text-red-600" };
  if (margin < 20) return { text: `${margin.toFixed(1)}%`, color: "text-amber-600" };
  return { text: `${margin.toFixed(1)}%`, color: "text-green-600" };
}

/**
 * Get stock status configuration, returning null for not tracked items
 */
export function getStockStatusConfig(stockStatus: StockStatus | undefined) {
  if (!stockStatus || stockStatus === "not_tracked") return null;
  return STOCK_STATUS_CONFIG[stockStatus];
}
