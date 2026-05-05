/**
 * Issue Detail View
 *
 * Pure UI component for issue details. Receives all data via props.
 * Follows 5-Zone Detail View pattern per DETAIL-VIEW-STANDARDS.md.
 *
 * Zones:
 * 1. Header - Identity + Status + Key Actions
 * 2. (Skipped - Support is reactive, not procedural)
 * 3. Alerts - SLA breaches, escalations
 * 4. Tabs - Activity, Internal Notes, Related Warranties
 * 5. Main Content + Sidebar - Description + Customer Context
 *
 * @see docs/design-system/DETAIL-VIEW-STANDARDS.md
 */
import { AlertTriangle, MessageSquare, FileText, Package } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { EntityHeader } from '@/components/shared/detail-view/entity-header';
import { ISSUE_STATUS_CONFIG } from './issue-status-config';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SlaBadge } from '@/components/domain/support/sla/sla-badge';
import { EscalationDialog } from '@/components/domain/support/escalation/escalation-dialog';
import { IssueActivityTimelineContainer } from './issue-activity-timeline-container';
import {
  IssueStatusChangeDialog,
  type StatusChangeResult,
} from './issue-status-change-dialog';
import { IssueActionsCard } from './issue-actions-card';
import { IssueCustomerContextSidebar } from './issue-customer-context-sidebar';
import { IssueAlerts, IssueDetailsCard, IssueOverviewTab } from './issue-display-cards';
import { getIssueHeaderActions } from './issue-header-actions';
import { IssueRelatedTab } from './issue-related-tab';
import { getIssueDetailActionPolicy } from './issue-detail-action-policy';
import { CsatDisplayCard } from '@/components/domain/support/csat';
import type {
  IssueStatus,
  IssuePriority,
  IssueType,
  IssueDetail,
  IssueRelatedContext,
} from '@/lib/schemas/support/issues';
import type {
  CustomerContextData,
  EscalationDialogMode,
  IssueDetailActions,
} from '@/hooks/support';
import type { CsatResponseResponse } from '@/lib/schemas/support/csat-responses';

// ============================================================================
// CONSTANTS
// ============================================================================

const PRIORITY_COLORS: Record<IssuePriority, string> = {
  low: 'bg-slate-400/10 text-slate-500 border-slate-400/20',
  medium: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  high: 'bg-orange-500/10 text-orange-600 border-orange-500/20',
  critical: 'bg-red-500/10 text-red-600 border-red-500/20',
};

const TYPE_LABELS: Record<IssueType, string> = {
  hardware_fault: 'Hardware Fault',
  software_firmware: 'Software/Firmware',
  installation_defect: 'Installation Defect',
  performance_degradation: 'Performance Degradation',
  connectivity: 'Connectivity',
  other: 'Other',
};

// ============================================================================
// TYPES
// ============================================================================

interface IssueDetailViewProps {
  issue: IssueDetail;
  customerId: string | null;
  activeTab: string;
  onTabChange: (tab: string) => void;
  customerContext: CustomerContextData;
  relatedContext: IssueRelatedContext | null;
  actions: IssueDetailActions;
  statusDialog: { open: boolean; toStatus: IssueStatus } | null;
  setStatusDialog: (dialog: { open: boolean; toStatus: IssueStatus } | null) => void;
  escalationDialogOpen: boolean;
  setEscalationDialogOpen: (open: boolean) => void;
  escalationDialogMode: EscalationDialogMode;
  isUpdatePending: boolean;
  isDeletePending: boolean;
  onEscalate: (reason: string, escalateToUserId?: string) => Promise<void>;
  onDeEscalate: (reason: string, assignToUserId?: string) => Promise<void>;
  isEscalatePending: boolean;
  isDeEscalatePending: boolean;
  /** Handler to open activity logging dialog */
  onLogActivity?: () => void;
  /** From IssueDetailContainer (useIssueFeedback). */
  csatFeedback?: CsatResponseResponse | null;
  /** From IssueDetailContainer (useIssueFeedback). */
  isCsatFeedbackLoading?: boolean;
  /** From IssueDetailContainer (useIssueFeedback). */
  csatFeedbackError?: Error | null;
  /** From IssueDetailContainer (useIssueFeedback). */
  onRefreshCsatFeedback?: () => void;
  /** From IssueDetailContainer (useGenerateFeedbackToken). */
  onGenerateFeedbackLink?: (issueId: string) => Promise<{ feedbackUrl: string }>;
  /** From IssueDetailContainer (useGenerateFeedbackToken). */
  isGeneratingFeedbackLink?: boolean;
  /** From IssueDetailContainer (useSubmitInternalFeedback). */
  onSubmitCsatFeedback?: (payload: {
    issueId: string;
    rating: number;
    comment: string | null;
  }) => Promise<void>;
  /** From IssueDetailContainer (useSubmitInternalFeedback). */
  isSubmittingCsatFeedback?: boolean;
}

// ============================================================================
// VIEW COMPONENT
// ============================================================================

