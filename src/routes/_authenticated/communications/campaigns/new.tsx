/**
 * Create Campaign Route (Container)
 *
 * Container component that wires the CampaignWizard presenter.
 * Handles campaign creation mutation and navigation on success.
 *
 * @see docs/plans/2026-01-24-communications-plumbing-review.md
 */
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useState } from "react";
import { useCreateCampaign, usePopulateCampaignRecipients } from "@/hooks/communications";
import {
  CampaignWizard,
  type CampaignFormData,
} from "@/components/domain/communications/campaign-wizard";
import { toastSuccess, toastError } from "@/hooks/use-toast";

// ============================================================================
// ROUTE DEFINITION
// ============================================================================

export const Route = createFileRoute("/_authenticated/communications/campaigns/new")({
  component: CreateCampaignContainer,
});

// ============================================================================
// CONTAINER COMPONENT
// ============================================================================

function CreateCampaignContainer() {
  const navigate = useNavigate();
  const [wizardOpen, setWizardOpen] = useState(true);

  // ============================================================================
  // MUTATIONS
  // ============================================================================
  const createMutation = useCreateCampaign();
  const populateRecipientsMutation = usePopulateCampaignRecipients();

  // ============================================================================
  // HANDLERS
  // ============================================================================
  const handleSubmit = useCallback(
    async (data: CampaignFormData): Promise<{ id: string }> => {
      // Create the campaign
      const result = await createMutation.mutateAsync({
        data: {
          name: data.name,
          description: data.description || undefined,
          templateType: data.templateType,
          subjectOverride: data.templateData.subjectOverride || undefined,
          bodyOverride: data.templateData.bodyOverride || undefined,
          scheduledAt: data.scheduleEnabled && data.scheduledAt ? data.scheduledAt : undefined,
          timezone: data.timezone,
        },
      });

      // Populate recipients if criteria provided
      if (result.id && Object.keys(data.recipientCriteria).length > 0) {
        await populateRecipientsMutation.mutateAsync({
          data: {
            campaignId: result.id,
            recipientCriteria: data.recipientCriteria,
          },
        });
      }

      return { id: result.id };
    },
    [createMutation, populateRecipientsMutation]
  );

  const handleSuccess = useCallback(
    (campaignId: string) => {
      toastSuccess("Campaign created successfully");
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
      onSubmit={handleSubmit}
      onSuccess={handleSuccess}
      isSubmitting={createMutation.isPending || populateRecipientsMutation.isPending}
    />
  );
}

export default CreateCampaignContainer;
