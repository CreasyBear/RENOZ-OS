/**
 * Campaign Detail Page
 *
 * Extracted for code-splitting - see $campaignId.tsx for route definition.
 */
import { useCallback } from "react";
import { useNavigate, useParams } from "@tanstack/react-router";
import { CampaignDetailPanel } from "@/components/domain/communications";

export default function CampaignDetailPage() {
  const { campaignId } = useParams({ strict: false });
  const navigate = useNavigate();

  const handleBack = useCallback(() => {
    navigate({ to: "/communications/campaigns" });
  }, [navigate]);

  return (
    <CampaignDetailPanel
      campaignId={campaignId!}
      onBack={handleBack}
    />
  );
}
