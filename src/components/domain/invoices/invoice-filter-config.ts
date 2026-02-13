/**
 * Invoice Filter Configuration
 *
 * Config-driven filter definition for invoices domain.
 * Used with DomainFilterBar component.
 *
 * @see docs/design-system/FILTER-STANDARDS.md
 */

import { AlertTriangle, DollarSign, FileText, Clock } from "lucide-react";
import type { FilterBarConfig, FilterOption } from "@/components/shared/filters";
import type { InvoiceStatus } from "@/lib/constants/invoice-status";
import { INVOICE_STATUS_CONFIG } from "@/lib/constants/invoice-status";

// ============================================================================
// FILTER STATE TYPES
// ============================================================================

export interface InvoiceFiltersState extends Record<string, unknown> {
  search: string;
  status: InvoiceStatus | null;
  customerId: string | null;
  dateRange: { from: Date | null; to: Date | null } | null;
  amountRange: { min: number | null; max: number | null } | null;
}

export const DEFAULT_INVOICE_FILTERS: InvoiceFiltersState = {
  search: "",
  status: null,
  customerId: null,
  dateRange: null,
  amountRange: null,
};

// ============================================================================
// OPTIONS
// ============================================================================

export const INVOICE_STATUS_FILTER_OPTIONS: FilterOption<InvoiceStatus>[] = [
  { value: "draft", label: INVOICE_STATUS_CONFIG.draft.label },
  { value: "scheduled", label: INVOICE_STATUS_CONFIG.scheduled.label },
  { value: "unpaid", label: INVOICE_STATUS_CONFIG.unpaid.label },
  { value: "overdue", label: INVOICE_STATUS_CONFIG.overdue.label },
  { value: "paid", label: INVOICE_STATUS_CONFIG.paid.label },
  { value: "canceled", label: INVOICE_STATUS_CONFIG.canceled.label },
  { value: "refunded", label: INVOICE_STATUS_CONFIG.refunded.label },
];

// ============================================================================
// FILTER BAR CONFIG
// ============================================================================

export const INVOICE_FILTER_CONFIG: FilterBarConfig<InvoiceFiltersState> = {
  search: {
    placeholder: "Search invoices by number, customer, or order number...",
    fields: ["invoiceNumber", "orderNumber", "customerName"],
  },
  filters: [
    {
      key: "status",
      label: "Status",
      type: "select",
      options: INVOICE_STATUS_FILTER_OPTIONS,
      primary: true,
      allLabel: "All Statuses",
    },
    {
      key: "customerId",
      label: "Customer",
      type: "select",
      options: [], // Populated dynamically via createInvoiceFilterConfig
      primary: false,
      allLabel: "All Customers",
      disabled: false, // Will be set dynamically based on loading/error state
    },
    {
      key: "dateRange",
      label: "Date Range",
      type: "date-range",
      placeholder: "Select date range",
      fromLabel: "From",
      toLabel: "To",
    },
    {
      key: "amountRange",
      label: "Amount",
      type: "number-range",
      prefix: "$",
      minPlaceholder: "Min",
      maxPlaceholder: "Max",
      formatChip: (value) => {
        const v = value as { min: number | null; max: number | null };
        if (v.min !== null && v.max !== null) {
          return `$${v.min.toLocaleString()} - $${v.max.toLocaleString()}`;
        }
        if (v.min !== null) return `≥ $${v.min.toLocaleString()}`;
        if (v.max !== null) return `≤ $${v.max.toLocaleString()}`;
        return "";
      },
    },
  ],
  presets: [
    {
      id: "overdue",
      label: "Overdue",
      icon: AlertTriangle,
      filters: { status: "overdue" },
    },
    {
      id: "unpaid",
      label: "Unpaid",
      icon: Clock,
      filters: { status: "unpaid" },
    },
    {
      id: "paid",
      label: "Paid",
      icon: FileText,
      filters: { status: "paid" },
    },
    {
      id: "high-value",
      label: "High Value",
      icon: DollarSign,
      filters: { amountRange: { min: 10000, max: null } },
    },
  ],
  labels: {
    status: "Invoice Status",
    customerId: "Customer",
    dateRange: "Invoice Date",
    amountRange: "Invoice Amount",
  },
};

// ============================================================================
// HELPER: Create config with dynamic customer options
// ============================================================================

export function createInvoiceFilterConfig(
  customers: Array<{ id: string; name: string }>
): FilterBarConfig<InvoiceFiltersState> {
  const customerOptions: FilterOption<string>[] = customers.map((c) => ({
    value: c.id,
    label: c.name,
  }));

  return {
    ...INVOICE_FILTER_CONFIG,
    filters: INVOICE_FILTER_CONFIG.filters.map((filter) =>
      filter.key === "customerId" ? { ...filter, options: customerOptions } : filter
    ),
  };
}
