/**
 * Pricing Filter Configuration
 *
 * Config-driven filter definition for pricing/price lists domain.
 * Used with DomainFilterBar component.
 *
 * @see docs/design-system/FILTER-STANDARDS.md
 */

import {
  CheckCircle,
  Clock,
  Star,
  AlertTriangle,
} from "lucide-react";
import type { FilterBarConfig, FilterOption } from "@/components/shared/filters";
import type { PriceListStatus } from "@/lib/schemas/pricing";

// ============================================================================
// TYPES
// ============================================================================

export interface PricingFiltersState extends Record<string, unknown> {
  search: string;
  status: PriceListStatus | null;
  supplierId: string | null;
  productId: string | null;
  isPreferred: boolean;
}

export const DEFAULT_PRICING_FILTERS: PricingFiltersState = {
  search: "",
  status: null,
  supplierId: null,
  productId: null,
  isPreferred: false,
};

// ============================================================================
// OPTIONS
// ============================================================================

export const PRICING_STATUS_OPTIONS: FilterOption<PriceListStatus>[] = [
  { value: "active", label: "Active", icon: CheckCircle },
  { value: "draft", label: "Draft", icon: Clock },
  { value: "expired", label: "Expired", icon: AlertTriangle },
];

// ============================================================================
// FILTER BAR CONFIG
// ============================================================================

export const PRICING_FILTER_CONFIG: FilterBarConfig<PricingFiltersState> = {
  search: {
    placeholder: "Search by product, supplier, or SKU...",
    fields: ["productName", "supplierName", "sku"],
  },
  filters: [
    {
      key: "status",
      label: "Status",
      type: "select",
      options: PRICING_STATUS_OPTIONS,
      primary: true,
      allLabel: "All Statuses",
    },
    {
      key: "supplierId",
      label: "Supplier",
      type: "select",
      options: [], // Populated dynamically
      primary: true,
      allLabel: "All Suppliers",
    },
    {
      key: "productId",
      label: "Product",
      type: "select",
      options: [], // Populated dynamically
      allLabel: "All Products",
    },
    {
      key: "isPreferred",
      label: "Preferred Only",
      type: "toggle",
    },
  ],
  presets: [
    {
      id: "active",
      label: "Active",
      icon: CheckCircle,
      filters: { status: "active" },
    },
    {
      id: "preferred",
      label: "Preferred",
      icon: Star,
      filters: { isPreferred: true },
    },
    {
      id: "expired",
      label: "Expired",
      icon: AlertTriangle,
      filters: { status: "expired" },
    },
    {
      id: "drafts",
      label: "Drafts",
      icon: Clock,
      filters: { status: "draft" },
    },
  ],
  labels: {
    status: "Price Status",
    supplierId: "Supplier",
    productId: "Product",
    isPreferred: "Preferred",
  },
};

// ============================================================================
// HELPER: Create config with dynamic options
// ============================================================================

export function createPricingFilterConfig(
  suppliers: Array<{ id: string; name: string }>,
  products: Array<{ id: string; name: string }>
): FilterBarConfig<PricingFiltersState> {
  const supplierOptions: FilterOption<string>[] = suppliers.map((s) => ({
    value: s.id,
    label: s.name,
  }));

  const productOptions: FilterOption<string>[] = products.map((p) => ({
    value: p.id,
    label: p.name,
  }));

  return {
    ...PRICING_FILTER_CONFIG,
    filters: PRICING_FILTER_CONFIG.filters.map((filter) => {
      if (filter.key === "supplierId") {
        return { ...filter, options: supplierOptions };
      }
      if (filter.key === "productId") {
        return { ...filter, options: productOptions };
      }
      return filter;
    }),
  };
}
