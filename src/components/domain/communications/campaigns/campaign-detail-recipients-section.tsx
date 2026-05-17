import { memo } from "react";
import { formatDistanceToNow } from "date-fns";
import { Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { EmptyState, EmptyStateContainer } from "@/components/shared/empty-state";
import { DetailSection } from "@/components/shared/detail-view";
import { StatusCell } from "@/components/shared/data-table/cells/status-cell";

import type { CampaignRecipient } from "@/lib/schemas/communications";

import { CAMPAIGN_RECIPIENT_STATUS_CONFIG } from "./campaign-recipient-status-config";

type CampaignDetailRecipient = Omit<CampaignRecipient, "status"> & {
  status: CampaignRecipient["status"] | "skipped";
};

interface CampaignDetailRecipientsSectionProps {
  recipientCount: number;
  recipients: CampaignDetailRecipient[];
  isLoading: boolean;
}

const RecipientStatusBadge = memo(function RecipientStatusBadge({
  status,
}: {
  status: CampaignDetailRecipient["status"];
}) {
  if (status === "skipped") {
    return (
      <Badge variant="outline" className="text-xs">
        Skipped
      </Badge>
    );
  }

  return (
    <StatusCell
      status={status}
      statusConfig={CAMPAIGN_RECIPIENT_STATUS_CONFIG}
      className="text-xs"
    />
  );
});

function renderRecipientActivity(recipient: CampaignDetailRecipient) {
  if (recipient.clickedAt) {
    return (
      <span>
        Clicked {formatDistanceToNow(new Date(recipient.clickedAt), { addSuffix: true })}
      </span>
    );
  }

  if (recipient.openedAt) {
    return (
      <span>
        Opened {formatDistanceToNow(new Date(recipient.openedAt), { addSuffix: true })}
      </span>
    );
  }

  if (recipient.sentAt) {
    return (
      <span>
        Sent {formatDistanceToNow(new Date(recipient.sentAt), { addSuffix: true })}
      </span>
    );
  }

  if (recipient.errorMessage) {
    return (
      <span className="text-red-600" title={recipient.errorMessage}>
        Error: {recipient.errorMessage.slice(0, 30)}...
      </span>
    );
  }

  return <span>Pending</span>;
}

export const CampaignDetailRecipientsSection = memo(
  function CampaignDetailRecipientsSection({
    recipientCount,
    recipients,
    isLoading,
  }: CampaignDetailRecipientsSectionProps) {
    return (
      <DetailSection
        id="recipients"
        title={`Recipients (${recipientCount})`}
        defaultOpen={true}
      >
        {isLoading ? (
          <div className="p-4">
            <Skeleton className="h-32 w-full" />
          </div>
        ) : recipients.length === 0 ? (
          <EmptyStateContainer variant="card">
            <EmptyState
              icon={Users}
              title="No recipients yet"
              message="Recipients will be populated when the campaign is sent or scheduled."
            />
          </EmptyStateContainer>
        ) : (
          <div className="rounded-md border">
            <ScrollArea className="h-[300px]">
              <Table aria-label="Campaign recipients">
                <TableHeader>
                  <TableRow>
                    <TableHead>Recipient</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Activity</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recipients.map((recipient) => (
                    <TableRow key={recipient.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">
                            {recipient.name || "Unknown"}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {recipient.email}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <RecipientStatusBadge status={recipient.status} />
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {renderRecipientActivity(recipient)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </div>
        )}
      </DetailSection>
    );
  }
);
