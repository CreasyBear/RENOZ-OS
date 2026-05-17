import { memo, useMemo, type ReactNode } from "react";
import {
  AlertTriangle,
  Eye,
  Mail,
  MousePointerClick,
  Users,
  XCircle,
} from "lucide-react";
import { MetricCard } from "@/components/shared";
import { calculatePercentage } from "@/lib/communications/campaign-utils";

import type { Campaign } from "@/lib/schemas/communications";

const CAMPAIGN_STAT_STYLES = {
  default: { iconClassName: "text-muted-foreground" },
  success: { iconClassName: "text-green-600 dark:text-green-400" },
  warning: { iconClassName: "text-amber-600 dark:text-amber-400" },
  error: { iconClassName: "text-red-600 dark:text-red-400" },
} as const;

function formatCampaignStatValue(value: number, total?: number): ReactNode {
  const percentage = total !== undefined ? calculatePercentage(value, total) : 0;
  return (
    <span className="flex items-baseline gap-2">
      <span>{value.toLocaleString()}</span>
      {total !== undefined && total > 0 && (
        <span className="text-sm font-normal text-muted-foreground">({percentage}%)</span>
      )}
    </span>
  );
}

export interface CampaignDetailMetricsSectionProps {
  campaign: Campaign;
}

export const CampaignDetailMetricsSection = memo(
  function CampaignDetailMetricsSection({
    campaign,
  }: CampaignDetailMetricsSectionProps) {
    const metrics = useMemo(
      () => ({
        recipients: campaign.recipientCount.toLocaleString(),
        sent: formatCampaignStatValue(campaign.sentCount, campaign.recipientCount),
        opened: formatCampaignStatValue(campaign.openCount, campaign.sentCount),
        clicked: formatCampaignStatValue(campaign.clickCount, campaign.sentCount),
        openedIconClass:
          campaign.openCount > 0
            ? CAMPAIGN_STAT_STYLES.success.iconClassName
            : CAMPAIGN_STAT_STYLES.default.iconClassName,
        clickedIconClass:
          campaign.clickCount > 0
            ? CAMPAIGN_STAT_STYLES.success.iconClassName
            : CAMPAIGN_STAT_STYLES.default.iconClassName,
      }),
      [campaign]
    );

    return (
      <>
        <div
          className="grid grid-cols-2 md:grid-cols-4 gap-4"
          aria-label="Campaign statistics"
        >
          <MetricCard
            title="Recipients"
            value={metrics.recipients}
            icon={Users}
            iconClassName={CAMPAIGN_STAT_STYLES.default.iconClassName}
          />
          <MetricCard
            title="Sent"
            value={metrics.sent}
            icon={Mail}
            iconClassName={CAMPAIGN_STAT_STYLES.default.iconClassName}
          />
          <MetricCard
            title="Opened"
            value={metrics.opened}
            icon={Eye}
            iconClassName={metrics.openedIconClass}
          />
          <MetricCard
            title="Clicked"
            value={metrics.clicked}
            icon={MousePointerClick}
            iconClassName={metrics.clickedIconClass}
          />
        </div>

        {campaign.bounceCount > 0 || campaign.failedCount > 0 ? (
          <div className="grid grid-cols-2 gap-4" aria-label="Campaign delivery issues">
            {campaign.bounceCount > 0 && (
              <MetricCard
                title="Bounced"
                value={formatCampaignStatValue(campaign.bounceCount, campaign.sentCount)}
                icon={XCircle}
                iconClassName={CAMPAIGN_STAT_STYLES.warning.iconClassName}
              />
            )}
            {campaign.failedCount > 0 && (
              <MetricCard
                title="Failed"
                value={formatCampaignStatValue(campaign.failedCount, campaign.recipientCount)}
                icon={AlertTriangle}
                iconClassName={CAMPAIGN_STAT_STYLES.error.iconClassName}
              />
            )}
          </div>
        ) : null}
      </>
    );
  }
);
