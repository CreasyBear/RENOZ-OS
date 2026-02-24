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
import { useIssueDetail } from '@/hooks/support';
import { useTrackView } from '@/hooks/search';
import { LoadingState } from '@/components/shared/loading-state';
import { ErrorState } from '@/components/shared/error-state';
import { EntityActivityLogger } from '@/components/shared/activity';
import { useEntityActivityLogging } from '@/hooks/activities/use-entity-activity-logging';
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
    customerId,
    actions,
    statusDialog,
    setStatusDialog,
    escalationDialogOpen,
    setEscalationDialogOpen,
    isUpdatePending,
    isDeletePending,
    onEscalate,
    isEscalatePending,
  } = useIssueDetail(issueId);

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
    return (
      <ErrorState
        title="Failed to load issue"
        message={error instanceof Error ? error.message : 'Issue not found'}
        onRetry={actions.onRefresh}
      />
    );
  }

  const resolvedActiveTab = activeTabFromUrl;
  const handleTabChange = (tab: string) => {
    onTabChangeToUrl?.(tab);
  };

  return (
    <>
      <IssueDetailView
        issue={issue}
        customerId={customerId}
        activeTab={resolvedActiveTab}
        onTabChange={handleTabChange}
        customerContext={customerContext}
        actions={actions}
        statusDialog={statusDialog}
        setStatusDialog={setStatusDialog}
        escalationDialogOpen={escalationDialogOpen}
        setEscalationDialogOpen={setEscalationDialogOpen}
        isUpdatePending={isUpdatePending}
        isDeletePending={isDeletePending}
        onEscalate={onEscalate}
        isEscalatePending={isEscalatePending}
        onLogActivity={onLogActivity}
      />

      <EntityActivityLogger {...loggerProps} />
    </>
  );
}
