import { memo } from "react";
import { AlertTriangle, ArrowLeft } from "lucide-react";
import { EmptyState, EmptyStateContainer } from "@/components/shared/empty-state";
import {
  COMMUNICATION_READ_MESSAGES,
  formatCommunicationReadError,
} from "@/lib/communications/read-error-messages";

interface CampaignDetailUnavailableStateProps {
  error: unknown;
  onBack?: () => void;
}

export const CampaignDetailUnavailableState = memo(
  function CampaignDetailUnavailableState({
    error,
    onBack,
  }: CampaignDetailUnavailableStateProps) {
    return (
      <EmptyStateContainer variant="page">
        <EmptyState
          icon={AlertTriangle}
          title="Campaign not found"
          message={formatCommunicationReadError(
            error,
            COMMUNICATION_READ_MESSAGES.campaignDetails
          )}
          primaryAction={
            onBack
              ? {
                  label: "Back to campaigns",
                  onClick: onBack,
                  icon: ArrowLeft,
                }
              : undefined
          }
        />
      </EmptyStateContainer>
    );
  }
);
