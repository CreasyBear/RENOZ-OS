/**
 * Purchase Order Filter Configuration
 *
 * Config-driven filter definition for purchase orders domain.
 * Used with DomainFilterBar component.
 * Use usePOFilterConfig() for config with org currency formatting.
 *
 * @see docs/design-system/FILTER-STANDARDS.md
 */

import { useMemo } from "react";
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
import {
  defaultPurchaseOrderFilters,
  type ListPurchaseOrdersInput,
  type PurchaseOrderStatus,
  type PurchaseOrderFiltersState,
} from "@/lib/schemas/purchase-orders";
import { useOrgFormat } from "@/hooks/use-org-format";

// ============================================================================
// TYPES (re-export from schemas - single source of truth)
// ============================================================================

export const DEFAULT_PO_FILTERS = defaultPurchaseOrderFilters;

// ============================================================================
// FILTER-TO-QUERY MAPPING
// ============================================================================

/** Maps PurchaseOrderFiltersState to ListPurchaseOrdersInput (server query params). */
export function buildPOQuery(
  filters: PurchaseOrderFiltersState
): Partial<ListPurchaseOrdersInput> {
  const today = new Date().toISOString().split('T')[0];
  return {
    search: filters.search || undefined,
    status: filters.status.length > 0 ? [...filters.status].sort() : undefined,
    supplierId: filters.supplierId || undefined,
    startDate: filters.dateRange?.from?.toISOString(),
    endDate: filters.dateRange?.to?.toISOString(),
    valueMin: filters.totalRange?.min ?? undefined,
    valueMax: filters.totalRange?.max ?? undefined,
    requiredBefore: filters.overdue ? today : undefined,
  };
}

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

export const PO_FILTER_CONFIG: FilterBarConfig<PurchaseOrderFiltersState> = {
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
        if (v.min != null && v.max != null) {
          return `$${v.min.toLocaleString()}-$${v.max.toLocaleString()}`;
        }
        if (v.min != null) return `≥ $${v.min.toLocaleString()}`;
        if (v.max != null) return `≤ $${v.max.toLocaleString()}`;
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
// HOOK: Config with org currency formatting (amounts in dollars)
// ============================================================================

export function usePOFilterConfig(
  suppliers?: Array<{ id: string; name: string }>
): FilterBarConfig<PurchaseOrderFiltersState> {
  const { formatCurrency } = useOrgFormat();

  return useMemo(() => {
    const formatChip = (value: unknown) => {
      const v = value as { min: number | null; max: number | null };
      const fmt = (n: number) => formatCurrency(n, { cents: false, showCents: false });
      if (v.min != null && v.max != null) {
        return `${fmt(v.min)}-${fmt(v.max)}`;
      }
      if (v.min != null) return `≥ ${fmt(v.min)}`;
      if (v.max != null) return `≤ ${fmt(v.max)}`;
      return "";
    };

    const filters = PO_FILTER_CONFIG.filters.map((filter) => {
      if (filter.key === "totalRange") {
        return { ...filter, formatChip };
      }
      if (filter.key === "supplierId" && suppliers?.length) {
        return {
          ...filter,
          options: suppliers.map((s) => ({ value: s.id, label: s.name })),
        };
      }
      return filter;
    });

    return { ...PO_FILTER_CONFIG, filters };
  }, [formatCurrency, suppliers]);
}

// ============================================================================
// LEGACY: Create config with dynamic supplier options (no org format)
// ============================================================================

export function createPOFilterConfig(
  suppliers: Array<{ id: string; name: string }>
): FilterBarConfig<PurchaseOrderFiltersState> {
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
