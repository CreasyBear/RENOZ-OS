/**
 * PipelineKanbanContainer
 *
 * Container component for the pipeline kanban board.
 * Handles data fetching, mutations, and business logic.
 *
 * SCALING STRATEGY:
 * - Default filters limit results to manageable sets (<100)
 * - Shows scope indicator when filters are active
 * - "View All" requires explicit user action with warning
 *
 * @source opportunities from useOpportunitiesKanban hook
 * @source metrics from usePipelineMetrics hook
 * @source stageChangeMutation from useUpdateOpportunityStage hook
 *
 * @see STANDARDS.md - Container/Presenter Pattern
 */

import { useCallback, useMemo, useState } from "react";
import { useNavigate, useRouter } from "@tanstack/react-router";
import {
  useOpportunitiesKanban,
  usePipelineMetrics,
  useUpdateOpportunityStage,
  type OpportunityKanbanFilters,
} from "@/hooks/pipeline";
import { toastSuccess, toastError } from "@/hooks";
import { PipelineBoard } from "./pipeline-board";
import { PipelineListView } from "./pipeline-list-view";
import { PipelineMetrics } from "./pipeline-metrics";
import { PipelineFilters, type PipelineFiltersState } from "./pipeline-filters";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  AlertTriangle,
  User,
  Calendar,
  DollarSign,
  Eye,
  RotateCcw,
  LayoutGrid,
  List,
} from "lucide-react";
import type { OpportunityStage } from "@/lib/schemas/pipeline";

// ============================================================================
// DEFAULT FILTERS - Keep result set manageable
// ============================================================================

/**
 * Default filters for the pipeline kanban view.
 * These limits ensure the board remains performant and usable.
 */
export const DEFAULT_PIPELINE_FILTERS: PipelineFiltersState = {
  search: "",
  stages: [], // All active stages (new, qualified, proposal, negotiation)
  assignedTo: "me", // Default to current user's opportunities
  minValue: null,
  maxValue: null,
  includeWonLost: false, // Exclude closed deals by default
};

/**
 * Quick filter presets for common views
 */
const QUICK_FILTERS = [
  {
    id: "my-pipeline" as const,
    label: "My Pipeline",
    icon: User,
    filters: { assignedTo: "me", includeWonLost: false },
  },
  {
    id: "closing-soon" as const,
    label: "Closing This Month",
    icon: Calendar,
    filters: { assignedTo: null, includeWonLost: false },
    // TODO: Add date range filter when supported
  },
  {
    id: "high-value" as const,
    label: "High Value (>$10k)",
    icon: DollarSign,
    filters: { assignedTo: null, minValue: 1000000, includeWonLost: false },
  },
  {
    id: "all-active" as const,
    label: "All Active",
    icon: Eye,
    filters: { assignedTo: null, includeWonLost: false },
  },
] as const;

// ============================================================================
// TYPES
// ============================================================================

export type PipelineViewMode = "kanban" | "list";

