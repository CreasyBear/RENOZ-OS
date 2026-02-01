/**
 * Fulfillment Filter Configuration
 *
 * Config-driven filter definition for fulfillment domain.
 * Used with DomainFilterBar component.
 *
 * @see docs/design-system/FILTER-STANDARDS.md
 */

import {
  Clock,
  AlertTriangle,
  Zap,
  Package,
  Truck,
  CheckCircle,
  CalendarClock,
} from "lucide-react";
import type { FilterBarConfig, FilterOption } from "@/components/shared/filters";

// ============================================================================
// TYPES
// ============================================================================

export type FulfillmentPriority = "normal" | "high" | "urgent";
export type FulfillmentStatus = "confirmed" | "picking" | "picked" | "shipped";
export type FulfillmentDateRange = "today" | "this_week" | "overdue" | "upcoming";

export interface FulfillmentFiltersState extends Record<string, unknown> {
  search: string;
  priority: FulfillmentPriority | null;
  status: FulfillmentStatus | null;
  customerId: string | null;
  dateRange: FulfillmentDateRange | null;
}

export const DEFAULT_FULFILLMENT_FILTERS: FulfillmentFiltersState = {
  search: "",
  priority: null,
  status: null,
  customerId: null,
  dateRange: null,
};

// ============================================================================
// OPTIONS
// ============================================================================

export const FULFILLMENT_PRIORITY_OPTIONS: FilterOption<FulfillmentPriority>[] = [
  { value: "normal", label: "Normal" },
  { value: "high", label: "High", icon: AlertTriangle },
  { value: "urgent", label: "Urgent", icon: Zap },
];

export const FULFILLMENT_STATUS_OPTIONS: FilterOption<FulfillmentStatus>[] = [
  { value: "confirmed", label: "Confirmed", icon: CheckCircle },
  { value: "picking", label: "Picking", icon: Package },
  { value: "picked", label: "Picked", icon: Package },
  { value: "shipped", label: "Shipped", icon: Truck },
];

export const FULFILLMENT_DATE_RANGE_OPTIONS: FilterOption<FulfillmentDateRange>[] = [
  { value: "today", label: "Due Today", icon: Clock },
  { value: "this_week", label: "Due This Week", icon: CalendarClock },
  { value: "overdue", label: "Overdue", icon: AlertTriangle },
  { value: "upcoming", label: "Upcoming" },
];

// ============================================================================
// FILTER BAR CONFIG
// ============================================================================

export const FULFILLMENT_FILTER_CONFIG: FilterBarConfig<FulfillmentFiltersState> = {
  search: {
    placeholder: "Search orders, customers...",
    fields: ["orderNumber", "customerName"],
  },
  filters: [
    {
      key: "status",
      label: "Status",
      type: "select",
      options: FULFILLMENT_STATUS_OPTIONS,
      primary: true,
      allLabel: "All Statuses",
    },
    {
      key: "priority",
      label: "Priority",
      type: "select",
      options: FULFILLMENT_PRIORITY_OPTIONS,
      primary: true,
      allLabel: "All Priorities",
    },
    {
      key: "dateRange",
      label: "Due Date",
      type: "select",
      options: FULFILLMENT_DATE_RANGE_OPTIONS,
      allLabel: "All Dates",
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
      id: "urgent",
      label: "Urgent",
      icon: Zap,
      filters: { priority: "urgent" },
    },
    {
      id: "due-today",
      label: "Due Today",
      icon: Clock,
      filters: { dateRange: "today" },
    },
    {
      id: "overdue",
      label: "Overdue",
      icon: AlertTriangle,
      filters: { dateRange: "overdue" },
    },
    {
      id: "ready-to-ship",
      label: "Ready to Ship",
      icon: Package,
      filters: { status: "picked" },
    },
    {
      id: "in-transit",
      label: "In Transit",
      icon: Truck,
      filters: { status: "shipped" },
    },
  ],
  labels: {
    priority: "Priority",
    status: "Fulfillment Status",
    customerId: "Customer",
    dateRange: "Due Date",
  },
};

// ============================================================================
// HELPER: Create config with dynamic customer options
// ============================================================================

export function createFulfillmentFilterConfig(
  customers: Array<{ id: string; name: string }>
): FilterBarConfig<FulfillmentFiltersState> {
  const customerOptions: FilterOption<string>[] = customers.map((c) => ({
    value: c.id,
    label: c.name,
  }));

  return {
    ...FULFILLMENT_FILTER_CONFIG,
    filters: FULFILLMENT_FILTER_CONFIG.filters.map((filter) =>
      filter.key === "customerId" ? { ...filter, options: customerOptions } : filter
    ),
  };
}
