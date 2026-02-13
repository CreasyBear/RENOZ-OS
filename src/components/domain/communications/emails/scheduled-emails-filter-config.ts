/**
 * Scheduled Emails Filter Configuration
 *
 * Config-driven filter definition for scheduled emails domain.
 * Used with DomainFilterBar component.
 *
 * @see docs/design-system/FILTER-STANDARDS.md
 */

import { Clock, Mail, XCircle, CheckCircle2 } from "lucide-react";
import type { FilterBarConfig, FilterOption } from "@/components/shared/filters";
import type { ScheduledEmailStatus } from "@/lib/schemas/communications";

// ============================================================================
// FILTER STATE TYPES
// ============================================================================

export interface ScheduledEmailsFiltersState extends Record<string, unknown> {
  search: string;
  status: "all" | ScheduledEmailStatus;
  customerId?: string;
}

export const DEFAULT_SCHEDULED_EMAILS_FILTERS: ScheduledEmailsFiltersState = {
  search: "",
  status: "all",
  customerId: undefined,
};

// ============================================================================
// OPTIONS
// ============================================================================

export const SCHEDULED_EMAIL_STATUS_OPTIONS: FilterOption<ScheduledEmailStatus | "all">[] = [
  { value: "all", label: "All Statuses", icon: Mail },
  { value: "pending", label: "Pending", icon: Clock },
  { value: "sent", label: "Sent", icon: CheckCircle2 },
  { value: "cancelled", label: "Cancelled", icon: XCircle },
];

// ============================================================================
// FILTER BAR CONFIG
// ============================================================================

export const SCHEDULED_EMAILS_FILTER_CONFIG: FilterBarConfig<ScheduledEmailsFiltersState> = {
  search: {
    placeholder: "Search by recipient or subject...",
    fields: ["recipientEmail", "recipientName", "subject"],
  },
  filters: [
    {
      key: "status",
      label: "Status",
      type: "select",
      options: SCHEDULED_EMAIL_STATUS_OPTIONS,
      primary: true,
      allLabel: "All Statuses",
    },
    // Note: customerId filter is available via URL params but not exposed in UI
    // as customer selection is typically done from customer detail pages.
    // To enable: populate options dynamically from useCustomers hook.
    // {
    //   key: "customerId",
    //   label: "Customer",
    //   type: "select",
    //   options: [],
    //   allLabel: "All Customers",
    // },
  ],
  presets: [
    {
      id: "pending",
      label: "Pending",
      icon: Clock,
      filters: { status: "pending" },
    },
    {
      id: "sent",
      label: "Sent",
      icon: CheckCircle2,
      filters: { status: "sent" },
    },
    {
      id: "cancelled",
      label: "Cancelled",
      icon: XCircle,
      filters: { status: "cancelled" },
    },
  ],
  labels: {
    status: "Status",
  },
};
