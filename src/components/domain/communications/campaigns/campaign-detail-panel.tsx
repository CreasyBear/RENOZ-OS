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

import { memo, useMemo } from "react";
import { useCampaignDetailActions } from "@/hooks/communications/use-campaign-detail-actions";
import {
  useCampaign,
  useCampaignRecipients,
} from "@/hooks/communications/use-campaigns";
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

export const CampaignDetailPanel = memo(function CampaignDetailPanel({
  campaignId,
  onBack,
  className,
}: CampaignDetailPanelProps) {
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

  const { actions: campaignDetailActions, state: campaignDetailActionState } =
    useCampaignDetailActions({ campaign, campaignId });

  // Memoized computations
  const recipients = useMemo(
    () => recipientsData?.items ?? [],
    [recipientsData]
  );

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
      isSendPending={campaignDetailActionState.isSendPending}
      isPausePending={campaignDetailActionState.isPausePending}
      isResumePending={campaignDetailActionState.isResumePending}
      testSendDialogOpen={campaignDetailActionState.testSendDialogOpen}
      isTestSendPending={campaignDetailActionState.isTestSendPending}
      onBack={onBack}
      onSendCampaign={campaignDetailActions.onSendCampaign}
      onPauseCampaign={campaignDetailActions.onPauseCampaign}
      onResumeCampaign={campaignDetailActions.onResumeCampaign}
      onEditCampaign={campaignDetailActions.onEditCampaign}
      onViewAnalytics={campaignDetailActions.onViewAnalytics}
      onViewEmailHistory={campaignDetailActions.onViewEmailHistory}
      onOpenTestSendDialog={campaignDetailActions.onOpenTestSendDialog}
      onTestSendDialogOpenChange={
        campaignDetailActions.onTestSendDialogOpenChange
      }
      onSendTestEmail={campaignDetailActions.onSendTestEmail}
    />
  );
});
