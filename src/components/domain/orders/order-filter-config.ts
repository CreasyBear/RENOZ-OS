/**
 * Order Filter Configuration
 *
 * Config-driven filter definition for orders domain.
 * Used with DomainFilterBar component.
 *
 * @see docs/design-system/FILTER-STANDARDS.md
 */

import { Clock, AlertTriangle, DollarSign, Package, Truck, Zap } from "lucide-react";
import type { FilterBarConfig, FilterOption } from "@/components/shared/filters";
import type { OrderStatus, PaymentStatus } from "@/lib/schemas/orders";

// ============================================================================
// FILTER STATE TYPES
// ============================================================================

export interface OrderFiltersState extends Record<string, unknown> {
  search: string;
  status: OrderStatus | null;
  paymentStatus: PaymentStatus | null;
  dateRange: { from: Date | null; to: Date | null } | null;
  totalRange: { min: number | null; max: number | null } | null;
  customerId: string | null;
}

export const DEFAULT_ORDER_FILTERS: OrderFiltersState = {
  search: "",
  status: null,
  paymentStatus: null,
  dateRange: null,
  totalRange: null,
  customerId: null,
};

// ============================================================================
// OPTIONS
// ============================================================================

export const ORDER_STATUS_OPTIONS: FilterOption<OrderStatus>[] = [
  { value: "draft", label: "Draft" },
  { value: "confirmed", label: "Confirmed" },
  { value: "picking", label: "Picking" },
  { value: "picked", label: "Picked" },
  { value: "shipped", label: "Shipped" },
  { value: "delivered", label: "Delivered" },
  { value: "cancelled", label: "Cancelled" },
];

export const PAYMENT_STATUS_OPTIONS: FilterOption<PaymentStatus>[] = [
  { value: "pending", label: "Pending" },
  { value: "partial", label: "Partial" },
  { value: "paid", label: "Paid" },
  { value: "overdue", label: "Overdue" },
  { value: "refunded", label: "Refunded" },
];

// ============================================================================
// FILTER BAR CONFIG
// ============================================================================

export const ORDER_FILTER_CONFIG: FilterBarConfig<OrderFiltersState> = {
  search: {
    placeholder: "Search orders by number, customer, or notes...",
    fields: ["orderNumber", "customerName", "notes"],
  },
  filters: [
    {
      key: "status",
      label: "Status",
      type: "select",
      options: ORDER_STATUS_OPTIONS,
      primary: true,
      allLabel: "All Statuses",
    },
    {
      key: "paymentStatus",
      label: "Payment",
      type: "select",
      options: PAYMENT_STATUS_OPTIONS,
      primary: true,
      allLabel: "All Payments",
    },
    {
      key: "dateRange",
      label: "Date",
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
      id: "urgent",
      label: "Urgent Orders",
      icon: Zap,
      filters: { paymentStatus: "overdue" },
    },
    {
      id: "pending-payment",
      label: "Pending Payment",
      icon: Clock,
      filters: { paymentStatus: "pending" },
    },
    {
      id: "overdue",
      label: "Overdue",
      icon: AlertTriangle,
      filters: { paymentStatus: "overdue" },
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
    {
      id: "high-value",
      label: "High Value",
      icon: DollarSign,
      filters: { totalRange: { min: 10000, max: null } },
    },
  ],
  labels: {
    status: "Order Status",
    paymentStatus: "Payment Status",
    dateRange: "Order Date",
    totalRange: "Order Total",
  },
};
