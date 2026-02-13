/**
 * Issue Filter Configuration
 *
 * Config-driven filter definition for support issues domain.
 * Used with DomainFilterBar component.
 *
 * @see docs/design-system/FILTER-STANDARDS.md
 */

import {
  User,
  Users,
  AlertTriangle,
  Clock,
  Inbox,
  CheckCircle,
  XCircle,
} from "lucide-react";
import type { FilterBarConfig, FilterOption } from "@/components/shared/filters";
import type { IssueStatus, IssuePriority, IssueFiltersState } from "@/lib/schemas/support/issues";

export type { IssueStatus, IssuePriority, IssueFiltersState };

export const DEFAULT_ISSUE_FILTERS: IssueFiltersState = {
  search: "",
  status: [],
  priority: [],
  assignedTo: null,
  customerId: null,
};

// ============================================================================
// OPTIONS
// ============================================================================

export const ISSUE_STATUS_OPTIONS: FilterOption<IssueStatus>[] = [
  { value: "open", label: "Open", icon: Inbox },
  { value: "in_progress", label: "In Progress", icon: Clock },
  { value: "pending", label: "Pending", icon: Clock },
  { value: "on_hold", label: "On Hold" },
  { value: "escalated", label: "Escalated", icon: AlertTriangle },
  { value: "resolved", label: "Resolved", icon: CheckCircle },
  { value: "closed", label: "Closed", icon: XCircle },
];

export const ISSUE_PRIORITY_OPTIONS: FilterOption<IssuePriority>[] = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High", icon: AlertTriangle },
  { value: "critical", label: "Critical", icon: AlertTriangle },
];

// ============================================================================
// FILTER BAR CONFIG
// ============================================================================

export const ISSUE_FILTER_CONFIG: FilterBarConfig<IssueFiltersState> = {
  search: {
    placeholder: "Search issues by title, customer, or ticket number...",
    fields: ["title", "customerName", "ticketNumber"],
  },
  filters: [
    {
      key: "status",
      label: "Status",
      type: "multi-select",
      options: ISSUE_STATUS_OPTIONS,
      primary: true,
    },
    {
      key: "priority",
      label: "Priority",
      type: "multi-select",
      options: ISSUE_PRIORITY_OPTIONS,
      primary: true,
    },
    {
      key: "assignedTo",
      label: "Assigned To",
      type: "select",
      options: [], // Populated dynamically
      allLabel: "All Assignees",
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
      id: "my-issues",
      label: "My Issues",
      icon: User,
      filters: { assignedTo: "me" },
    },
    {
      id: "unassigned",
      label: "Unassigned",
      icon: Users,
      filters: { assignedTo: "unassigned" },
    },
    {
      id: "critical",
      label: "Critical",
      icon: AlertTriangle,
      filters: { priority: ["critical", "high"] },
    },
    {
      id: "open",
      label: "Open",
      icon: Inbox,
      filters: { status: ["open", "in_progress"] },
    },
    {
      id: "escalated",
      label: "Escalated",
      icon: AlertTriangle,
      filters: { status: ["escalated"] },
    },
  ],
  labels: {
    status: "Issue Status",
    priority: "Priority",
    assignedTo: "Owner",
    customerId: "Customer",
  },
};

// ============================================================================
// HELPER: Create config with dynamic options
// ============================================================================

export function createIssueFilterConfig(
  assignees: Array<{ id: string; name: string }>,
  customers: Array<{ id: string; name: string }>
): FilterBarConfig<IssueFiltersState> {
  const assigneeOptions: FilterOption<string>[] = [
    { value: "me", label: "Assigned to Me" },
    { value: "unassigned", label: "Unassigned" },
    ...assignees.map((a) => ({
      value: a.id,
      label: a.name,
    })),
  ];

  const customerOptions: FilterOption<string>[] = customers.map((c) => ({
    value: c.id,
    label: c.name,
  }));

  return {
    ...ISSUE_FILTER_CONFIG,
    filters: ISSUE_FILTER_CONFIG.filters.map((filter) => {
      if (filter.key === "assignedTo") {
        return { ...filter, options: assigneeOptions };
      }
      if (filter.key === "customerId") {
        return { ...filter, options: customerOptions };
      }
      return filter;
    }),
  };
}
