import { ArrowLeft, BarChart3, History, Pause, Play, Send } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { EntityHeader } from "@/components/shared/detail-view";
import { getCampaignStatusVariant } from "./campaign-status-config";

import type { Campaign } from "@/lib/schemas/communications";

interface CampaignDetailHeaderProps {
  campaign: Campaign;
  isSendPending: boolean;
  isPausePending: boolean;
  isResumePending: boolean;
  onBack?: () => void;
  onSendCampaign: () => void;
  onPauseCampaign: () => void;
  onResumeCampaign: () => void;
  onEditCampaign: () => void;
  onViewAnalytics: () => void;
  onViewEmailHistory: () => void;
  onOpenTestSendDialog: () => void;
}

function formatTemplateType(templateType: string) {
  return templateType
    .replace("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function CampaignDetailHeader({
  campaign,
  isSendPending,
  isPausePending,
  isResumePending,
  onBack,
  onSendCampaign,
  onPauseCampaign,
  onResumeCampaign,
  onEditCampaign,
  onViewAnalytics,
  onViewEmailHistory,
  onOpenTestSendDialog,
}: CampaignDetailHeaderProps) {
  return (
    <EntityHeader
      name={campaign.name}
      subtitle={
        <>
          {formatTemplateType(campaign.templateType)} template
          {campaign.description && ` · ${campaign.description}`}
        </>
      }
      avatarFallback={campaign.name.slice(0, 2).toUpperCase()}
      status={{
        value: campaign.status,
        variant: getCampaignStatusVariant(campaign.status),
      }}
      typeBadge={
        <Badge variant="outline" className="text-xs">
          {campaign.templateType.replace("_", " ")}
        </Badge>
      }
      primaryAction={
        campaign.status === "draft" ||
        campaign.status === "scheduled" ||
        campaign.status === "paused"
          ? {
              label: campaign.status === "paused" ? "Resume" : "Send Now",
              onClick:
                campaign.status === "paused" ? onResumeCampaign : onSendCampaign,
              icon:
                campaign.status === "paused" ? (
                  <Play className="h-4 w-4" />
                ) : (
                  <Send className="h-4 w-4" />
                ),
              disabled:
                isSendPending || isResumePending || campaign.recipientCount === 0,
            }
          : campaign.status === "sending"
            ? {
                label: "Pause",
                onClick: onPauseCampaign,
                icon: <Pause className="h-4 w-4" />,
                disabled: isPausePending,
              }
            : campaign.status === "sent"
              ? {
                  label: "View Analytics",
                  onClick: onViewAnalytics,
                  icon: <BarChart3 className="h-4 w-4" />,
                }
              : undefined
      }
      onEdit={
        campaign.status === "draft" || campaign.status === "scheduled"
          ? onEditCampaign
          : undefined
      }
      secondaryActions={[
        ...(onBack
          ? [
              {
                label: "Back to campaigns",
                onClick: onBack,
                icon: <ArrowLeft className="h-4 w-4" />,
              },
            ]
          : []),
        ...(campaign.status === "draft" ||
        campaign.status === "scheduled" ||
        campaign.status === "paused"
          ? [
              {
                label: "Send Test Email",
                onClick: onOpenTestSendDialog,
                icon: <Send className="h-4 w-4" />,
              },
            ]
          : []),
        ...(campaign.status === "sent"
          ? [
              {
                label: "View Email History",
                onClick: onViewEmailHistory,
                icon: <History className="h-4 w-4" />,
              },
            ]
          : []),
      ]}
    />
  );
}