export function IssueDetailView({
  issue,
  customerId,
  activeTab,
  onTabChange,
  customerContext,
  relatedContext,
  actions,
  statusDialog,
  setStatusDialog,
  escalationDialogOpen,
  setEscalationDialogOpen,
  escalationDialogMode,
  isUpdatePending,
  isDeletePending,
  onEscalate,
  onDeEscalate,
  isEscalatePending,
  isDeEscalatePending,
  onLogActivity,
  csatFeedback,
  isCsatFeedbackLoading,
  csatFeedbackError,
  onRefreshCsatFeedback,
  onGenerateFeedbackLink,
  isGeneratingFeedbackLink,
  onSubmitCsatFeedback,
  isSubmittingCsatFeedback,
}: IssueDetailViewProps) {
  const slaStatus = issue.slaMetrics
    ? issue.slaMetrics.responseBreached || issue.slaMetrics.resolutionBreached
      ? 'breached'
      : issue.slaMetrics.isResponseAtRisk || issue.slaMetrics.isResolutionAtRisk
        ? 'at_risk'
        : 'on_track'
    : null;

  const actionPolicy = getIssueDetailActionPolicy({
    status: issue.status,
    hasRmaAnchor: Boolean(
      customerId ||
        issue.warrantyId ||
        issue.warrantyEntitlementId ||
        issue.orderId ||
        issue.serialNumber
    ),
  });
  const { primaryAction, secondaryActions } = getIssueHeaderActions({
    actionPolicy,
    onBack: actions.onBack,
    onStatusChange: actions.onStatusChange,
    isUpdatePending,
    isDeEscalatePending,
  });

  return (
    <div className="space-y-6">
      {/* Zone 1: Header — EntityHeader for consistency with warranty/customers */}
      <EntityHeader
          name={issue.issueNumber}
          subtitle={issue.title}
          avatarFallback="I"
          status={{
            value: issue.status,
            config: ISSUE_STATUS_CONFIG,
          }}
          typeBadge={
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className={PRIORITY_COLORS[issue.priority]}>
                {issue.priority}
              </Badge>
              <Badge variant="outline">{TYPE_LABELS[issue.type]}</Badge>
              {slaStatus && <SlaBadge status={slaStatus} />}
              {issue.status === 'escalated' && (
                <Badge variant="destructive" className="gap-1">
                  <AlertTriangle className="h-3 w-3" aria-hidden="true" />
                  Escalated
                </Badge>
              )}
            </div>
          }
          primaryAction={primaryAction}
          secondaryActions={secondaryActions}
          onDelete={actionPolicy.canDelete ? actions.onDelete : undefined}
        />

      {/* Zone 3: Alerts */}
      <IssueAlerts issue={issue} />

      {/* Zone 4: Tabs */}
      <Tabs value={activeTab} onValueChange={onTabChange} className="space-y-6">
        <TabsList className="w-full justify-start">
          <TabsTrigger value="overview" className="gap-2">
            <FileText className="h-4 w-4" aria-hidden="true" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="activity" className="gap-2">
            <MessageSquare className="h-4 w-4" aria-hidden="true" />
            Activity
          </TabsTrigger>
          <TabsTrigger value="related" className="gap-2">
            <Package className="h-4 w-4" aria-hidden="true" />
            Related
          </TabsTrigger>
        </TabsList>

        {/* Zone 5: Main + Sidebar */}
        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <main className="min-w-0 space-y-6">
            <TabsContent value="overview" className="mt-0 space-y-6">
              <IssueOverviewTab issue={issue} />
            </TabsContent>

            <TabsContent value="activity" className="mt-0">
              <IssueActivityTimelineContainer issueId={issue.id} onLogActivity={onLogActivity} />
            </TabsContent>

            <TabsContent value="related" className="mt-0">
              <IssueRelatedTab
                customerId={customerId}
                supportContext={issue.supportContext}
                relatedContext={relatedContext}
              />
            </TabsContent>
          </main>

          <aside className="space-y-4 lg:sticky lg:top-4 lg:self-start z-10">
            <IssueActionsCard
              issueId={issue.id}
              rmaReadiness={issue.rmaReadiness}
              actionPolicy={actionPolicy}
              onStatusChange={actions.onStatusChange}
              onDelete={actions.onDelete}
              isPending={isUpdatePending || isDeletePending || isDeEscalatePending}
            />
            <IssueDetailsCard issue={issue} typeLabel={TYPE_LABELS[issue.type]} />
            {onSubmitCsatFeedback ? (
              <CsatDisplayCard
                issueId={issue.id}
                issueTitle={issue.title}
                issueStatus={issue.status}
                feedback={csatFeedback ?? null}
                isLoading={isCsatFeedbackLoading}
                error={csatFeedbackError}
                onRefresh={onRefreshCsatFeedback}
                onGenerateFeedbackLink={onGenerateFeedbackLink}
                isGeneratingLink={isGeneratingFeedbackLink}
                onSubmitFeedback={onSubmitCsatFeedback}
                isSubmittingFeedback={isSubmittingCsatFeedback}
              />
            ) : null}
            {customerId && (
              <IssueCustomerContextSidebar
                customerId={customerId}
                customerName={issue.customer?.name ?? null}
                contextData={customerContext}
              />
            )}
          </aside>
        </div>
      </Tabs>

      {/* Dialogs */}
      {statusDialog && (
        <IssueStatusChangeDialog
          open={statusDialog.open}
          onOpenChange={(open) => {
            if (!open) setStatusDialog(null);
          }}
          issueTitle={issue.title}
          fromStatus={issue.status}
          toStatus={statusDialog.toStatus}
          isPending={isUpdatePending}
          onConfirm={(result: StatusChangeResult) => {
            actions.onStatusConfirm(result);
          }}
        />
      )}

      <EscalationDialog
        open={escalationDialogOpen}
        onOpenChange={setEscalationDialogOpen}
        isEscalated={escalationDialogMode === 'de_escalate'}
        onEscalate={onEscalate}
        onDeEscalate={onDeEscalate}
        isPending={isEscalatePending || isDeEscalatePending}
      />
    </div>
  );
}
