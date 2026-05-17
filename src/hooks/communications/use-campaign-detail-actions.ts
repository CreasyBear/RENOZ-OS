"use client";

import { useCallback, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useConfirmation } from "@/hooks/_shared/use-confirmation";
import {
  usePauseCampaign,
  useResumeCampaign,
  useSendCampaign,
  useTestSendCampaign,
} from "@/hooks/communications/use-campaigns";
import { toast } from "@/lib/toast";
import {
  pauseCampaignFromDetail,
  resumeCampaignFromDetail,
  sendCampaignFromDetail,
  testSendCampaignFromDetail,
  type CampaignDetailActionFeedback,
  type CampaignDetailActionMutations,
  type CampaignDetailActionResult,
} from "@/lib/communications/campaign-detail-actions";

import type { Campaign } from "@/lib/schemas/communications";

interface UseCampaignDetailActionsOptions {
  campaign: Campaign | null;
  campaignId: string;
}

function showCampaignDetailActionFeedback(feedback: CampaignDetailActionFeedback[]) {
  for (const item of feedback) {
    const options = item.description ? { description: item.description } : undefined;
    if (item.type === "success") toast.success(item.title, options);
    if (item.type === "warning") toast.warning(item.title, options);
    if (item.type === "error") toast.error(item.title, options);
  }
}

export function useCampaignDetailActions({
  campaign,
  campaignId,
}: UseCampaignDetailActionsOptions) {
  const navigate = useNavigate();
  const { confirm } = useConfirmation();
  const [testSendDialogOpen, setTestSendDialogOpen] = useState(false);

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
    navigate({ to: "/communications/campaigns/analytics" });
  }, [navigate]);

  const handleViewEmailHistory = useCallback(() => {
    if (!campaign) return;

    navigate({
      to: "/communications/inbox",
      search: { campaignId: campaign.id },
    });
  }, [navigate, campaign]);

  const handleTestSend = useCallback(
    async (testEmail: string): Promise<CampaignDetailActionResult> => {
      if (!campaign) return { status: "blocked", feedback: [] };

      const result = await testSendCampaignFromDetail({
        campaign,
        testEmail,
        mutations: campaignDetailActionMutations,
      });

      showCampaignDetailActionFeedback(result.feedback);

      return result;
    },
    [campaign, campaignDetailActionMutations]
  );

  const handleOpenTestSendDialog = useCallback(() => {
    setTestSendDialogOpen(true);
  }, []);

  return {
    actions: {
      onSendCampaign: handleSendCampaign,
      onPauseCampaign: handlePauseCampaign,
      onResumeCampaign: handleResumeCampaign,
      onEditCampaign: handleEditCampaign,
      onViewAnalytics: handleViewAnalytics,
      onViewEmailHistory: handleViewEmailHistory,
      onOpenTestSendDialog: handleOpenTestSendDialog,
      onTestSendDialogOpenChange: setTestSendDialogOpen,
      onSendTestEmail: handleTestSend,
    },
    state: {
      isSendPending: sendCampaignMutation.isPending,
      isPausePending: pauseCampaignMutation.isPending,
      isResumePending: resumeCampaignMutation.isPending,
      isTestSendPending: testSendMutation.isPending,
      testSendDialogOpen,
    },
  };
}
