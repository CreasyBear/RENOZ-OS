/**
 * CampaignDetailPanel Component
 *
 * Comprehensive detail view for email campaigns following DETAIL-VIEW-STANDARDS.md.
 * Implements 5-zone layout: Header, Progress, Alerts, Metrics, Recipients.
 *
 * @see DOM-COMMS-003d
 * @see docs/design-system/DETAIL-VIEW-STANDARDS.md
 */

"use client";

import { memo, useMemo, useCallback, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  useCampaign,
  useCampaignRecipients,
  useSendCampaign,
  usePauseCampaign,
  useResumeCampaign,
  useTestSendCampaign,
} from "@/hooks/communications/use-campaigns";
import { useConfirmation } from "@/hooks/_shared/use-confirmation";
import { toast } from "@/lib/toast";
import {
  pauseCampaignFromDetail,
  resumeCampaignFromDetail,
  sendCampaignFromDetail,
  testSendCampaignFromDetail,
  type CampaignDetailActionFeedback,
  type CampaignDetailActionMutations,
  type CampaignDetailActionResult,
} from "./campaign-detail-actions";
import { CampaignDetailLoadedState } from "./campaign-detail-loaded-state";
import { CampaignDetailSkeleton } from "./campaign-detail-skeleton";
import { CampaignDetailUnavailableState } from "./campaign-detail-unavailable-state";

// ============================================================================
// TYPES
// ============================================================================

import type {
  Campaign,
  CampaignDetailPanelProps,
} from "@/lib/schemas/communications";

function showCampaignDetailActionFeedback(feedback: CampaignDetailActionFeedback[]) {
  for (const item of feedback) {
    const options = item.description ? { description: item.description } : undefined;
    if (item.type === "success") toast.success(item.title, options);
    if (item.type === "warning") toast.warning(item.title, options);
    if (item.type === "error") toast.error(item.title, options);
  }
}

export const CampaignDetailPanel = memo(function CampaignDetailPanel({
  campaignId,
  onBack,
  className,
}: CampaignDetailPanelProps) {
  const navigate = useNavigate();
  const { confirm } = useConfirmation();
  const [testSendDialogOpen, setTestSendDialogOpen] = useState(false);

  const { data: campaignData, isLoading: campaignLoading, error: campaignError } = useCampaign({
    campaignId,
  });

  const campaign = (campaignData ?? null) as Campaign | null;

  const { data: recipientsData, isLoading: recipientsLoading } =
    useCampaignRecipients({
      campaignId,
      limit: 50,
      offset: 0,
      enabled: !!campaign,
    });

  // Mutations
  const sendCampaignMutation = useSendCampaign();
  const pauseCampaignMutation = usePauseCampaign();
  const resumeCampaignMutation = useResumeCampaign();
  const testSendMutation = useTestSendCampaign();

  const campaignDetailActionMutations = useMemo<CampaignDetailActionMutations>(
    () => ({
      sendCampaign: (input) => sendCampaignMutation.mutateAsync(input),
      pauseCampaign: (input) => pauseCampaignMutation.mutateAsync(input),
      resumeCampaign: (input) => resumeCampaignMutation.mutateAsync(input),
      testSendCampaign: (input) => testSendMutation.mutateAsync(input),
    }),
    [
      pauseCampaignMutation,
      resumeCampaignMutation,
      sendCampaignMutation,
      testSendMutation,
    ]
  );

  // Memoized computations
  const recipients = useMemo(
    () => recipientsData?.items ?? [],
    [recipientsData]
  );

  // Handlers
  const handleSendCampaign = useCallback(async () => {
    if (!campaign) return;

    const result = await sendCampaignFromDetail({
      campaign,
      confirm,
      mutations: campaignDetailActionMutations,
    });

    showCampaignDetailActionFeedback(result.feedback);
  }, [campaign, campaignDetailActionMutations, confirm]);

  const handlePauseCampaign = useCallback(async () => {
    if (!campaign) return;

    const result = await pauseCampaignFromDetail({
      campaign,
      confirm,
      mutations: campaignDetailActionMutations,
    });

    showCampaignDetailActionFeedback(result.feedback);
  }, [campaign, campaignDetailActionMutations, confirm]);

  const handleResumeCampaign = useCallback(async () => {
    if (!campaign) return;

    const result = await resumeCampaignFromDetail({
      campaign,
      mutations: campaignDetailActionMutations,
    });

    showCampaignDetailActionFeedback(result.feedback);
  }, [campaign, campaignDetailActionMutations]);

  const handleEditCampaign = useCallback(() => {
    navigate({
      to: "/communications/campaigns/$campaignId/edit",
      params: { campaignId },
    });
  }, [navigate, campaignId]);

  const handleViewAnalytics = useCallback(() => {
    // Navigate to campaign analytics page
    navigate({ to: "/communications/campaigns/analytics" });
  }, [navigate]);

  const handleViewEmailHistory = useCallback(() => {
    if (!campaign) return;
    // Navigate to inbox filtered by this campaign
    navigate({ 
      to: "/communications/inbox", 
      search: { campaignId: campaign.id } 
    });
  }, [navigate, campaign]);

  const handleTestSend = useCallback(async (testEmail: string): Promise<CampaignDetailActionResult> => {
    if (!campaign) return { status: "blocked", feedback: [] };

    const result = await testSendCampaignFromDetail({
      campaign,
      testEmail,
      mutations: campaignDetailActionMutations,
    });

    showCampaignDetailActionFeedback(result.feedback);

    return result;
  }, [campaign, campaignDetailActionMutations]);

  const handleOpenTestSendDialog = useCallback(() => {
    setTestSendDialogOpen(true);
  }, []);

  // Loading state
  if (campaignLoading) {
    return <CampaignDetailSkeleton />;
  }

  // Error state
  if (campaignError || !campaign) {
    return <CampaignDetailUnavailableState error={campaignError} onBack={onBack} />;
  }

  return (
    <CampaignDetailLoadedState
      campaign={campaign}
      recipients={recipients}
      recipientsLoading={recipientsLoading}
      className={className}
      isSendPending={sendCampaignMutation.isPending}
      isPausePending={pauseCampaignMutation.isPending}
      isResumePending={resumeCampaignMutation.isPending}
      testSendDialogOpen={testSendDialogOpen}
      isTestSendPending={testSendMutation.isPending}
      onBack={onBack}
      onSendCampaign={handleSendCampaign}
      onPauseCampaign={handlePauseCampaign}
      onResumeCampaign={handleResumeCampaign}
      onEditCampaign={handleEditCampaign}
      onViewAnalytics={handleViewAnalytics}
      onViewEmailHistory={handleViewEmailHistory}
      onOpenTestSendDialog={handleOpenTestSendDialog}
      onTestSendDialogOpenChange={setTestSendDialogOpen}
      onSendTestEmail={handleTestSend}
    />
  );
});
