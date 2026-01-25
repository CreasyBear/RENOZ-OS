/**
 * Campaign Detail Route (Container)
 *
 * Container component that renders CampaignDetailPanel with campaign ID.
 * The CampaignDetailPanel handles its own data fetching.
 *
 * @see docs/plans/2026-01-24-communications-plumbing-review.md
 */
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback } from "react";
import { CampaignDetailPanel } from "@/components/domain/communications";
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
  // HANDLERS
  // ============================================================================
  const handleBack = useCallback(() => {
    navigate({ to: "/communications/campaigns" });
  }, [navigate]);

  // ============================================================================
  // RENDER
  // ============================================================================
  return (
    <div className="container py-6 max-w-4xl">
      <CampaignDetailPanel
        campaignId={campaignId}
        onBack={handleBack}
      />
    </div>
  );
}

export default CampaignDetailContainer;
