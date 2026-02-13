/**
 * Edit Campaign Page
 *
 * Extracted for code-splitting - see $campaignId/edit.tsx for route definition.
 */
import { useCallback, useState } from "react";
import { useNavigate, useParams } from "@tanstack/react-router";
import { CampaignWizard } from "@/components/domain/communications";
import { RouteErrorFallback } from "@/components/layout";
import { FormSkeleton } from "@/components/skeletons/shared";
import { useCampaign } from "@/hooks/communications/use-campaigns";
import type { Campaign } from "@/lib/schemas/communications/email-campaigns";
import { toast } from "@/lib/toast";

export default function EditCampaignPage() {
  const { campaignId } = useParams({ strict: false });
  const navigate = useNavigate();
  const [wizardOpen, setWizardOpen] = useState(true);

  const { data: campaign, isLoading, error } = useCampaign({
    campaignId: campaignId!,
    enabled: !!campaignId,
  });

  const handleSuccess = useCallback(
    (updatedCampaignId: string) => {
      toast.success("Campaign updated successfully");
      navigate({
        to: "/communications/campaigns/$campaignId",
        params: { campaignId: updatedCampaignId },
      });
    },
    [navigate]
  );

  const handleOpenChange = useCallback(
    (open: boolean) => {
      setWizardOpen(open);
      if (!open) {
        navigate({
          to: "/communications/campaigns/$campaignId",
          params: { campaignId: campaignId! },
        });
      }
    },
    [navigate, campaignId]
  );

  if (isLoading) {
    return <FormSkeleton sections={3} />;
  }

  if (error || !campaign) {
    return (
      <RouteErrorFallback
        error={error || new Error("Campaign not found")}
        parentRoute="/communications/campaigns"
      />
    );
  }

  const campaignStatus = (campaign as { status?: string }).status ?? "";
  if (!["draft", "scheduled"].includes(campaignStatus)) {
    toast.error("Cannot edit campaign", {
      description: `Campaigns with status "${campaignStatus}" cannot be edited. Only draft or scheduled campaigns can be edited.`,
    });
    navigate({
      to: "/communications/campaigns/$campaignId",
      params: { campaignId: campaignId! },
    });
    return null;
  }

  return (
    <CampaignWizard
      open={wizardOpen}
      onOpenChange={handleOpenChange}
      onSuccess={handleSuccess}
      initialCampaign={campaign as unknown as Campaign}
    />
  );
}
