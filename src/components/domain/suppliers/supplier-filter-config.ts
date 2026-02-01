/**
 * Supplier Filter Configuration
 *
 * Config-driven filter definition for suppliers domain.
 * Used with DomainFilterBar component.
 *
 * @see docs/design-system/FILTER-STANDARDS.md
 */

import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  Star,
  Factory,
  Truck,
  Store,
  Wrench,
  Package,
} from "lucide-react";
import type { FilterBarConfig, FilterOption } from "@/components/shared/filters";
import type { SupplierStatus, SupplierType } from "@/lib/schemas/suppliers";

// ============================================================================
// TYPES
// ============================================================================

export interface SupplierFiltersState extends Record<string, unknown> {
  search: string;
  status: SupplierStatus[];
  supplierType: SupplierType[];
  ratingRange: { min: number | null; max: number | null } | null;
}

export const DEFAULT_SUPPLIER_FILTERS: SupplierFiltersState = {
  search: "",
  status: [],
  supplierType: [],
  ratingRange: null,
};

// ============================================================================
// OPTIONS
// ============================================================================

export const SUPPLIER_STATUS_OPTIONS: FilterOption<SupplierStatus>[] = [
  { value: "active", label: "Active", icon: CheckCircle },
  { value: "inactive", label: "Inactive" },
  { value: "suspended", label: "Suspended", icon: AlertTriangle },
  { value: "blacklisted", label: "Blacklisted", icon: XCircle },
];

export const SUPPLIER_TYPE_OPTIONS: FilterOption<SupplierType>[] = [
  { value: "manufacturer", label: "Manufacturer", icon: Factory },
  { value: "distributor", label: "Distributor", icon: Truck },
  { value: "retailer", label: "Retailer", icon: Store },
  { value: "service", label: "Service Provider", icon: Wrench },
  { value: "raw_materials", label: "Raw Materials", icon: Package },
];

// ============================================================================
// FILTER BAR CONFIG
// ============================================================================

export const SUPPLIER_FILTER_CONFIG: FilterBarConfig<SupplierFiltersState> = {
  search: {
    placeholder: "Search suppliers by name, code, or contact...",
    fields: ["name", "supplierCode", "contactName", "email"],
  },
  filters: [
    {
      key: "status",
      label: "Status",
      type: "multi-select",
      options: SUPPLIER_STATUS_OPTIONS,
      primary: true,
    },
    {
      key: "supplierType",
      label: "Type",
      type: "multi-select",
      options: SUPPLIER_TYPE_OPTIONS,
      primary: true,
    },
    {
      key: "ratingRange",
      label: "Rating",
      type: "number-range",
      min: 0,
      max: 5,
      step: 0.5,
      minPlaceholder: "Min",
      maxPlaceholder: "Max",
      chipLabel: "Rating",
      formatChip: (value) => {
        const v = value as { min: number | null; max: number | null };
        if (v.min !== null && v.max !== null) {
          return `${v.min}-${v.max} ★`;
        }
        if (v.min !== null) return `≥ ${v.min} ★`;
        if (v.max !== null) return `≤ ${v.max} ★`;
        return "";
      },
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
      id: "top-rated",
      label: "Top Rated",
      icon: Star,
      filters: { ratingRange: { min: 4, max: null } },
    },
    {
      id: "manufacturers",
      label: "Manufacturers",
      icon: Factory,
      filters: { supplierType: ["manufacturer"] },
    },
    {
      id: "needs-review",
      label: "Needs Review",
      icon: AlertTriangle,
      filters: { status: ["suspended"], ratingRange: { min: null, max: 3 } },
    },
  ],
  labels: {
    status: "Supplier Status",
    supplierType: "Supplier Type",
    ratingRange: "Rating",
  },
};
