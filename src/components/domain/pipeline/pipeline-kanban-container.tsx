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
import { endOfMonth, isSameDay, startOfMonth } from "date-fns";
import { useQueryClient } from "@tanstack/react-query";
import {
  useOpportunitiesKanban,
  usePipelineMetrics,
  useUpdateOpportunityStage,
  useDeleteOpportunity,
  type OpportunityKanbanFilters,
} from "@/hooks/pipeline";
import { toastSuccess, toastError, useConfirmation } from "@/hooks";
import { DomainFilterBar } from "@/components/shared/filters";
import { PipelineBoard } from "./pipeline-board";
import { PipelineListView } from "./pipeline-list-view";
import { PipelineMetrics } from "./pipeline-metrics";
import {
  createPipelineFilterConfig,
  DEFAULT_PIPELINE_FILTERS,
  type PipelineFiltersState,
} from "./pipeline-filter-config";
import { OpportunityQuickDialog } from "./opportunities/opportunity-quick-dialog";
import { useUsers } from "@/hooks/users/use-users";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { ErrorState } from "@/components/shared";
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
import type { Opportunity, OpportunityStage } from "@/lib/schemas/pipeline";
import { queryKeys } from "@/lib/query-keys";

// ============================================================================
// DEFAULT FILTERS - Keep result set manageable
// ============================================================================

/**
 * Default filters for the pipeline kanban view (overrides global defaults).
 * Starts with "my deals" for better initial UX.
 */
