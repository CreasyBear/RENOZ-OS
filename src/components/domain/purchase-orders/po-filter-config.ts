/**
 * Purchase Order Filter Configuration
 *
 * Config-driven filter definition for purchase orders domain.
 * Used with DomainFilterBar component.
 *
 * @see docs/design-system/FILTER-STANDARDS.md
 */

import {
  Clock,
  CheckCircle,
  Package,
  Truck,
  XCircle,
  AlertTriangle,
  FileText,
} from "lucide-react";
import type { FilterBarConfig, FilterOption } from "@/components/shared/filters";
import type { PurchaseOrderStatus } from "@/lib/schemas/purchase-orders";

// ============================================================================
// TYPES
// ============================================================================

export interface POFiltersState extends Record<string, unknown> {
  search: string;
  status: PurchaseOrderStatus[];
  supplierId: string | null;
  dateRange: { from: Date | null; to: Date | null } | null;
  totalRange: { min: number | null; max: number | null } | null;
}

export const DEFAULT_PO_FILTERS: POFiltersState = {
  search: "",
  status: [],
  supplierId: null,
  dateRange: null,
  totalRange: null,
};

// ============================================================================
// OPTIONS
// ============================================================================

export const PO_STATUS_OPTIONS: FilterOption<PurchaseOrderStatus>[] = [
  { value: "draft", label: "Draft", icon: FileText },
  { value: "pending_approval", label: "Pending Approval", icon: Clock },
  { value: "approved", label: "Approved", icon: CheckCircle },
  { value: "ordered", label: "Ordered", icon: Package },
  { value: "partial_received", label: "Partially Received", icon: Truck },
  { value: "received", label: "Received", icon: CheckCircle },
  { value: "closed", label: "Closed" },
  { value: "cancelled", label: "Cancelled", icon: XCircle },
];

// ============================================================================
// FILTER BAR CONFIG
// ============================================================================

export const PO_FILTER_CONFIG: FilterBarConfig<POFiltersState> = {
  search: {
    placeholder: "Search by PO number, supplier, or notes...",
    fields: ["poNumber", "supplierName", "notes"],
  },
  filters: [
    {
      key: "status",
      label: "Status",
      type: "multi-select",
      options: PO_STATUS_OPTIONS,
      primary: true,
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
      key: "dateRange",
      label: "Order Date",
      type: "date-range",
      placeholder: "Select date range",
    },
    {
      key: "totalRange",
      label: "Total Amount",
      type: "number-range",
      prefix: "$",
      minPlaceholder: "Min",
      maxPlaceholder: "Max",
      chipLabel: "Total",
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
      id: "pending-approval",
      label: "Pending Approval",
      icon: Clock,
      filters: { status: ["pending_approval"] },
    },
    {
      id: "awaiting-delivery",
      label: "Awaiting Delivery",
      icon: Truck,
      filters: { status: ["approved", "ordered"] },
    },
    {
      id: "partial-received",
      label: "Partially Received",
      icon: AlertTriangle,
      filters: { status: ["partial_received"] },
    },
    {
      id: "completed",
      label: "Completed",
      icon: CheckCircle,
      filters: { status: ["received", "closed"] },
    },
  ],
  labels: {
    status: "PO Status",
    supplierId: "Supplier",
    dateRange: "Order Date",
    totalRange: "Total",
  },
};

// ============================================================================
// HELPER: Create config with dynamic supplier options
// ============================================================================

export function createPOFilterConfig(
  suppliers: Array<{ id: string; name: string }>
): FilterBarConfig<POFiltersState> {
  const supplierOptions: FilterOption<string>[] = suppliers.map((s) => ({
    value: s.id,
    label: s.name,
  }));

  return {
    ...PO_FILTER_CONFIG,
    filters: PO_FILTER_CONFIG.filters.map((filter) =>
      filter.key === "supplierId" ? { ...filter, options: supplierOptions } : filter
    ),
  };
}
