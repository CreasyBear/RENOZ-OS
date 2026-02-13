/**
 * Pipeline Filter Configuration
 *
 * Config-driven filter definition for pipeline/opportunities domain.
 * Used with DomainFilterBar component.
 *
 * @see docs/design-system/FILTER-STANDARDS.md
 */

import {
  Target,
  DollarSign,
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle,
  User,
} from "lucide-react";
import type { FilterBarConfig, FilterOption } from "@/components/shared/filters";
import type { OpportunityStage } from "@/lib/schemas/pipeline";

// ============================================================================
// TYPES
// ============================================================================

export interface PipelineFiltersState extends Record<string, unknown> {
  search: string;
  stages: OpportunityStage[];
  assignedTo: "me" | string | null; // 'me', user ID, or null for all
  valueRange: { min: number | null; max: number | null } | null;
  expectedCloseDate: { from?: Date | null; to?: Date | null } | null;
  includeWonLost: boolean;
}

export const DEFAULT_PIPELINE_FILTERS: PipelineFiltersState = {
  search: "",
  stages: [],
  assignedTo: null,
  valueRange: null,
  expectedCloseDate: null,
  includeWonLost: false,
};

// ============================================================================
// OPTIONS
// ============================================================================

export const PIPELINE_STAGE_OPTIONS: FilterOption<OpportunityStage>[] = [
  { value: "new", label: "New", icon: Target },
  { value: "qualified", label: "Qualified", icon: CheckCircle },
  { value: "proposal", label: "Proposal" },
  { value: "negotiation", label: "Negotiation" },
  { value: "won", label: "Won", icon: CheckCircle },
  { value: "lost", label: "Lost", icon: XCircle },
];

// Active stages only (excluding won/lost)
export const ACTIVE_STAGE_OPTIONS: FilterOption<OpportunityStage>[] = [
  { value: "new", label: "New" },
  { value: "qualified", label: "Qualified" },
  { value: "proposal", label: "Proposal" },
  { value: "negotiation", label: "Negotiation" },
];

// ============================================================================
// FILTER BAR CONFIG
// ============================================================================

export const PIPELINE_FILTER_CONFIG: FilterBarConfig<PipelineFiltersState> = {
  search: {
    placeholder: "Search opportunities by name, customer, or notes...",
    fields: ["name", "customerName", "notes"],
  },
  filters: [
    {
      key: "stages",
      label: "Stage",
      type: "multi-select",
      options: ACTIVE_STAGE_OPTIONS,
      primary: true,
    },
    {
      key: "assignedTo",
      label: "Assigned To",
      type: "select",
      options: [], // Populated dynamically
      primary: true,
      allLabel: "All Assignees",
    },
    {
      key: "valueRange",
      label: "Deal Value",
      type: "number-range",
      prefix: "$",
      minPlaceholder: "Min",
      maxPlaceholder: "Max",
      chipLabel: "Value",
      formatChip: (value) => {
        const v = value as { min: number | null; max: number | null };
        if (v.min !== null && v.max !== null) {
          return `$${(v.min / 1000).toFixed(0)}k-$${(v.max / 1000).toFixed(0)}k`;
        }
        if (v.min !== null) return `≥ $${(v.min / 1000).toFixed(0)}k`;
        if (v.max !== null) return `≤ $${(v.max / 1000).toFixed(0)}k`;
        return "";
      },
    },
    {
      key: "expectedCloseDate",
      label: "Close Date",
      type: "date-range",
      primary: false,
    },
    {
      key: "includeWonLost",
      label: "Include Won/Lost",
      type: "toggle",
    },
  ],
  presets: [
    {
      id: "my-deals",
      label: "My Deals",
      icon: User,
      filters: { assignedTo: "me" },
    },
    {
      id: "hot-leads",
      label: "Hot Leads",
      icon: TrendingUp,
      filters: { stages: ["negotiation"] },
    },
    {
      id: "high-value",
      label: "High Value",
      icon: DollarSign,
      filters: { valueRange: { min: 50000, max: null } },
    },
    {
      id: "new-opportunities",
      label: "New",
      icon: Target,
      filters: { stages: ["new"] },
    },
    {
      id: "closing-soon",
      label: "Proposals",
      icon: Clock,
      filters: { stages: ["proposal", "negotiation"] },
    },
  ],
  labels: {
    stages: "Pipeline Stage",
    assignedTo: "Owner",
    valueRange: "Deal Value",
    includeWonLost: "Show Closed",
  },
};

// ============================================================================
// HELPER: Create config with dynamic assignee options
// ============================================================================

export function createPipelineFilterConfig(
  assignees: Array<{ id: string; name: string }>
): FilterBarConfig<PipelineFiltersState> {
  const assigneeOptions: FilterOption<string>[] = [
    { value: "me", label: "Assigned to Me" },
    ...assignees.map((a) => ({
      value: a.id,
      label: a.name,
    })),
  ];

  return {
    ...PIPELINE_FILTER_CONFIG,
    filters: PIPELINE_FILTER_CONFIG.filters.map((filter) =>
      filter.key === "assignedTo" ? { ...filter, options: assigneeOptions } : filter
    ),
  };
}
