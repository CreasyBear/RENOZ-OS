/**
 * Inventory Filter Configuration
 *
 * Config-driven filter definition for inventory domain.
 * Used with DomainFilterBar component.
 *
 * @see docs/design-system/FILTER-STANDARDS.md
 */

import {
  Package,
  AlertTriangle,
  Clock,
  CheckCircle,
  XCircle,
  Archive,
} from "lucide-react";
import type { FilterBarConfig, FilterOption } from "@/components/shared/filters";

// ============================================================================
// TYPES
// ============================================================================

export type InventoryStatus =
  | "available"
  | "allocated"
  | "sold"
  | "damaged"
  | "returned"
  | "quarantined";

export type QualityStatus = "good" | "damaged" | "expired" | "quarantined";

export type AgeRange = "all" | "0-30" | "31-60" | "61-90" | "90+";

export interface InventoryFiltersState extends Record<string, unknown> {
  search: string;
  productId: string | null;
  locationId: string | null;
  status: InventoryStatus[];
  qualityStatus: QualityStatus[];
  ageRange: AgeRange | null;
  quantityRange: { min: number | null; max: number | null } | null;
  valueRange: { min: number | null; max: number | null } | null;
}

export const DEFAULT_INVENTORY_FILTERS: InventoryFiltersState = {
  search: "",
  productId: null,
  locationId: null,
  status: [],
  qualityStatus: [],
  ageRange: null,
  quantityRange: null,
  valueRange: null,
};

// ============================================================================
// OPTIONS
// ============================================================================

export const INVENTORY_STATUS_OPTIONS: FilterOption<InventoryStatus>[] = [
  { value: "available", label: "Available", icon: CheckCircle },
  { value: "allocated", label: "Allocated", icon: Package },
  { value: "sold", label: "Sold" },
  { value: "damaged", label: "Damaged", icon: XCircle },
  { value: "returned", label: "Returned" },
  { value: "quarantined", label: "Quarantined", icon: AlertTriangle },
];

export const QUALITY_STATUS_OPTIONS: FilterOption<QualityStatus>[] = [
  { value: "good", label: "Good" },
  { value: "damaged", label: "Damaged" },
  { value: "expired", label: "Expired" },
  { value: "quarantined", label: "Quarantined" },
];

export const AGE_RANGE_OPTIONS: FilterOption<AgeRange>[] = [
  { value: "all", label: "All Ages" },
  { value: "0-30", label: "0-30 days" },
  { value: "31-60", label: "31-60 days" },
  { value: "61-90", label: "61-90 days" },
  { value: "90+", label: "90+ days" },
];

// ============================================================================
// FILTER BAR CONFIG
// ============================================================================

export const INVENTORY_FILTER_CONFIG: FilterBarConfig<InventoryFiltersState> = {
  search: {
    placeholder: "Search by SKU, serial number, or product name...",
    fields: ["sku", "serialNumber", "productName"],
  },
  filters: [
    {
      key: "status",
      label: "Status",
      type: "multi-select",
      options: INVENTORY_STATUS_OPTIONS,
      primary: true,
    },
    {
      key: "locationId",
      label: "Location",
      type: "select",
      options: [], // Populated dynamically
      primary: true,
      allLabel: "All Locations",
    },
    {
      key: "productId",
      label: "Product",
      type: "select",
      options: [], // Populated dynamically
      allLabel: "All Products",
    },
    {
      key: "qualityStatus",
      label: "Quality",
      type: "multi-select",
      options: QUALITY_STATUS_OPTIONS,
    },
    {
      key: "ageRange",
      label: "Inventory Age",
      type: "select",
      options: AGE_RANGE_OPTIONS,
      allLabel: "All Ages",
    },
    {
      key: "quantityRange",
      label: "Quantity",
      type: "number-range",
      minPlaceholder: "Min",
      maxPlaceholder: "Max",
      chipLabel: "Qty",
      formatChip: (value) => {
        const v = value as { min: number | null; max: number | null };
        if (v.min !== null && v.max !== null) {
          return `${v.min}-${v.max}`;
        }
        if (v.min !== null) return `≥ ${v.min}`;
        if (v.max !== null) return `≤ ${v.max}`;
        return "";
      },
    },
    {
      key: "valueRange",
      label: "Value",
      type: "number-range",
      prefix: "$",
      minPlaceholder: "Min",
      maxPlaceholder: "Max",
      chipLabel: "Value",
      formatChip: (value) => {
        const v = value as { min: number | null; max: number | null };
        if (v.min !== null && v.max !== null) {
          return `$${v.min.toLocaleString()}-$${v.max.toLocaleString()}`;
        }
        if (v.min !== null) return `≥ $${v.min.toLocaleString()}`;
        if (v.max !== null) return `≤ $${v.max.toLocaleString()}`;
        return "";
      },
    },
  ],
  presets: [
    {
      id: "low-stock",
      label: "Low Stock",
      icon: AlertTriangle,
      filters: { quantityRange: { min: 0, max: 10 } },
    },
    {
      id: "available",
      label: "Available",
      icon: CheckCircle,
      filters: { status: ["available"] },
    },
    {
      id: "aging",
      label: "Aging (90+ days)",
      icon: Clock,
      filters: { ageRange: "90+" },
    },
    {
      id: "quality-issues",
      label: "Quality Issues",
      icon: XCircle,
      filters: { qualityStatus: ["damaged", "expired", "quarantined"] },
    },
    {
      id: "quarantined",
      label: "Quarantined",
      icon: Archive,
      filters: { status: ["quarantined"] },
    },
  ],
  labels: {
    status: "Inventory Status",
    qualityStatus: "Quality Status",
    productId: "Product",
    locationId: "Location",
    ageRange: "Age",
    quantityRange: "Quantity",
    valueRange: "Value",
  },
};

// ============================================================================
// HELPER: Create config with dynamic product/location options
// ============================================================================

export function createInventoryFilterConfig(
  products: Array<{ id: string; name: string; sku: string }>,
  locations: Array<{ id: string; name: string; code: string }>
): FilterBarConfig<InventoryFiltersState> {
  const productOptions: FilterOption<string>[] = products.map((p) => ({
    value: p.id,
    label: `${p.sku} - ${p.name}`,
  }));

  const locationOptions: FilterOption<string>[] = locations.map((l) => ({
    value: l.id,
    label: `${l.code} - ${l.name}`,
  }));

  return {
    ...INVENTORY_FILTER_CONFIG,
    filters: INVENTORY_FILTER_CONFIG.filters.map((filter) => {
      if (filter.key === "productId") {
        return { ...filter, options: productOptions };
      }
      if (filter.key === "locationId") {
        return { ...filter, options: locationOptions };
      }
      return filter;
    }),
  };
}
