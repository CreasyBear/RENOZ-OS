/**
 * Create Campaign Page
 *
 * Extracted for code-splitting - see new.tsx for route definition.
 */
import { useCallback, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { CampaignWizard } from "@/components/domain/communications";

export default function CreateCampaignPage() {
  const navigate = useNavigate();
  const [wizardOpen, setWizardOpen] = useState(true);

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
        navigate({ to: "/communications/campaigns" });
      }
    },
    [navigate]
  );

  return (
    <CampaignWizard
      open={wizardOpen}
      onOpenChange={handleOpenChange}
      onSuccess={handleSuccess}
    />
  );
}
