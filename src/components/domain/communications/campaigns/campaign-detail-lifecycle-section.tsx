import { memo, useMemo } from "react";
import { format, formatDistanceToNow } from "date-fns";
import { Progress } from "@/components/ui/progress";
import { useReducedMotion } from "@/hooks/_shared/use-reduced-motion";
import { cn } from "@/lib/utils";
import { calculateSendProgress } from "@/lib/communications/campaign-utils";
import {
  CAMPAIGN_STAGES,
  getCampaignStageIndex,
} from "./campaign-status-config";

import type { Campaign } from "@/lib/schemas/communications";

export interface CampaignDetailLifecycleSectionProps {
  campaign: Campaign;
}

export const CampaignDetailLifecycleSection = memo(
  function CampaignDetailLifecycleSection({
    campaign,
  }: CampaignDetailLifecycleSectionProps) {
    const prefersReducedMotion = useReducedMotion();
    const currentStageIndex = getCampaignStageIndex(campaign.status);
    const isSending = campaign.status === "sending";

    const sendProgress = useMemo(
      () => calculateSendProgress(campaign.sentCount, campaign.recipientCount),
      [campaign.recipientCount, campaign.sentCount]
    );

    if (currentStageIndex < 0) {
      return null;
    }

    return (
      <section
        className="rounded-lg border bg-background p-4"
        role="progressbar"
        aria-valuenow={currentStageIndex + 1}
        aria-valuemin={1}
        aria-valuemax={CAMPAIGN_STAGES.length}
        aria-label={`Campaign progress: ${CAMPAIGN_STAGES[currentStageIndex]?.label || "Unknown"} stage`}
      >
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-sm font-medium">Campaign lifecycle</div>
            <div className="text-xs text-muted-foreground">
              {campaign.status === "sending" &&
                `Sending ${campaign.sentCount} of ${campaign.recipientCount} emails...`}
              {campaign.status === "sent" &&
                `Completed ${
                  campaign.completedAt
                    ? formatDistanceToNow(new Date(campaign.completedAt), {
                        addSuffix: true,
                      })
                    : ""
                }`}
              {campaign.status === "scheduled" &&
                campaign.scheduledAt &&
                `Scheduled for ${format(new Date(campaign.scheduledAt), "PPp")}`}
            </div>
          </div>
          {isSending && (
            <div className="text-sm font-medium" aria-live="polite" aria-atomic="true">
              {sendProgress}%
            </div>
          )}
        </div>

        {isSending && (
          <Progress
            value={sendProgress}
            className={cn(
              "h-2",
              !prefersReducedMotion && "transition-all duration-300"
            )}
            aria-label={`Sending progress: ${sendProgress}%`}
          />
        )}

        {!isSending && (
          <div className="flex items-center gap-2 mt-3">
            {CAMPAIGN_STAGES.map((stage, index) => {
              const isCompleted = index < currentStageIndex;
              const isCurrent = index === currentStageIndex;
              const isPending = index > currentStageIndex;

              return (
                <div
                  key={stage.status}
                  className={cn(
                    "flex items-center gap-2 flex-1",
                    index < CAMPAIGN_STAGES.length - 1 &&
                      "after:content-[''] after:flex-1 after:h-px after:bg-border"
                  )}
                >
                  <div
                    className={cn(
                      "flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium border-2",
                      isCompleted && "bg-primary text-primary-foreground border-primary",
                      isCurrent && "bg-primary/10 text-primary border-primary",
                      isPending && "bg-muted text-muted-foreground border-muted-foreground/30"
                    )}
                    aria-label={
                      isCompleted
                        ? `${stage.label} - completed`
                        : isCurrent
                          ? `${stage.label} - current`
                          : `${stage.label} - pending`
                    }
                  >
                    {isCompleted ? "✓" : isCurrent ? "●" : "○"}
                  </div>
                  <span
                    className={cn(
                      "text-xs",
                      isCurrent && "font-medium",
                      isPending && "text-muted-foreground"
                    )}
                  >
                    {stage.label}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </section>
    );
  }
);
