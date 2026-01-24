/**
 * Campaign Detail Route (Container)
 *
 * Container component that fetches campaign data and passes to CampaignDetailPanel presenter.
 * Handles data fetching for campaign details and recipients.
 *
 * @see docs/plans/2026-01-24-communications-plumbing-review.md
 */
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback } from "react";
import { useCampaign, useCampaignRecipients } from "@/hooks/communications";
import { CampaignDetailPanel } from "@/components/domain/communications/campaign-detail-panel";
import { ErrorState } from "@/components/shared";
import { RouteErrorFallback } from "@/components/layout";
import { CommunicationsListSkeleton } from "@/components/skeletons/communications";

// ============================================================================
// ROUTE DEFINITION
// ============================================================================

export const Route = createFileRoute("/_authenticated/communications/campaigns/$campaignId")({
  component: CampaignDetailContainer,
  errorComponent: ({ error }) => (
    <RouteErrorFallback error={error} parentRoute="/communications/campaigns" />
  ),
  pendingComponent: () => (
    <div className="container py-6 max-w-4xl">
      <CommunicationsListSkeleton />
    </div>
  ),
});

// ============================================================================
// CONTAINER COMPONENT
// ============================================================================

function CampaignDetailContainer() {
  const { campaignId } = Route.useParams();
  const navigate = useNavigate();

  // ============================================================================
  // DATA FETCHING
  // ============================================================================
  const {
    data: campaign,
    isLoading: campaignLoading,
    error: campaignError,
    refetch,
  } = useCampaign({ campaignId });

  const {
    data: recipientsData,
    isLoading: recipientsLoading,
  } = useCampaignRecipients({
    campaignId,
    enabled: !!campaignId,
  });

  // ============================================================================
  // HANDLERS
  // ============================================================================
  const handleBack = useCallback(() => {
    navigate({ to: "/communications/campaigns" });
  }, [navigate]);

  // ============================================================================
  // ERROR STATE
  // ============================================================================
  if (campaignError) {
    return (
      <ErrorState
        title="Failed to load campaign"
        description="There was an error loading this campaign."
        onRetry={() => refetch()}
      />
    );
  }

  // ============================================================================
  // RENDER
  // ============================================================================
  const campaignData = campaign
    ? {
        id: campaign.id,
        name: campaign.name,
        templateType: campaign.templateType,
        status: campaign.status,
        recipientCount: campaign.recipientCount,
        sentCount: campaign.sentCount,
        deliveredCount: campaign.deliveredCount,
        openCount: campaign.openCount,
        clickCount: campaign.clickCount,
        bounceCount: campaign.bounceCount,
        failedCount: campaign.failedCount,
        unsubscribeCount: campaign.unsubscribeCount,
        scheduledAt: campaign.scheduledAt,
        startedAt: campaign.startedAt,
        completedAt: campaign.completedAt,
        createdAt: campaign.createdAt,
      }
    : null;

  const recipients = recipientsData?.items ?? [];

  return (
    <div className="container py-6 max-w-4xl">
      <CampaignDetailPanel
        campaign={campaignData}
        isLoading={campaignLoading}
        recipients={recipients}
        recipientsLoading={recipientsLoading}
        onBack={handleBack}
      />
    </div>
  );
}

export default CampaignDetailContainer;
