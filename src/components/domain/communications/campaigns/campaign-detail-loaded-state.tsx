import { memo } from "react";
import { cn } from "@/lib/utils";
import { CampaignDetailAlertsSection } from "./campaign-detail-alerts-section";
import { CampaignDetailHeader } from "./campaign-detail-header";
import { CampaignDetailLifecycleSection } from "./campaign-detail-lifecycle-section";
import { CampaignDetailMetaSection } from "./campaign-detail-meta-section";
import { CampaignDetailMetricsSection } from "./campaign-detail-metrics-section";
import { CampaignDetailNextStepsSection } from "./campaign-detail-next-steps-section";
import { CampaignDetailRecipientsSection } from "./campaign-detail-recipients-section";
import { CampaignDetailTestSendDialog } from "./campaign-detail-test-send-dialog";

import type {
  Campaign,
  CampaignRecipient,
} from "@/lib/schemas/communications";
import type { CampaignDetailActionResult } from "@/lib/communications/campaign-detail-actions";

type CampaignDetailLoadedRecipient = Omit<CampaignRecipient, "status"> & {
  status: CampaignRecipient["status"] | "skipped";
};

interface CampaignDetailLoadedStateProps {
  campaign: Campaign;
  recipients: CampaignDetailLoadedRecipient[];
  recipientsLoading: boolean;
  className?: string;
  isSendPending: boolean;
  isPausePending: boolean;
  isResumePending: boolean;
  testSendDialogOpen: boolean;
  isTestSendPending: boolean;
  onBack?: () => void;
  onSendCampaign: () => void;
  onPauseCampaign: () => void;
  onResumeCampaign: () => void;
  onEditCampaign: () => void;
  onViewAnalytics: () => void;
  onViewEmailHistory: () => void;
  onOpenTestSendDialog: () => void;
  onTestSendDialogOpenChange: (open: boolean) => void;
  onSendTestEmail: (testEmail: string) => Promise<CampaignDetailActionResult>;
}

export const CampaignDetailLoadedState = memo(
  function CampaignDetailLoadedState({
    campaign,
    recipients,
    recipientsLoading,
    className,
    isSendPending,
    isPausePending,
    isResumePending,
    testSendDialogOpen,
    isTestSendPending,
    onBack,
    onSendCampaign,
    onPauseCampaign,
    onResumeCampaign,
    onEditCampaign,
    onViewAnalytics,
    onViewEmailHistory,
    onOpenTestSendDialog,
    onTestSendDialogOpenChange,
    onSendTestEmail,
  }: CampaignDetailLoadedStateProps) {
    return (
      <div className={cn("space-y-6", className)}>
        <CampaignDetailHeader
          campaign={campaign}
          isSendPending={isSendPending}
          isPausePending={isPausePending}
          isResumePending={isResumePending}
          onBack={onBack}
          onSendCampaign={onSendCampaign}
          onPauseCampaign={onPauseCampaign}
          onResumeCampaign={onResumeCampaign}
          onEditCampaign={onEditCampaign}
          onViewAnalytics={onViewAnalytics}
          onViewEmailHistory={onViewEmailHistory}
          onOpenTestSendDialog={onOpenTestSendDialog}
        />

        <CampaignDetailLifecycleSection campaign={campaign} />
        <CampaignDetailAlertsSection campaign={campaign} />
        <CampaignDetailMetricsSection campaign={campaign} />

        <CampaignDetailNextStepsSection
          status={campaign.status}
          onViewAnalytics={onViewAnalytics}
          onCreateNewCampaign={onBack}
          onViewEmailHistory={onViewEmailHistory}
        />

        <CampaignDetailMetaSection campaign={campaign} />

        <CampaignDetailRecipientsSection
          recipientCount={campaign.recipientCount}
          recipients={recipients}
          isLoading={recipientsLoading}
        />

        <CampaignDetailTestSendDialog
          open={testSendDialogOpen}
          isPending={isTestSendPending}
          onOpenChange={onTestSendDialogOpenChange}
          onSendTestEmail={onSendTestEmail}
        />
      </div>
    );
  }
);
