/**
 * Customer Filter Configuration
 *
 * Config-driven filter definition for customers domain.
 * Used with DomainFilterBar component.
 *
 * @see docs/design-system/FILTER-STANDARDS.md
 */

import {
  Users,
  Building2,
  Heart,
  TrendingUp,
  AlertTriangle,
  Star,
  UserCheck,
} from "lucide-react";
import type { FilterBarConfig, FilterOption } from "@/components/shared/filters";
import {
  customerStatusValues,
  customerTypeValues,
  customerSizeValues,
} from "@/lib/schemas/customers";

// ============================================================================
// TYPES
// ============================================================================

export type CustomerStatus = (typeof customerStatusValues)[number];
export type CustomerType = (typeof customerTypeValues)[number];
export type CustomerSize = (typeof customerSizeValues)[number];

export interface CustomerFiltersState extends Record<string, unknown> {
  search: string;
  status: CustomerStatus[];
  type: CustomerType[];
  size: CustomerSize[];
  healthScoreRange: { min: number | null; max: number | null } | null;
  tags: string[];
}

export const DEFAULT_CUSTOMER_FILTERS: CustomerFiltersState = {
  search: "",
  status: [],
  type: [],
  size: [],
  healthScoreRange: null,
  tags: [],
};

// ============================================================================
// OPTIONS
// ============================================================================

export const CUSTOMER_STATUS_OPTIONS: FilterOption<CustomerStatus>[] = [
  { value: "prospect", label: "Prospect" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
  { value: "suspended", label: "Suspended" },
  { value: "blacklisted", label: "Blacklisted" },
];

export const CUSTOMER_TYPE_OPTIONS: FilterOption<CustomerType>[] = [
  { value: "individual", label: "Individual", icon: Users },
  { value: "business", label: "Business", icon: Building2 },
  { value: "government", label: "Government" },
  { value: "non_profit", label: "Non-Profit" },
];

export const CUSTOMER_SIZE_OPTIONS: FilterOption<CustomerSize>[] = [
  { value: "micro", label: "Micro" },
  { value: "small", label: "Small" },
  { value: "medium", label: "Medium" },
  { value: "large", label: "Large" },
  { value: "enterprise", label: "Enterprise" },
];

// ============================================================================
// FILTER BAR CONFIG
// ============================================================================

export const CUSTOMER_FILTER_CONFIG: FilterBarConfig<CustomerFiltersState> = {
  search: {
    placeholder: "Search customers by name, email, phone, code...",
    fields: ["name", "email", "phone", "customerCode"],
  },
  filters: [
    {
      key: "status",
      label: "Status",
      type: "multi-select",
      options: CUSTOMER_STATUS_OPTIONS,
      primary: true,
    },
    {
      key: "type",
      label: "Type",
      type: "multi-select",
      options: CUSTOMER_TYPE_OPTIONS,
      primary: true,
    },
    {
      key: "size",
      label: "Size",
      type: "multi-select",
      options: CUSTOMER_SIZE_OPTIONS,
    },
    {
      key: "healthScoreRange",
      label: "Health Score",
      type: "number-range",
      min: 0,
      max: 100,
      minPlaceholder: "Min",
      maxPlaceholder: "Max",
      chipLabel: "Health",
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
      key: "tags",
      label: "Tags",
      type: "multi-select",
      options: [], // Populated dynamically
    },
  ],
  presets: [
    {
      id: "active-customers",
      label: "Active",
      icon: UserCheck,
      filters: { status: ["active"] },
    },
    {
      id: "at-risk",
      label: "At Risk",
      icon: AlertTriangle,
      filters: { healthScoreRange: { min: 0, max: 39 } },
    },
    {
      id: "high-value",
      label: "High Value",
      icon: Star,
      filters: { size: ["large", "enterprise"] },
    },
    {
      id: "healthy",
      label: "Healthy",
      icon: Heart,
      filters: { healthScoreRange: { min: 80, max: 100 } },
    },
    {
      id: "growing",
      label: "Growing",
      icon: TrendingUp,
      filters: { status: ["active"], healthScoreRange: { min: 60, max: 100 } },
    },
  ],
  labels: {
    status: "Status",
    type: "Customer Type",
    size: "Company Size",
    healthScoreRange: "Health Score",
    tags: "Tags",
  },
};

// ============================================================================
// HELPER: Create config with dynamic tag options
// ============================================================================

export function createCustomerFilterConfig(
  availableTags: Array<{ id: string; name: string; color: string }>
): FilterBarConfig<CustomerFiltersState> {
  const tagOptions: FilterOption<string>[] = availableTags.map((tag) => ({
    value: tag.id,
    label: tag.name,
  }));

  return {
    ...CUSTOMER_FILTER_CONFIG,
    filters: CUSTOMER_FILTER_CONFIG.filters.map((filter) =>
      filter.key === "tags" ? { ...filter, options: tagOptions } : filter
    ),
  };
}
