/**
 * Campaign Filter Configuration
 *
 * Config-driven filter definition for campaigns domain.
 * Used with DomainFilterBar component.
 *
 * @see docs/design-system/FILTER-STANDARDS.md
 */

import {
  Mail,
  Calendar,
  Send,
  CheckCircle2,
  Pause,
  XCircle,
  AlertTriangle,
  Clock,
} from "lucide-react";
import type { FilterBarConfig, FilterOption } from "@/components/shared/filters";

// ============================================================================
// TYPES
// ============================================================================

export type CampaignStatusFilter = "draft" | "scheduled" | "sending" | "sent" | "paused" | "cancelled" | "failed";

export interface CampaignFiltersState extends Record<string, unknown> {
  search: string;
  status: CampaignStatusFilter[];
  templateType: string[];
  dateFrom: Date | null;
  dateTo: Date | null;
}

export const DEFAULT_CAMPAIGN_FILTERS: CampaignFiltersState = {
  search: "",
  status: [],
  templateType: [],
  dateFrom: null,
  dateTo: null,
};

// ============================================================================
// OPTIONS
// ============================================================================

export const CAMPAIGN_STATUS_OPTIONS: FilterOption<CampaignStatusFilter>[] = [
  { value: "draft", label: "Draft", icon: Mail },
  { value: "scheduled", label: "Scheduled", icon: Calendar },
  { value: "sending", label: "Sending", icon: Send },
  { value: "sent", label: "Sent", icon: CheckCircle2 },
  { value: "paused", label: "Paused", icon: Pause },
  { value: "cancelled", label: "Cancelled", icon: XCircle },
  { value: "failed", label: "Failed", icon: AlertTriangle },
];

export const CAMPAIGN_TEMPLATE_TYPE_OPTIONS: FilterOption<string>[] = [
  { value: "welcome", label: "Welcome" },
  { value: "follow_up", label: "Follow Up" },
  { value: "quote", label: "Quote" },
  { value: "order_confirmation", label: "Order Confirmation" },
  { value: "shipping_notification", label: "Shipping Notification" },
  { value: "reminder", label: "Reminder" },
  { value: "newsletter", label: "Newsletter" },
  { value: "promotion", label: "Promotion" },
  { value: "announcement", label: "Announcement" },
  { value: "custom", label: "Custom" },
];

// ============================================================================
// FILTER BAR CONFIG
// ============================================================================

export const CAMPAIGN_FILTER_CONFIG: FilterBarConfig<CampaignFiltersState> = {
  search: {
    placeholder: "Search campaigns by name or description...",
    fields: ["name", "description"],
  },
  filters: [
    {
      key: "status",
      label: "Status",
      type: "multi-select",
      options: CAMPAIGN_STATUS_OPTIONS,
      primary: true,
    },
    {
      key: "templateType",
      label: "Template Type",
      type: "multi-select",
      options: CAMPAIGN_TEMPLATE_TYPE_OPTIONS,
      primary: true,
    },
    {
      key: "dateFrom",
      label: "From Date",
      type: "date",
      chipLabel: "From",
      formatChip: (value) => {
        if (!value) return "";
        return new Date(value as Date).toLocaleDateString();
      },
    },
    {
      key: "dateTo",
      label: "To Date",
      type: "date",
      chipLabel: "To",
      formatChip: (value) => {
        if (!value) return "";
        return new Date(value as Date).toLocaleDateString();
      },
    },
  ],
  presets: [
    {
      id: "active",
      label: "Active",
      icon: Send,
      filters: { status: ["sending", "scheduled"] },
    },
    {
      id: "draft",
      label: "Draft",
      icon: Mail,
      filters: { status: ["draft"] },
    },
    {
      id: "sent",
      label: "Sent",
      icon: CheckCircle2,
      filters: { status: ["sent"] },
    },
    {
      id: "recent",
      label: "Recent",
      icon: Clock,
      filters: {
        dateFrom: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
        dateTo: new Date(),
      },
    },
  ],
  labels: {
    status: "Status",
    templateType: "Template Type",
    dateFrom: "From Date",
    dateTo: "To Date",
  },
};
