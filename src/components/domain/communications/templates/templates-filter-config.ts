/**
 * Email Templates Filter Configuration
 *
 * Filter configuration for templates list using DomainFilterBar.
 * Follows FILTER-STANDARDS.md patterns.
 *
 * @see FILTER-STANDARDS.md
 */

import type { FilterBarConfig } from "@/components/shared/filters/types";
import type { TemplateCategory } from "@/lib/schemas/communications";

// ============================================================================
// FILTER STATE
// ============================================================================

export interface TemplatesFiltersState extends Record<string, unknown> {
  search: string;
  category: TemplateCategory | "all";
  // Note: status filter not yet implemented server-side
  // status?: "all" | "active" | "inactive";
}

export const DEFAULT_TEMPLATES_FILTERS: TemplatesFiltersState = {
  search: "",
  category: "all",
  // status: "all", // Not yet implemented
};

// ============================================================================
// FILTER OPTIONS
// ============================================================================

export const TEMPLATE_CATEGORY_OPTIONS: Array<{
  value: TemplateCategory | "all";
  label: string;
}> = [
  { value: "all", label: "All Categories" },
  { value: "quotes", label: "Quotes" },
  { value: "orders", label: "Orders" },
  { value: "installations", label: "Installations" },
  { value: "warranty", label: "Warranty" },
  { value: "support", label: "Support" },
  { value: "marketing", label: "Marketing" },
  { value: "follow_up", label: "Follow-up" },
  { value: "custom", label: "Custom" },
];

export const TEMPLATE_STATUS_OPTIONS: Array<{
  value: "all" | "active" | "inactive";
  label: string;
}> = [
  { value: "all", label: "All Statuses" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];

// ============================================================================
// FILTER BAR CONFIG
// ============================================================================

export const TEMPLATES_FILTER_CONFIG: FilterBarConfig<TemplatesFiltersState> = {
  search: {
    placeholder: "Search templates by name, subject, or description...",
    fields: ["name", "subject", "description"],
  },
  filters: [
    {
      key: "category",
      label: "Category",
      type: "select",
      options: TEMPLATE_CATEGORY_OPTIONS,
      primary: true,
      allLabel: "All Categories",
    },
    // Note: Status filter is configured but not yet implemented server-side
    // The useTemplates hook supports activeOnly filtering, but status filtering
    // would require additional server-side support
    // {
    //   key: "status",
    //   label: "Status",
    //   type: "select",
    //   options: TEMPLATE_STATUS_OPTIONS,
    //   primary: true,
    //   allLabel: "All Statuses",
    // },
  ],
  presets: [
    {
      id: "quotes",
      label: "Quote Templates",
      filters: { category: "quotes" },
    },
    {
      id: "orders",
      label: "Order Templates",
      filters: { category: "orders" },
    },
    {
      id: "support",
      label: "Support Templates",
      filters: { category: "support" },
    },
  ],
  labels: {
    category: "Category",
  },
};
