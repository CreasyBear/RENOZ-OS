/**
 * Issue Detail Container
 *
 * Container component that handles data fetching and business logic for the
 * issue detail view. Follows the Container/Presenter pattern from STANDARDS.md.
 *
 * @source issue from useIssue hook
 * @source customerContext from useCustomerOrderSummary, useWarranties, useIssues hooks
 *
 * @see STANDARDS.md - Component Architecture
 * @see docs/design-system/DETAIL-VIEW-STANDARDS.md
 */

import { useEffect } from 'react';
import {
  useGenerateFeedbackToken,
  useIssueDetail,
  useIssueFeedback,
  useSubmitInternalFeedback,
} from '@/hooks/support';
import { useTrackView } from '@/hooks/search';
import { LoadingState } from '@/components/shared/loading-state';
import { ErrorState } from '@/components/shared/error-state';
import { EntityActivityLogger } from '@/components/shared/activity';
import { useEntityActivityLogging } from '@/hooks/activities/use-entity-activity-logging';
import {
  formatSupportReadError,
  isSupportReadNotFound,
} from '@/lib/support/read-error-messages';
import { IssueDetailView } from './issue-detail-view';

interface IssueDetailContainerProps {
  issueId: string;
  activeTabFromUrl: string;
  onTabChangeToUrl?: (tab: string) => void;
  escalationOpenFromUrl?: boolean;
  onEscalationDialogChangeToUrl?: (open: boolean) => void;
}

export function IssueDetailContainer({
  issueId,
  activeTabFromUrl,
  onTabChangeToUrl,
  escalationOpenFromUrl = false,
  onEscalationDialogChangeToUrl,
}: IssueDetailContainerProps) {
  const {
    issue,
    isLoading,
    error,
    customerContext,
    relatedContext,
    customerId,
    actions,
    statusDialog,
    setStatusDialog,
    escalationDialogOpen,
    setEscalationDialogOpen,
    escalationDialogMode,
    isUpdatePending,
    isDeletePending,
    onEscalate,
    isEscalatePending,
    onDeEscalate,
    isDeEscalatePending,
  } = useIssueDetail(issueId);

  const {
    data: csatFeedback,
    isLoading: isCsatFeedbackLoading,
    error: csatFeedbackError,
    refetch: refetchCsatFeedback,
  } = useIssueFeedback({ issueId });
  const generateFeedbackTokenMutation = useGenerateFeedbackToken();
  const submitInternalFeedbackMutation = useSubmitInternalFeedback();

  const { onLogActivity, loggerProps } = useEntityActivityLogging({
    entityType: 'issue',
    entityId: issueId,
    entityLabel: `Issue: ${issue?.issueNumber ?? issueId}`,
  });

  useTrackView(
    'issue',
    issue?.id,
    issue?.issueNumber ?? issue?.title ?? `Issue ${issueId.slice(0, 8)}`,
    undefined,
    `/support/issues/${issueId}`
  );

  useEffect(() => {
    if (escalationOpenFromUrl && !escalationDialogOpen) {
      setEscalationDialogOpen(true);
    }
  }, [escalationOpenFromUrl, escalationDialogOpen, setEscalationDialogOpen]);

  useEffect(() => {
    if (escalationOpenFromUrl !== escalationDialogOpen) {
      onEscalationDialogChangeToUrl?.(escalationDialogOpen);
    }
  }, [escalationDialogOpen, escalationOpenFromUrl, onEscalationDialogChangeToUrl]);

  if (isLoading) {
    return <LoadingState text="Loading issue..." />;
  }

  if (error || !issue) {
    const isNotFound = !error || isSupportReadNotFound(error);

    return (
      <ErrorState
        title={isNotFound ? 'Issue not found' : 'Unable to load issue'}
        message={
          error
            ? formatSupportReadError(
                error,
                'Issue details are temporarily unavailable. Please refresh and try again.'
              )
            : 'The requested issue could not be found.'
        }
        onRetry={actions.onRefresh}
      />
    );
  }

  const resolvedActiveTab = activeTabFromUrl;
  const handleTabChange = (tab: string) => {
    onTabChangeToUrl?.(tab);
  };
  const handleGenerateFeedbackLink = async (targetIssueId: string) => {
    const result = await generateFeedbackTokenMutation.mutateAsync({
      issueId: targetIssueId,
      expiresInDays: 7,
    });
    return { feedbackUrl: result.feedbackUrl };
  };
  const handleSubmitCsatFeedback = async (payload: {
    issueId: string;
    rating: number;
    comment: string | null;
  }) => {
    await submitInternalFeedbackMutation.mutateAsync(payload);
  };

  return (
    <>
      <IssueDetailView
        issue={issue}
        customerId={customerId}
        activeTab={resolvedActiveTab}
        onTabChange={handleTabChange}
        customerContext={customerContext}
        relatedContext={relatedContext}
        actions={actions}
        statusDialog={statusDialog}
        setStatusDialog={setStatusDialog}
        escalationDialogOpen={escalationDialogOpen}
        setEscalationDialogOpen={setEscalationDialogOpen}
        escalationDialogMode={escalationDialogMode}
        isUpdatePending={isUpdatePending}
        isDeletePending={isDeletePending}
        onEscalate={onEscalate}
        onDeEscalate={onDeEscalate}
        isEscalatePending={isEscalatePending}
        isDeEscalatePending={isDeEscalatePending}
        onLogActivity={onLogActivity}
        csatFeedback={csatFeedback ?? null}
        isCsatFeedbackLoading={isCsatFeedbackLoading}
        csatFeedbackError={csatFeedbackError instanceof Error ? csatFeedbackError : null}
        onRefreshCsatFeedback={() => {
          void refetchCsatFeedback();
        }}
        onGenerateFeedbackLink={handleGenerateFeedbackLink}
        isGeneratingFeedbackLink={generateFeedbackTokenMutation.isPending}
        onSubmitCsatFeedback={handleSubmitCsatFeedback}
        isSubmittingCsatFeedback={submitInternalFeedbackMutation.isPending}
      />

      <EntityActivityLogger {...loggerProps} />
    </>
  );
}
