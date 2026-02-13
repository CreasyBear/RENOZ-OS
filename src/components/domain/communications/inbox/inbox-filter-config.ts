/**
 * Inbox Filter Configuration
 *
 * Config-driven filter definition for unified inbox domain.
 * Used with DomainFilterBar component and filter popover.
 *
 * @see docs/design-system/FILTER-STANDARDS.md
 */

import { Mail, MailOpen, Send, Clock, XCircle, AlertCircle } from "lucide-react";
import type { FilterBarConfig, FilterOption } from "@/components/shared/filters";
import type { InboxTab } from "@/lib/schemas/communications/inbox";

// ============================================================================
// FILTER STATE TYPES
// ============================================================================

export interface InboxFiltersState extends Record<string, unknown> {
  search: string;
  tab: InboxTab;
  status?: string;
  type?: string[];
  customerId?: string;
  campaignId?: string;
  dateFrom: Date | null;
  dateTo: Date | null;
}

export const DEFAULT_INBOX_FILTERS: InboxFiltersState = {
  search: "",
  tab: "all",
  status: undefined,
  type: undefined,
  customerId: undefined,
  campaignId: undefined,
  dateFrom: null,
  dateTo: null,
};

// ============================================================================
// TAB OPTIONS
// ============================================================================

export const INBOX_TAB_OPTIONS: FilterOption<InboxTab>[] = [
  { value: "all", label: "All", icon: Mail },
  { value: "unread", label: "Unread", icon: MailOpen },
  { value: "sent", label: "Sent", icon: Send },
  { value: "scheduled", label: "Scheduled", icon: Clock },
  { value: "failed", label: "Failed", icon: XCircle },
];

// ============================================================================
// STATUS OPTIONS
// ============================================================================

export const INBOX_STATUS_OPTIONS: FilterOption<string>[] = [
  { value: "sent", label: "Sent", icon: Send },
  { value: "delivered", label: "Delivered", icon: Mail },
  { value: "opened", label: "Opened", icon: MailOpen },
  { value: "clicked", label: "Clicked", icon: MailOpen },
  { value: "pending", label: "Pending", icon: Clock },
  { value: "bounced", label: "Bounced", icon: XCircle },
  { value: "failed", label: "Failed", icon: AlertCircle },
];

// ============================================================================
// TYPE OPTIONS
// ============================================================================

export const INBOX_TYPE_OPTIONS: FilterOption<string>[] = [
  { value: "history", label: "Email History", icon: Mail },
  { value: "scheduled", label: "Scheduled", icon: Clock },
  { value: "campaign", label: "Campaign", icon: Send },
];

// ============================================================================
// FILTER BAR CONFIG
// ============================================================================

export const INBOX_FILTER_CONFIG: FilterBarConfig<InboxFiltersState> = {
  search: {
    placeholder: "Search emails...",
    fields: ["subject", "from", "to"],
  },
  filters: [
    {
      key: "status",
      label: "Status",
      type: "select",
      options: INBOX_STATUS_OPTIONS,
      primary: true,
      allLabel: "All Statuses",
    },
    {
      key: "type",
      label: "Type",
      type: "multi-select",
      options: INBOX_TYPE_OPTIONS,
      primary: false,
      allLabel: "All Types",
    },
  ],
  presets: [
    {
      id: "unread",
      label: "Unread",
      icon: MailOpen,
      filters: { tab: "unread" },
    },
    {
      id: "sent",
      label: "Sent",
      icon: Send,
      filters: { tab: "sent" },
    },
    {
      id: "scheduled",
      label: "Scheduled",
      icon: Clock,
      filters: { tab: "scheduled" },
    },
    {
      id: "failed",
      label: "Failed",
      icon: XCircle,
      filters: { tab: "failed" },
    },
  ],
  labels: {
    status: "Status",
    type: "Type",
  },
};
