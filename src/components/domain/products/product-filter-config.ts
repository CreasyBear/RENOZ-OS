/**
 * Product Filter Configuration
 *
 * Config-driven filter definition for products domain.
 * Used with DomainFilterBar component.
 *
 * @see docs/design-system/FILTER-STANDARDS.md
 */

import {
  CheckCircle,
  XCircle,
  Package,
  Wrench,
  FileCode,
  Layers,
  DollarSign,
  AlertTriangle,
} from "lucide-react";
import type { FilterBarConfig, FilterOption } from "@/components/shared/filters";

// ============================================================================
// TYPES
// ============================================================================

export type ProductStatus = "active" | "inactive" | "discontinued";
export type ProductType = "physical" | "service" | "digital" | "bundle";

export interface ProductFiltersState extends Record<string, unknown> {
  search: string;
  status: ProductStatus[];
  type: ProductType[];
  priceRange: { min: number | null; max: number | null } | null;
  tags: string[];
}

export const DEFAULT_PRODUCT_FILTERS: ProductFiltersState = {
  search: "",
  status: [],
  type: [],
  priceRange: null,
  tags: [],
};

// ============================================================================
// OPTIONS
// ============================================================================

export const PRODUCT_STATUS_OPTIONS: FilterOption<ProductStatus>[] = [
  { value: "active", label: "Active", icon: CheckCircle },
  { value: "inactive", label: "Inactive" },
  { value: "discontinued", label: "Discontinued", icon: XCircle },
];

export const PRODUCT_TYPE_OPTIONS: FilterOption<ProductType>[] = [
  { value: "physical", label: "Physical", icon: Package },
  { value: "service", label: "Service", icon: Wrench },
  { value: "digital", label: "Digital", icon: FileCode },
  { value: "bundle", label: "Bundle", icon: Layers },
];

// ============================================================================
// FILTER BAR CONFIG
// ============================================================================

export const PRODUCT_FILTER_CONFIG: FilterBarConfig<ProductFiltersState> = {
  search: {
    placeholder: "Search products by name, SKU, or description...",
    fields: ["name", "sku", "description"],
  },
  filters: [
    {
      key: "status",
      label: "Status",
      type: "multi-select",
      options: PRODUCT_STATUS_OPTIONS,
      primary: true,
    },
    {
      key: "type",
      label: "Type",
      type: "multi-select",
      options: PRODUCT_TYPE_OPTIONS,
      primary: true,
    },
    {
      key: "priceRange",
      label: "Price",
      type: "number-range",
      prefix: "$",
      minPlaceholder: "Min",
      maxPlaceholder: "Max",
      chipLabel: "Price",
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
    {
      key: "tags",
      label: "Tags",
      type: "multi-select",
      options: [], // Populated dynamically
    },
  ],
  presets: [
    {
      id: "active",
      label: "Active",
      icon: CheckCircle,
      filters: { status: ["active"] },
    },
    {
      id: "physical-products",
      label: "Physical",
      icon: Package,
      filters: { type: ["physical"] },
    },
    {
      id: "services",
      label: "Services",
      icon: Wrench,
      filters: { type: ["service"] },
    },
    {
      id: "high-value",
      label: "High Value",
      icon: DollarSign,
      filters: { priceRange: { min: 1000, max: null } },
    },
    {
      id: "discontinued",
      label: "Discontinued",
      icon: AlertTriangle,
      filters: { status: ["discontinued"] },
    },
  ],
  labels: {
    status: "Product Status",
    type: "Product Type",
    priceRange: "Price",
    tags: "Tags",
  },
};

// ============================================================================
// HELPER: Create config with dynamic tag options
// ============================================================================

export function createProductFilterConfig(
  tags: Array<{ id: string; name: string }>
): FilterBarConfig<ProductFiltersState> {
  const tagOptions: FilterOption<string>[] = tags.map((t) => ({
    value: t.id,
    label: t.name,
  }));

  return {
    ...PRODUCT_FILTER_CONFIG,
    filters: PRODUCT_FILTER_CONFIG.filters.map((filter) =>
      filter.key === "tags" ? { ...filter, options: tagOptions } : filter
    ),
  };
}