export interface PipelineKanbanContainerProps {
  /** Initial filters for the kanban board */
  initialFilters?: Partial<PipelineFiltersState>;
  /** Initial view mode */
  initialViewMode?: PipelineViewMode;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Check if current user ID matches filters (simplified - should use auth context)
 */
function isMyPipeline(filters: PipelineFiltersState): boolean {
  return filters.assignedTo === "me";
}

/**
 * Check if filters are at default (manageable) scope
 */
function isDefaultScope(filters: PipelineFiltersState): boolean {
  return (
    filters.assignedTo === DEFAULT_PIPELINE_FILTERS.assignedTo &&
    !filters.includeWonLost &&
    !filters.search &&
    filters.stages.length === 0 &&
    filters.minValue === null &&
    filters.maxValue === null
  );
}

/**
 * Check if filters are broad (may cause performance issues)
 */
function isBroadScope(filters: PipelineFiltersState): boolean {
  return (
    filters.assignedTo === null &&
    !filters.includeWonLost &&
    !filters.search &&
    filters.stages.length === 0
  );
}

// ============================================================================
// SCOPE INDICATOR COMPONENT
// ============================================================================

interface ScopeIndicatorProps {
  filters: PipelineFiltersState;
  totalCount: number;
  onReset: () => void;
  onViewAll: () => void;
}

function ScopeIndicator({
  filters,
  totalCount,
  onReset,
  onViewAll,
}: ScopeIndicatorProps) {
  const isDefault = isDefaultScope(filters);
  const isBroad = isBroadScope(filters);
  const isFiltered = !isDefault;

  // Show nothing if at default scope and count is reasonable
  if (isDefault && totalCount < 50) {
    return null;
  }

  // Show warning for broad scope
  if (isBroad && totalCount >= 50) {
    return (
      <Alert variant="default" className="bg-amber-50 border-amber-200">
        <AlertTriangle className="h-4 w-4 text-amber-600" />
        <AlertTitle className="text-amber-800">
          Large Dataset ({totalCount} opportunities)
        </AlertTitle>
        <AlertDescription className="text-amber-700">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 mt-1">
            <span>
              Showing all opportunities may affect performance. Consider
              filtering by assignee or using search.
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={onReset}
                className="shrink-0"
              >
                <User className="h-3 w-3 mr-1" />
                Show Mine
              </Button>
            </div>
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  // Show info for filtered view
  if (isFiltered) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Badge variant="secondary" className="font-normal">
          {totalCount} shown
        </Badge>
        <span>•</span>
        <span>Filtered view</span>
        <Button variant="link" size="sm" className="h-auto p-0" onClick={onReset}>
          Reset
        </Button>
        {!filters.includeWonLost && (
          <>
            <span>•</span>
            <Button
              variant="link"
              size="sm"
              className="h-auto p-0"
              onClick={onViewAll}
            >
              Include closed
            </Button>
          </>
        )}
      </div>
    );
  }

  return null;
}

// ============================================================================
// QUICK FILTER CHIPS COMPONENT
// ============================================================================

interface QuickFilterChipsProps {
  currentFilters: PipelineFiltersState;
  onChange: (filters: PipelineFiltersState) => void;
}

function QuickFilterChips({ currentFilters, onChange }: QuickFilterChipsProps) {
  const getIsActive = (filterId: (typeof QUICK_FILTERS)[number]["id"]) => {
    switch (filterId) {
      case "my-pipeline":
        return isMyPipeline(currentFilters);
      case "closing-soon":
        // TODO: Add date range check when implemented
        return false;
      case "high-value":
        return (
          currentFilters.minValue === 1000000 &&
          currentFilters.assignedTo === null
        );
      case "all-active":
        return (
          currentFilters.assignedTo === null &&
          !currentFilters.includeWonLost &&
          currentFilters.minValue === null
        );
      default:
        return false;
    }
  };

  const handleClick = (filter: (typeof QUICK_FILTERS)[number]) => {
    onChange({
      ...DEFAULT_PIPELINE_FILTERS,
      ...filter.filters,
    });
  };

  return (
    <div className="flex flex-wrap gap-2">
      {QUICK_FILTERS.map((filter) => {
        const Icon = filter.icon;
        const isActive = getIsActive(filter.id);
        return (
          <Button
            key={filter.id}
            variant={isActive ? "default" : "outline"}
            size="sm"
            className="h-8"
            onClick={() => handleClick(filter)}
          >
            <Icon className="h-3.5 w-3.5 mr-1.5" />
            {filter.label}
          </Button>
        );
      })}
      {!isDefaultScope(currentFilters) && (
        <Button
          variant="ghost"
          size="sm"
          className="h-8 text-muted-foreground"
          onClick={() => onChange(DEFAULT_PIPELINE_FILTERS)}
        >
          <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
          Reset
        </Button>
      )}
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function PipelineKanbanContainer({
  initialFilters,
  initialViewMode = "kanban",
}: PipelineKanbanContainerProps = {}) {
  const navigate = useNavigate();
  const router = useRouter();

  // Filter state with defaults
  const [filters, setFilters] = useState<PipelineFiltersState>({
    ...DEFAULT_PIPELINE_FILTERS,
    ...initialFilters,
  });

  // View mode state (kanban vs list)
  const [viewMode, setViewMode] = useState<PipelineViewMode>(initialViewMode);

  // Convert filter state to hook options
  const kanbanFilters = useMemo<OpportunityKanbanFilters>(
    () => ({
      search: filters.search || undefined,
      stages: filters.stages.length > 0 ? filters.stages : undefined,
      assignedTo: filters.assignedTo === "me" ? undefined : filters.assignedTo || undefined,
      minValue: filters.minValue ?? undefined,
      maxValue: filters.maxValue ?? undefined,
      includeWonLost: filters.includeWonLost,
    }),
    [filters]
  );

  // Fetch opportunities using centralized hook
  const {
    data: opportunitiesData,
    isLoading: isLoadingOpportunities,
    error: opportunitiesError,
  } = useOpportunitiesKanban(kanbanFilters);

  // Fetch metrics using centralized hook
  const {
    data: metricsData,
    isLoading: isLoadingMetrics,
    error: metricsError,
  } = usePipelineMetrics();

  // Stage change using centralized hook
  const stageChangeMutation = useUpdateOpportunityStage();

  // Handle stage change from board
  const handleStageChange = useCallback(
    async (
      opportunityId: string,
      newStage: OpportunityStage,
      reason?: {
        winLossReasonId?: string;
        lostNotes?: string;
        competitorName?: string;
      }
    ) => {
      try {
        await stageChangeMutation.mutateAsync({
          opportunityId,
          stage: newStage,
          reason,
        });
        toastSuccess("Opportunity stage updated successfully.");
      } catch {
        toastError("Failed to update opportunity stage. Please try again.");
        throw new Error("Stage change failed");
      }
    },
    [stageChangeMutation]
  );

  // Handle add opportunity
  const handleAddOpportunity = useCallback(
    (stage: OpportunityStage) => {
      navigate({
        to: "/pipeline/new",
        search: { stage } as any,
      });
    },
    [navigate]
  );

  // Handle edit opportunity
  const handleEditOpportunity = useCallback(
    (id: string) => {
      router.navigate({
        to: "/pipeline/$opportunityId",
        params: { opportunityId: id },
      });
    },
    [router]
  );

  // Handle delete opportunity (for list view)
  const handleDeleteOpportunity = useCallback((id: string) => {
    // TODO: Implement delete with confirmation
    console.log("Delete opportunity:", id);
  }, []);

  const opportunities = opportunitiesData?.items ?? [];
  const totalCount = opportunitiesData?.pagination?.totalItems ?? opportunities.length;
  const isLoading = isLoadingOpportunities || stageChangeMutation.isPending;
  const error = opportunitiesError || metricsError;

  // Handle error state
  if (error && !isLoading) {
    return (
      <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-8 text-center">
        <h3 className="text-lg font-semibold text-destructive mb-2">
          Failed to load pipeline
        </h3>
        <p className="text-sm text-muted-foreground mb-4">
          {error.message || "An unexpected error occurred"}
        </p>
        <button
          onClick={() => window.location.reload()}
          className="text-sm text-primary hover:underline"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Quick Filter Chips */}
      <QuickFilterChips currentFilters={filters} onChange={setFilters} />

      {/* Scope Indicator */}
      <ScopeIndicator
        filters={filters}
        totalCount={totalCount}
        onReset={() => setFilters(DEFAULT_PIPELINE_FILTERS)}
        onViewAll={() => setFilters({ ...filters, includeWonLost: true })}
      />

      {/* Metrics */}
      <PipelineMetrics metrics={metricsData ?? null} isLoading={isLoadingMetrics} />

      {/* Filters */}
      <PipelineFilters filters={filters} onChange={setFilters} />

      {/* View Toggle */}
      <div className="flex items-center justify-between">
        <ToggleGroup
          type="single"
          value={viewMode}
          onValueChange={(value) => value && setViewMode(value as PipelineViewMode)}
        >
          <ToggleGroupItem value="kanban" aria-label="Kanban view">
            <LayoutGrid className="h-4 w-4 mr-1.5" />
            Board
          </ToggleGroupItem>
          <ToggleGroupItem value="list" aria-label="List view">
            <List className="h-4 w-4 mr-1.5" />
            List
          </ToggleGroupItem>
        </ToggleGroup>
        <p className="text-sm text-muted-foreground">
          {opportunities.length} opportunities
        </p>
      </div>

      {/* View Content */}
      {viewMode === "kanban" ? (
        <PipelineBoard
          opportunities={opportunities}
          onStageChange={handleStageChange}
          onAddOpportunity={handleAddOpportunity}
          onEditOpportunity={handleEditOpportunity}
          isLoading={isLoading}
        />
      ) : (
        <PipelineListView
          opportunities={opportunities}
          onStageChange={handleStageChange}
          onEdit={handleEditOpportunity}
          onDelete={handleDeleteOpportunity}
          isLoading={isLoading}
        />
      )}
    </div>
  );
}

export default PipelineKanbanContainer;