const KANBAN_DEFAULT_FILTERS: PipelineFiltersState = {
  ...DEFAULT_PIPELINE_FILTERS,
  assignedTo: "me", // Default to current user's opportunities
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
    filters.assignedTo === KANBAN_DEFAULT_FILTERS.assignedTo &&
    !filters.includeWonLost &&
    !filters.search &&
    filters.stages.length === 0 &&
    filters.valueRange === null
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

function getCurrentMonthRange() {
  const now = new Date();
  return {
    from: startOfMonth(now),
    to: endOfMonth(now),
  };
}

function isSameMonthRange(
  range: PipelineFiltersState["expectedCloseDate"] | null
): boolean {
  if (!range?.from || !range?.to) return false;
  const currentRange = getCurrentMonthRange();
  return (
    isSameDay(range.from, currentRange.from) &&
    isSameDay(range.to, currentRange.to)
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
        return isSameMonthRange(currentFilters.expectedCloseDate);
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
    const monthRange = getCurrentMonthRange();
    onChange({
      ...KANBAN_DEFAULT_FILTERS,
      ...filter.filters,
      expectedCloseDate: filter.id === "closing-soon" ? monthRange : null,
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
          onClick={() => onChange(KANBAN_DEFAULT_FILTERS)}
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
  const confirm = useConfirmation();
  const queryClient = useQueryClient();

  // Filter state with defaults
  const [filters, setFilters] = useState<PipelineFiltersState>({
    ...KANBAN_DEFAULT_FILTERS,
    ...initialFilters,
  });

  const [quickDialogOpen, setQuickDialogOpen] = useState(false);
  const [quickDialogMode, setQuickDialogMode] = useState<"create" | "edit">("create");
  const [quickDialogStage, setQuickDialogStage] = useState<OpportunityStage>("new");
  const [quickDialogOpportunityId, setQuickDialogOpportunityId] = useState<string | null>(null);

  // View mode state (kanban vs list)
  const [viewMode, setViewMode] = useState<PipelineViewMode>(initialViewMode);

  // Fetch team members for dynamic assignee options
  const { data: usersData } = useUsers({ page: 1, pageSize: 100, status: "active", sortOrder: "asc" });

  // Create dynamic filter config with assignee options
  const filterConfig = useMemo(() => {
    const assignees = (usersData?.items ?? []).map((user) => ({
      id: user.id,
      name: user.name ?? user.email ?? "Unknown",
    }));
    return createPipelineFilterConfig(assignees);
  }, [usersData?.items]);

  // Convert filter state to hook options
  const kanbanFilters = useMemo<OpportunityKanbanFilters>(
    () => ({
      search: filters.search || undefined,
      stages: filters.stages.length > 0 ? filters.stages : undefined,
      assignedTo: filters.assignedTo === "me" ? undefined : filters.assignedTo || undefined,
      minValue: filters.valueRange?.min ?? undefined,
      maxValue: filters.valueRange?.max ?? undefined,
      expectedCloseDateFrom: filters.expectedCloseDate?.from ?? undefined,
      expectedCloseDateTo: filters.expectedCloseDate?.to ?? undefined,
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
  const deleteMutation = useDeleteOpportunity();

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
  const handleAddOpportunity = useCallback((stage: OpportunityStage) => {
    setQuickDialogMode("create");
    setQuickDialogStage(stage);
    setQuickDialogOpportunityId(null);
    setQuickDialogOpen(true);
  }, []);

  // Handle edit opportunity
  const handleEditOpportunity = useCallback((id: string) => {
    setQuickDialogMode("edit");
    setQuickDialogOpportunityId(id);
    setQuickDialogOpen(true);
  }, []);

  // Handle delete opportunity (for list view)
  const handleDeleteOpportunity = useCallback(
    async (id: string) => {
      const confirmed = await confirm.confirm({
        title: "Delete Opportunity",
        description: "Are you sure you want to delete this opportunity? This action cannot be undone.",
        confirmLabel: "Delete Opportunity",
        variant: "destructive",
      });

      if (!confirmed.confirmed) return;

      try {
        await deleteMutation.mutateAsync(id);
        toastSuccess("Opportunity deleted successfully.");
      } catch (error) {
        toastError(error instanceof Error ? error.message : "Failed to delete opportunity.");
      }
    },
    [confirm, deleteMutation]
  );

  // Cast: OpportunityMetadata from API lacks index signature { [x: string]: unknown } expected by schema
  const opportunities: Opportunity[] = (opportunitiesData?.items ?? []) as Opportunity[];
  const totalCount = opportunitiesData?.pagination?.totalItems ?? opportunities.length;
  const isLoading =
    isLoadingOpportunities || stageChangeMutation.isPending || deleteMutation.isPending;
  const error = opportunitiesError || metricsError;

  // Handle error state
  if (error && !isLoading) {
    return (
      <ErrorState
        title="Failed to load pipeline"
        message={error.message || "An unexpected error occurred"}
        onRetry={() => {
          queryClient.invalidateQueries({ queryKey: queryKeys.opportunities.lists() });
          queryClient.invalidateQueries({ queryKey: queryKeys.pipeline.metrics() });
        }}
        retryLabel="Retry"
      />
    );
  }

  return (
    <div className="space-y-3">
      {/* Filters + Quick Chips on one row */}
      <DomainFilterBar<PipelineFiltersState>
        config={filterConfig}
        filters={filters}
        onFiltersChange={setFilters}
        defaultFilters={DEFAULT_PIPELINE_FILTERS}
        presetsSuffix={
          <QuickFilterChips currentFilters={filters} onChange={setFilters} />
        }
      />

      {/* Scope Indicator (shows when filtered or broad scope) */}
      <ScopeIndicator
        filters={filters}
        totalCount={totalCount}
        onReset={() => setFilters(KANBAN_DEFAULT_FILTERS)}
        onViewAll={() => setFilters({ ...filters, includeWonLost: true })}
      />

      {/* Metrics */}
      <PipelineMetrics metrics={metricsData ?? null} isLoading={isLoadingMetrics} />

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
        <div className="w-full min-w-0 overflow-hidden">
          <PipelineBoard
            opportunities={opportunities}
            onStageChange={handleStageChange}
            onAddOpportunity={handleAddOpportunity}
            onEditOpportunity={handleEditOpportunity}
            isLoading={isLoading}
          />
        </div>
      ) : (
        <PipelineListView
          opportunities={opportunities}
          onStageChange={handleStageChange}
          onEdit={handleEditOpportunity}
          onDelete={handleDeleteOpportunity}
          isLoading={isLoading}
        />
      )}

      <OpportunityQuickDialog
        open={quickDialogOpen}
        onOpenChange={setQuickDialogOpen}
        mode={quickDialogMode}
        stage={quickDialogStage}
        opportunityId={quickDialogOpportunityId}
        onSuccess={(opportunityId) => {
          // Invalidate pipeline queries to refresh the board
          queryClient.invalidateQueries({ queryKey: queryKeys.opportunities.lists() });
          queryClient.invalidateQueries({ queryKey: queryKeys.pipeline.metrics() });
          queryClient.invalidateQueries({ queryKey: queryKeys.opportunities.detail(opportunityId) });
        }}
      />
    </div>
  );
}

export default PipelineKanbanContainer;
