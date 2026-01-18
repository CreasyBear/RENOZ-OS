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
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Download } from "lucide-react";
import { PageLayout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { toastSuccess, toastError } from "@/hooks/use-toast";
import {
  PipelineBoard,
  PipelineMetrics,
  PipelineFilters,
  type PipelineFiltersState,
} from "@/components/domain/pipeline";
import {
  listOpportunities,
  getPipelineMetrics,
  updateOpportunityStage,
} from "@/server/functions/pipeline";
import type { OpportunityStage } from "@/lib/schemas/pipeline";

// ============================================================================
// ROUTE DEFINITION
// ============================================================================

export const Route = createFileRoute("/_authenticated/pipeline/")({
  component: PipelinePage,
});

// ============================================================================
// MAIN COMPONENT
// ============================================================================

function PipelinePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

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
  const {
    data: opportunitiesData,
    isLoading: isLoadingOpportunities,
    refetch: refetchOpportunities,
  } = useQuery({
    queryKey: ["opportunities", filters],
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
      return result;
    },
  });

  // Fetch metrics
  const { data: metricsData, isLoading: isLoadingMetrics } = useQuery({
    queryKey: ["pipeline-metrics"],
    queryFn: async () => {
      const result = await getPipelineMetrics({ data: {} });
      return result;
    },
  });

  // Stage change mutation
  const stageChangeMutation = useMutation({
    mutationFn: async ({
      opportunityId,
      stage,
      reason,
    }: {
      opportunityId: string;
      stage: OpportunityStage;
      reason?: { winLossReasonId?: string; lostNotes?: string; competitorName?: string };
    }) => {
      return updateOpportunityStage({
        data: {
          id: opportunityId,
          stage,
          ...reason,
        },
      });
    },
    onMutate: async ({ opportunityId, stage }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["opportunities"] });

      // Snapshot previous value
      const previousData = queryClient.getQueryData(["opportunities", filters]);

      // Optimistically update
      queryClient.setQueryData(
        ["opportunities", filters],
        (old: typeof opportunitiesData) => {
          if (!old) return old;
          return {
            ...old,
            items: old.items.map((opp) =>
              opp.id === opportunityId ? { ...opp, stage } : opp
            ),
          };
        }
      );

      return { previousData };
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previousData) {
        queryClient.setQueryData(["opportunities", filters], context.previousData);
      }
      toastError("Failed to update opportunity stage. Please try again.");
    },
    onSuccess: () => {
      toastSuccess("Opportunity stage updated successfully.");
    },
    onSettled: () => {
      // Refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: ["opportunities"] });
      queryClient.invalidateQueries({ queryKey: ["pipeline-metrics"] });
    },
  });

  // Handle stage change from board
  const handleStageChange = useCallback(
    async (
      opportunityId: string,
      newStage: OpportunityStage,
      reason?: { winLossReasonId?: string; lostNotes?: string; competitorName?: string }
    ) => {
      await stageChangeMutation.mutateAsync({
        opportunityId,
        stage: newStage,
        reason,
      });
    },
    [stageChangeMutation]
  );

  // Handle add opportunity
  const handleAddOpportunity = useCallback(
    (stage: OpportunityStage) => {
      navigate({
        to: "/pipeline/new",
        search: { stage },
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
    <PageLayout
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
            onClick={() => navigate({ to: "/pipeline/new" })}
          >
            <Plus className="h-4 w-4 mr-2" />
            New Opportunity
          </Button>
        </div>
      }
    >
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
    </PageLayout>
  );
}
