/**
 * Supplier Status Configuration
 *
 * Status badge configurations for supplier status and type.
 * Uses semantic colors from @/lib/status for consistency across React, PDF, and Email.
 *
 * @see docs/design-system/STATUS-BADGE-STANDARDS.md
 */

import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  Ban,
  Factory,
  Warehouse,
  Store,
  Wrench,
  Package,
} from "lucide-react";
import type { SemanticStatusConfigItem, TypeConfigItem } from "@/components/shared/data-table";
import type { SemanticColor } from "@/lib/status";
import type { SupplierStatus, SupplierType } from "@/lib/schemas/suppliers";

/**
 * Supplier status configuration for StatusCell
 */
export const SUPPLIER_STATUS_CONFIG: Record<SupplierStatus, SemanticStatusConfigItem> = {
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
  suspended: {
    label: "Suspended",
    color: "warning",
    icon: AlertTriangle,
  },
  blacklisted: {
    label: "Blacklisted",
    color: "error",
    icon: Ban,
  },
};

/**
 * Supplier type configuration for TypeCell
 * Note: TypeCell accepts variant as a prop, not in the config
 */
export const SUPPLIER_TYPE_CONFIG: Record<SupplierType, TypeConfigItem> = {
  manufacturer: {
    label: "Manufacturer",
    icon: Factory,
  },
  distributor: {
    label: "Distributor",
    icon: Warehouse,
  },
  retailer: {
    label: "Retailer",
    icon: Store,
  },
  service: {
    label: "Service",
    icon: Wrench,
  },
  raw_materials: {
    label: "Raw Materials",
    icon: Package,
  },
};

/**
 * Supplier status config for EntityHeader (StatusBadge format: variant + label)
 * Built explicitly to avoid type assertions (Object.fromEntries loses key types).
 */
export const SUPPLIER_STATUS_CONFIG_FOR_ENTITY_HEADER: Record<
  SupplierStatus,
  { variant: SemanticColor; label: string }
> = {
  active: { variant: 'success', label: 'Active' },
  inactive: { variant: 'inactive', label: 'Inactive' },
  suspended: { variant: 'warning', label: 'Suspended' },
  blacklisted: { variant: 'error', label: 'Blacklisted' },
};

/**
 * Format lead time days for display
 */
export function formatLeadTime(days: number | null): string {
  if (days === null || days === undefined) return "—";
  if (days === 0) return "Same day";
  if (days === 1) return "1 day";
  return `${days} days`;
}

/**
 * Format rating as a display value
 */
export function formatRating(rating: number | null): string {
  if (rating === null || rating === undefined) return "—";
  return rating.toFixed(1);
}
