/**
 * Create Campaign Route (Container)
 *
 * Container component that wires the CampaignWizard presenter.
 * The CampaignWizard handles its own campaign creation logic internally.
 *
 * @see docs/plans/2026-01-24-communications-plumbing-review.md
 */
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useState } from "react";
import { CampaignWizard } from "@/components/domain/communications";
import { RouteErrorFallback } from "@/components/layout";
import { FormSkeleton } from "@/components/skeletons/shared";

// ============================================================================
// ROUTE DEFINITION
// ============================================================================

export const Route = createFileRoute("/_authenticated/communications/campaigns/new")({
  component: CreateCampaignContainer,
  errorComponent: ({ error }) => (
    <RouteErrorFallback error={error} parentRoute="/communications/campaigns" />
  ),
  pendingComponent: () => <FormSkeleton sections={3} />,
});

// ============================================================================
// CONTAINER COMPONENT
// ============================================================================

function CreateCampaignContainer() {
  const navigate = useNavigate();
  const [wizardOpen, setWizardOpen] = useState(true);

  // ============================================================================
  // HANDLERS
  // ============================================================================
  const handleSuccess = useCallback(
    (campaignId: string) => {
      navigate({
        to: "/communications/campaigns/$campaignId",
        params: { campaignId },
      });
    },
    [navigate]
  );

  const handleOpenChange = useCallback(
    (open: boolean) => {
      setWizardOpen(open);
      if (!open) {
        // Navigate back to campaigns list when wizard is closed
        navigate({ to: "/communications/campaigns" });
      }
    },
    [navigate]
  );

  // ============================================================================
  // RENDER
  // ============================================================================
  return (
    <CampaignWizard
      open={wizardOpen}
      onOpenChange={handleOpenChange}
      onSuccess={handleSuccess}
    />
  );
}

export default CreateCampaignContainer;
