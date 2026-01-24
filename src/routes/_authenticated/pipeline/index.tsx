/**
 * Pipeline Index Route
 *
 * Main pipeline kanban board page for managing sales opportunities.
 * Features drag-and-drop stage transitions, filtering, and metrics.
 *
 * @see _Initiation/_prd/2-domains/pipeline/wireframes/pipeline-kanban-board.wireframe.md
 */
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus, Download } from "lucide-react";
import { PageLayout, RouteErrorFallback } from "@/components/layout";
import { PipelineKanbanSkeleton } from "@/components/skeletons/pipeline";
import { Button } from "@/components/ui/button";
import { toastSuccess, toastError } from "@/hooks/use-toast";
import {
  PipelineBoard,
  PipelineMetrics,
  PipelineFilters,
  type PipelineFiltersState,
} from "@/components/domain/pipeline";
import { usePipelineMetrics, useUpdateOpportunityStage } from "@/hooks/pipeline";
import { listOpportunities } from "@/server/functions/pipeline";
import { queryKeys } from "@/lib/query-keys";
import type { OpportunityStage, Opportunity } from "@/lib/schemas/pipeline";

// ============================================================================
// ROUTE DEFINITION
// ============================================================================

export const Route = createFileRoute("/_authenticated/pipeline/")({
  component: PipelinePage,
  errorComponent: ({ error }) => (
    <RouteErrorFallback error={error} parentRoute="/" />
  ),
  pendingComponent: () => (
    <PageLayout>
      <PageLayout.Header
        title="Pipeline"
        description="Track and manage your sales opportunities"
      />
      <PageLayout.Content>
        <PipelineKanbanSkeleton />
      </PageLayout.Content>
    </PageLayout>
  ),
});

// ============================================================================
// MAIN COMPONENT
// ============================================================================

function PipelinePage() {
  const navigate = useNavigate();

  // Filter state
  const [filters, setFilters] = useState<PipelineFiltersState>({
    search: "",
    stages: [],
    assignedTo: null,
    minValue: null,
    maxValue: null,
    includeWonLost: true, // Show all stages on board
  });

  // Fetch opportunities
  // Note: Using inline query because useOpportunities hook doesn't support all filter options
  // (stages array, minValue, maxValue, includeWonLost). Hook enhancement needed for full migration.
  const {
    data: opportunitiesData,
    isLoading: isLoadingOpportunities,
  } = useQuery({
    queryKey: queryKeys.opportunities.list(filters),
    queryFn: async () => {
      const result = await listOpportunities({
        data: {
          page: 1,
          pageSize: 200, // Load all for kanban view
          sortBy: "createdAt",
          sortOrder: "desc",
          search: filters.search || undefined,
          stages: filters.stages.length > 0 ? filters.stages : undefined,
          assignedTo: filters.assignedTo || undefined,
          minValue: filters.minValue ?? undefined,
          maxValue: filters.maxValue ?? undefined,
          includeWonLost: filters.includeWonLost,
        },
      });
      return result as {
        items: Opportunity[];
        pagination: { page: number; pageSize: number; totalItems: number; totalPages: number };
        metrics: { totalValue: number; weightedValue: number };
      };
    },
  });

  // Fetch metrics using centralized hook
  const { data: metricsData, isLoading: isLoadingMetrics } = usePipelineMetrics();

  // Stage change using centralized hook (handles optimistic updates and cache invalidation)
  const stageChangeMutation = useUpdateOpportunityStage();

  // Handle stage change from board
  const handleStageChange = useCallback(
    async (
      opportunityId: string,
      newStage: OpportunityStage,
      reason?: { winLossReasonId?: string; lostNotes?: string; competitorName?: string }
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
      }
    },
    [stageChangeMutation]
  );

  // Handle add opportunity
  const handleAddOpportunity = useCallback(
    (stage: OpportunityStage) => {
      navigate({
        to: "/pipeline/$opportunityId",
        params: { opportunityId: "new" },
        search: { stage } as any, // Stage is passed as a hint for the form
      });
    },
    [navigate]
  );

  // Handle edit opportunity
  const handleEditOpportunity = useCallback(
    (id: string) => {
      navigate({
        to: "/pipeline/$opportunityId",
        params: { opportunityId: id },
      });
    },
    [navigate]
  );

  const opportunities = opportunitiesData?.items ?? [];
  const isLoading = isLoadingOpportunities || stageChangeMutation.isPending;

  return (
    <PageLayout>
      <PageLayout.Header
        title="Pipeline"
        description="Track and manage your sales opportunities"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button
              size="sm"
              onClick={() => navigate({ to: "/pipeline/$opportunityId", params: { opportunityId: "new" } })}
            >
              <Plus className="h-4 w-4 mr-2" />
              New Opportunity
            </Button>
          </div>
        }
      />
      <PageLayout.Content>
        <div className="space-y-6">
          {/* Metrics */}
          <PipelineMetrics
            metrics={metricsData ?? null}
            isLoading={isLoadingMetrics}
          />

          {/* Filters */}
          <PipelineFilters filters={filters} onChange={setFilters} />

          {/* Kanban Board */}
          <PipelineBoard
            opportunities={opportunities}
            onStageChange={handleStageChange}
            onAddOpportunity={handleAddOpportunity}
            onEditOpportunity={handleEditOpportunity}
            isLoading={isLoading}
          />
        </div>
      </PageLayout.Content>
    </PageLayout>
  );
}
