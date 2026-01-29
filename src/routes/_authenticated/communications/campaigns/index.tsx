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
  type UseCampaignsOptions,
} from "@/hooks/communications";
import { CampaignsList, type CampaignListItem } from "@/components/domain/communications";
import { toastSuccess, toastError } from "@/hooks";
import { ErrorState } from "@/components/shared";
import { RouteErrorFallback } from "@/components/layout";
import { CommunicationsListSkeleton } from "@/components/skeletons/communications";

// ============================================================================
// ROUTE DEFINITION
// ============================================================================

export const Route = createFileRoute("/_authenticated/communications/campaigns/")({
  component: CampaignsContainer,
  errorComponent: ({ error }) => (
    <RouteErrorFallback error={error} parentRoute="/communications" />
  ),
  pendingComponent: () => <CommunicationsListSkeleton />,
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
    status: statusFilter as UseCampaignsOptions["status"],
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
        await cancelMutation.mutateAsync({ id });
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
        await deleteMutation.mutateAsync({ id });
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
        message="There was an error loading your email campaigns."
        onRetry={() => refetch()}
      />
    );
  }

  // ============================================================================
  // RENDER
  // ============================================================================
  // Map server response to CampaignListItem format
  // The server returns basic campaign data; stats are populated with defaults
  // until a separate stats endpoint or aggregation is added
  const campaigns: CampaignListItem[] = (campaignsData?.items ?? []).map((item) => ({
    id: item.id,
    name: item.name,
    templateType: item.templateType,
    status: item.status,
    // Stats default to 0 - these would come from a separate aggregation query
    recipientCount: 0,
    sentCount: 0,
    openCount: 0,
    clickCount: 0,
    bounceCount: 0,
    failedCount: 0,
    scheduledAt: item.scheduledAt?.toISOString() ?? null,
    startedAt: item.sentAt?.toISOString() ?? null,
    completedAt: item.sentAt?.toISOString() ?? null,
    createdAt: item.createdAt.toISOString(),
  }));

  return (
    <CampaignsList
      campaigns={campaigns as CampaignListItem[]}
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
