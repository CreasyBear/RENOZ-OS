import { memo } from "react";
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  History,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";

import type { CampaignStatus } from "@/lib/schemas/communications";

export interface CampaignDetailNextStepsSectionProps {
  status: CampaignStatus;
  onViewAnalytics: () => void;
  onCreateNewCampaign?: () => void;
  onViewEmailHistory: () => void;
}

export const CampaignDetailNextStepsSection = memo(
  function CampaignDetailNextStepsSection({
    status,
    onViewAnalytics,
    onCreateNewCampaign,
    onViewEmailHistory,
  }: CampaignDetailNextStepsSectionProps) {
    if (status !== "sent") {
      return null;
    }

    return (
      <section className="rounded-lg border bg-muted/50 p-4" aria-label="Next steps">
        <div className="flex items-start gap-3">
          <div className="rounded-full bg-success/10 p-2">
            <CheckCircle2 className="h-5 w-5 text-success" />
          </div>
          <div className="flex-1 space-y-3">
            <div>
              <h3 className="text-sm font-semibold">Campaign completed successfully</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Your campaign has been sent. Here are some suggested next steps:
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="default"
                size="sm"
                onClick={onViewAnalytics}
                className="gap-2"
              >
                <BarChart3 className="h-4 w-4" />
                View Analytics
                <ArrowRight className="h-3 w-3" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onCreateNewCampaign?.()}
                className="gap-2"
              >
                <Plus className="h-4 w-4" />
                Create New Campaign
                <ArrowRight className="h-3 w-3" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={onViewEmailHistory}
                className="gap-2"
              >
                <History className="h-4 w-4" />
                View Email History
                <ArrowRight className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </div>
      </section>
    );
  }
);
