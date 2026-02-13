/**
 * Warranty Filter Configuration
 *
 * Config-driven filter definition for warranty domain.
 * Used with DomainFilterBar component.
 *
 * @see docs/design-system/FILTER-STANDARDS.md
 */

import {
  CheckCircle,
  Clock,
  AlertTriangle,
  XCircle,
  ArrowRightLeft,
  Shield,
} from "lucide-react";
import type { FilterBarConfig, FilterOption } from "@/components/shared/filters";

// ============================================================================
// TYPES
// ============================================================================

// Import types from schemas per SCHEMA-TRACE.md
import type { WarrantyStatus } from '@/lib/schemas/warranty';
import type { WarrantyPolicyTypeValue } from '@/lib/schemas/warranty/policies';

// Re-export for convenience
export type { WarrantyStatus };

export interface WarrantyFiltersState extends Record<string, unknown> {
  search: string;
  status: WarrantyStatus | null;
  policyType: WarrantyPolicyTypeValue | null;
  customerId: string | null;
}

export const DEFAULT_WARRANTY_FILTERS: WarrantyFiltersState = {
  search: "",
  status: null,
  policyType: null,
  customerId: null,
};

// ============================================================================
// OPTIONS
// ============================================================================

export const WARRANTY_STATUS_OPTIONS: FilterOption<WarrantyStatus>[] = [
  { value: "active", label: "Active", icon: CheckCircle },
  { value: "expiring_soon", label: "Expiring Soon", icon: Clock },
  { value: "expired", label: "Expired", icon: AlertTriangle },
  { value: "voided", label: "Voided", icon: XCircle },
  { value: "transferred", label: "Transferred", icon: ArrowRightLeft },
];

export const WARRANTY_POLICY_TYPE_OPTIONS: FilterOption<WarrantyPolicyTypeValue>[] = [
  { value: "battery_performance", label: "Battery Performance" },
  { value: "inverter_manufacturer", label: "Inverter Manufacturer" },
  { value: "installation_workmanship", label: "Installation Workmanship" },
];

// ============================================================================
// FILTER BAR CONFIG
// ============================================================================

export const WARRANTY_FILTER_CONFIG: FilterBarConfig<WarrantyFiltersState> = {
  search: {
    placeholder: "Search warranty number, customer, product...",
    fields: ["warrantyNumber", "customerName", "productName"],
  },
  filters: [
    {
      key: "status",
      label: "Status",
      type: "select",
      options: WARRANTY_STATUS_OPTIONS,
      primary: true,
      allLabel: "All Statuses",
    },
    {
      key: "policyType",
      label: "Policy Type",
      type: "select",
      options: WARRANTY_POLICY_TYPE_OPTIONS,
      primary: true,
      allLabel: "All Types",
    },
    {
      key: "customerId",
      label: "Customer",
      type: "select",
      options: [], // Populated dynamically
      allLabel: "All Customers",
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
      id: "expiring-soon",
      label: "Expiring Soon",
      icon: Clock,
      filters: { status: "expiring_soon" },
    },
    {
      id: "expired",
      label: "Expired",
      icon: AlertTriangle,
      filters: { status: "expired" },
    },
    {
      id: "battery",
      label: "Battery Warranties",
      icon: Shield,
      filters: { policyType: "battery_performance" },
    },
  ],
  labels: {
    status: "Warranty Status",
    policyType: "Policy Type",
    customerId: "Customer",
  },
};

// ============================================================================
// HELPER: Create config with dynamic customer options
// ============================================================================

export function createWarrantyFilterConfig(
  customers: Array<{ id: string; name: string }>
): FilterBarConfig<WarrantyFiltersState> {
  const customerOptions: FilterOption<string>[] = customers.map((c) => ({
    value: c.id,
    label: c.name,
  }));

  return {
    ...WARRANTY_FILTER_CONFIG,
    filters: WARRANTY_FILTER_CONFIG.filters.map((filter) =>
      filter.key === "customerId" ? { ...filter, options: customerOptions } : filter
    ),
  };
}
