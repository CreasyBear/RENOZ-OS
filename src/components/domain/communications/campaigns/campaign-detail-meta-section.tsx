import { memo, useMemo } from "react";
import { format, formatDistanceToNow } from "date-fns";
import { Calendar, CheckCircle2, Send } from "lucide-react";
import {
  DetailGrid,
  DetailSection,
  type DetailGridField,
} from "@/components/shared/detail-view";

import type { Campaign } from "@/lib/schemas/communications";

interface CampaignDetailMetaSectionProps {
  campaign: Campaign;
}

export const CampaignDetailMetaSection = memo(
  function CampaignDetailMetaSection({ campaign }: CampaignDetailMetaSectionProps) {
    const fields = useMemo(() => {
      const campaignFields: DetailGridField[] = [];

      if (campaign.scheduledAt) {
        campaignFields.push({
          label: "Scheduled",
          value: (
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {format(new Date(campaign.scheduledAt), "PPp")}
            </div>
          ),
        });
      }

      if (campaign.startedAt) {
        campaignFields.push({
          label: "Started",
          value: (
            <div className="flex items-center gap-1">
              <Send className="h-3 w-3" />
              {formatDistanceToNow(new Date(campaign.startedAt), {
                addSuffix: true,
              })}
            </div>
          ),
        });
      }

      if (campaign.completedAt) {
        campaignFields.push({
          label: "Completed",
          value: (
            <div className="flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" />
              {formatDistanceToNow(new Date(campaign.completedAt), {
                addSuffix: true,
              })}
            </div>
          ),
        });
      }

      return campaignFields;
    }, [campaign]);

    if (fields.length === 0) {
      return null;
    }

    return (
      <DetailSection id="meta" title="Campaign Information" defaultOpen={true}>
        <DetailGrid fields={fields} />
      </DetailSection>
    );
  }
);
