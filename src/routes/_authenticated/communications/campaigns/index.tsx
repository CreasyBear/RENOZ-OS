/**
 * Campaigns List Route (Container)
 *
 * Container component that fetches campaign data and passes to CampaignsList presenter.
 * Handles all data fetching, mutations, and navigation.
 *
 * @see docs/plans/2026-01-24-refactor-communications-full-container-presenter-plan.md
 */
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useState } from "react";
import {
  useCampaigns,
  useCancelCampaign,
  useDeleteCampaign,
} from "@/hooks/communications";
import { CampaignsList } from "@/components/domain/communications/campaigns-list";
import { toastSuccess, toastError } from "@/hooks/use-toast";
import { ErrorState } from "@/components/shared";

// ============================================================================
// ROUTE DEFINITION
// ============================================================================

export const Route = createFileRoute("/_authenticated/communications/campaigns/")({
  component: CampaignsContainer,
});

// ============================================================================
// CONTAINER COMPONENT
// ============================================================================

function CampaignsContainer() {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);

  // ============================================================================
  // DATA FETCHING
  // ============================================================================
  const {
    data: campaignsData,
    isLoading,
    error,
    refetch,
  } = useCampaigns({
    status: statusFilter as Parameters<typeof useCampaigns>[0]["status"],
  });

  // ============================================================================
  // MUTATIONS
  // ============================================================================
  const cancelMutation = useCancelCampaign();
  const deleteMutation = useDeleteCampaign();

  // ============================================================================
  // HANDLERS
  // ============================================================================
  const handleCancel = useCallback(
    async (id: string) => {
      try {
        await cancelMutation.mutateAsync({ data: { id } });
        toastSuccess("Campaign paused");
      } catch {
        toastError("Failed to pause campaign");
      }
    },
    [cancelMutation]
  );

  const handleDelete = useCallback(
    async (id: string) => {
      try {
        await deleteMutation.mutateAsync({ data: { id } });
        toastSuccess("Campaign deleted");
      } catch {
        toastError("Failed to delete campaign");
      }
    },
    [deleteMutation]
  );

  const handleView = useCallback(
    (id: string) => {
      navigate({
        to: "/communications/campaigns/$campaignId",
        params: { campaignId: id },
      });
    },
    [navigate]
  );

  const handleCreate = useCallback(() => {
    navigate({ to: "/communications/campaigns/new" });
  }, [navigate]);

  const handleStatusFilterChange = useCallback((status: string | undefined) => {
    setStatusFilter(status);
  }, []);

  // ============================================================================
  // ERROR STATE
  // ============================================================================
  if (error) {
    return (
      <ErrorState
        title="Failed to load campaigns"
        description="There was an error loading your email campaigns."
        onRetry={() => refetch()}
      />
    );
  }

  // ============================================================================
  // RENDER
  // ============================================================================
  const campaigns = campaignsData?.items ?? [];

  return (
    <CampaignsList
      campaigns={campaigns}
      isLoading={isLoading}
      onCancel={handleCancel}
      onDelete={handleDelete}
      onView={handleView}
      onCreate={handleCreate}
      statusFilter={statusFilter}
      onStatusFilterChange={handleStatusFilterChange}
      isCancelling={cancelMutation.isPending}
      isDeleting={deleteMutation.isPending}
    />
  );
}

export default CampaignsContainer;
