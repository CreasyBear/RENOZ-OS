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
import { Link } from '@tanstack/react-router';
import {
  ChevronLeft,
  User,
  Calendar,
  Tag,
  AlertTriangle,
  ArrowDown,
  Trash2,
  MessageSquare,
  FileText,
  Package,
  PackageSearch,
  Play,
  CheckCircle,
  Pause,
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';

import { Button, buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { EntityHeader } from '@/components/shared/detail-view/entity-header';
import { ISSUE_STATUS_CONFIG } from './issue-status-config';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SlaBadge } from '@/components/domain/support/sla/sla-badge';
import { SlaStatusCard } from '@/components/domain/support/sla/sla-status-card';
import { EscalationDialog } from '@/components/domain/support/escalation/escalation-dialog';
import { IssueActivityTimelineContainer } from './issue-activity-timeline-container';
import {
  IssueStatusChangeDialog,
  type StatusChangeResult,
} from './issue-status-change-dialog';
import {
  ISSUE_NEXT_ACTION_LABELS,
  ISSUE_RESOLUTION_CATEGORY_LABELS,
} from './issue-options';
import { IssueCustomerContextSidebar } from './issue-customer-context-sidebar';
import { IssueRelatedTab } from './issue-related-tab';
import { IssueRemedyCard } from './issue-remedy-card';
import {
  getIssueDetailActionPolicy,
  type IssueDetailActionPolicy,
} from './issue-detail-action-policy';
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
  const primaryAction =
    actionPolicy.primaryAction === 'start'
      ? {
          label: 'Start Working',
          onClick: () => actions.onStatusChange('in_progress'),
          icon: <Play className="h-4 w-4" aria-hidden="true" />,
          disabled: isUpdatePending,
        }
      : actionPolicy.primaryAction === 'resolve'
        ? {
            label: 'Resolve',
            onClick: () => actions.onStatusChange('resolved'),
            icon: <CheckCircle className="h-4 w-4" aria-hidden="true" />,
            disabled: isUpdatePending,
          }
        : actionPolicy.primaryAction === 'close'
          ? {
              label: 'Close Issue',
              onClick: () => actions.onStatusChange('closed'),
              icon: <CheckCircle className="h-4 w-4" aria-hidden="true" />,
              disabled: isUpdatePending,
            }
          : undefined;

  const secondaryActions = [
    {
      label: 'Back to Issues',
      onClick: actions.onBack,
      icon: <ChevronLeft className="h-4 w-4" aria-hidden="true" />,
    },
    ...(actionPolicy.canDeEscalate
      ? [
          {
            label: 'De-escalate',
            onClick: () => actions.onStatusChange('in_progress'),
            icon: <ArrowDown className="h-4 w-4" aria-hidden="true" />,
            disabled: isUpdatePending || isDeEscalatePending,
          },
        ]
      : []),
    ...(actionPolicy.canHold
      ? [
          {
            label: 'Put On Hold',
            onClick: () => actions.onStatusChange('on_hold'),
            icon: <Pause className="h-4 w-4" aria-hidden="true" />,
            disabled: isUpdatePending,
          },
        ]
      : []),
    ...(actionPolicy.canEscalate
      ? [
          {
            label: 'Escalate',
            onClick: () => actions.onStatusChange('escalated'),
            icon: <AlertTriangle className="h-4 w-4" aria-hidden="true" />,
            disabled: isUpdatePending,
            destructive: true,
          },
        ]
      : []),
  ];

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
              <DescriptionCard description={issue.description} />
              {issue.resolution && (
                <ResolutionCard resolution={issue.resolution} />
              )}
              {issue.rmaReadiness && (
                <IssueRemedyCard
                  issueId={issue.id}
                  rmaReadiness={issue.rmaReadiness}
                />
              )}
              {issue.slaMetrics && <SlaCard slaMetrics={issue.slaMetrics} />}
              {issue.escalatedAt && (
                <EscalationCard
                  escalatedAt={issue.escalatedAt}
                  reason={issue.escalationReason}
                />
              )}
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
            <ActionsCard
              issue={issue}
              rmaReadiness={issue.rmaReadiness}
              actionPolicy={actionPolicy}
              onStatusChange={actions.onStatusChange}
              onDelete={actions.onDelete}
              isPending={isUpdatePending || isDeletePending || isDeEscalatePending}
            />
            <DetailsCard issue={issue} />
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

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

function IssueAlerts({ issue }: { issue: IssueDetail }) {
  const alerts = [];

  if (issue.slaMetrics?.responseBreached || issue.slaMetrics?.resolutionBreached) {
    alerts.push(
      <div
        key="sla-breach"
        className="flex items-center gap-3 p-3 rounded-md bg-red-50 border border-red-200 dark:bg-red-950/20 dark:border-red-900"
      >
        <AlertTriangle className="h-5 w-5 text-red-600 shrink-0" aria-hidden="true" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-red-700 dark:text-red-400">SLA Breached</p>
          <p className="text-xs text-red-600/80 dark:text-red-400/80">
            {issue.slaMetrics.responseBreached
              ? 'Response time deadline has passed'
              : 'Resolution deadline has passed'}
          </p>
        </div>
      </div>
    );
  }

  if (issue.status === 'escalated' && issue.escalatedAt && !issue.escalationReason) {
    alerts.push(
      <div
        key="escalation"
        className="flex items-center gap-3 p-3 rounded-md bg-amber-50 border border-amber-200 dark:bg-amber-950/20 dark:border-amber-900"
      >
        <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" aria-hidden="true" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-amber-700 dark:text-amber-400">Issue Escalated</p>
          <p className="text-xs text-amber-600/80 dark:text-amber-400/80">
            Escalated {formatDistanceToNow(new Date(issue.escalatedAt), { addSuffix: true })}
          </p>
        </div>
      </div>
    );
  }

  if (alerts.length === 0) return null;

  return <div className="space-y-2 mb-6">{alerts}</div>;
}

function DescriptionCard({ description }: { description: string | null }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Description</CardTitle>
      </CardHeader>
      <CardContent>
        {description ? (
          <p className="whitespace-pre-wrap text-sm">{description}</p>
        ) : (
          <p className="text-muted-foreground text-sm">No description provided</p>
        )}
      </CardContent>
    </Card>
  );
}

function ResolutionCard({
  resolution,
}: {
  resolution: NonNullable<IssueDetail['resolution']>;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Resolution</CardTitle>
        <CardDescription>
          Structured resolution details for the issue record and downstream remedy decisions.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline">
            {ISSUE_RESOLUTION_CATEGORY_LABELS[resolution.category] ?? resolution.category}
          </Badge>
          <Badge variant="secondary">
            {ISSUE_NEXT_ACTION_LABELS[resolution.nextActionType] ?? resolution.nextActionType}
          </Badge>
        </div>
        <div className="space-y-1">
          <p className="text-sm font-medium">Summary</p>
          <p className="text-sm text-muted-foreground">{resolution.summary}</p>
        </div>
        {resolution.diagnosisNotes ? (
          <div className="space-y-1">
            <p className="text-sm font-medium">Diagnosis Notes</p>
            <p className="whitespace-pre-wrap text-sm text-muted-foreground">
              {resolution.diagnosisNotes}
            </p>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function SlaCard({
  slaMetrics,
}: {
  slaMetrics: NonNullable<IssueDetail['slaMetrics']>;
}) {
  return (
    <SlaStatusCard
      slaData={{
        status: 'active',
        isPaused: false,
        responseDueAt: slaMetrics.responseDueAt ? new Date(slaMetrics.responseDueAt) : null,
        resolutionDueAt: slaMetrics.resolutionDueAt
          ? new Date(slaMetrics.resolutionDueAt)
          : null,
        responseBreached: slaMetrics.responseBreached ?? false,
        resolutionBreached: slaMetrics.resolutionBreached ?? false,
        isResponseAtRisk: slaMetrics.isResponseAtRisk ?? false,
        isResolutionAtRisk: slaMetrics.isResolutionAtRisk ?? false,
        responseTimeRemaining: null,
        resolutionTimeRemaining: null,
        responsePercentComplete: null,
        resolutionPercentComplete: null,
      }}
    />
  );
}

function EscalationCard({
  escalatedAt,
  reason,
}: {
  escalatedAt: Date | string;
  reason?: string | null;
}) {
  return (
    <Card className="border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/20">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base text-red-700 dark:text-red-400">
          <AlertTriangle className="h-4 w-4" aria-hidden="true" />
          Escalation Details
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm">
          <span className="text-muted-foreground">Escalated: </span>
          {format(new Date(escalatedAt), 'PPp')}
        </p>
        {reason && (
          <p className="mt-2 text-sm">
            <span className="text-muted-foreground">Reason: </span>
            {reason}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function ActionsCard({
  issue,
  rmaReadiness,
  actionPolicy,
  onStatusChange,
  onDelete,
  isPending,
}: {
  issue: IssueDetail;
  rmaReadiness?: IssueDetail['rmaReadiness'];
  actionPolicy: IssueDetailActionPolicy;
  onStatusChange: (status: IssueStatus) => void;
  onDelete: () => void | Promise<void>;
  isPending: boolean;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Actions</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {actionPolicy.showRmaSection && (
          <>
            {rmaReadiness?.state === 'ready' && rmaReadiness.sourceOrder ? (
              <Link
                to="/orders/$orderId"
                params={{ orderId: rmaReadiness.sourceOrder.id }}
                search={{ fromIssueId: issue.id }}
                className={cn(buttonVariants({ variant: 'default', size: 'sm' }), 'gap-2 w-full justify-center')}
              >
                <PackageSearch className="h-4 w-4" aria-hidden="true" />
                Create RMA
              </Link>
            ) : (
              <div className="space-y-2">
                <Button size="sm" disabled className="w-full gap-2">
                  <PackageSearch className="h-4 w-4" aria-hidden="true" />
                  Create RMA
                </Button>
                <p className="text-xs text-muted-foreground">
                  {rmaReadiness?.blockedReason ??
                    'Resolve the source order before creating an RMA.'}
                </p>
              </div>
            )}
            <Separator className="my-2" />
          </>
        )}
        {(actionPolicy.canStart ||
          actionPolicy.canDeEscalate ||
          actionPolicy.canHold ||
          actionPolicy.canEscalate ||
          actionPolicy.canResolve) && (
          <>
            {(actionPolicy.canStart || actionPolicy.canDeEscalate) && (
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => onStatusChange('in_progress')}
                disabled={isPending}
              >
                {actionPolicy.canDeEscalate ? (
                  <ArrowDown className="h-4 w-4" aria-hidden="true" />
                ) : null}
                {actionPolicy.canDeEscalate ? 'De-escalate' : 'Start Working'}
              </Button>
            )}
            {actionPolicy.canHold && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onStatusChange('on_hold')}
                disabled={isPending}
              >
                Put On Hold
              </Button>
            )}
            {actionPolicy.canEscalate && (
              <Button
                variant="outline"
                size="sm"
                className="text-red-600 hover:text-red-700"
                onClick={() => onStatusChange('escalated')}
                disabled={isPending}
              >
                Escalate
              </Button>
            )}
            {actionPolicy.canResolve && (
              <Button size="sm" onClick={() => onStatusChange('resolved')} disabled={isPending}>
                Resolve
              </Button>
            )}
          </>
        )}
        {actionPolicy.canClose && (
          <Button size="sm" onClick={() => onStatusChange('closed')} disabled={isPending}>
            Close Issue
          </Button>
        )}

        {actionPolicy.canDelete && (
          <>
            <Separator className="my-2" />
            <Button
              variant="destructive"
              size="sm"
              onClick={onDelete}
              disabled={isPending}
              className="gap-2"
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
              Delete Issue
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function DetailsCard({ issue }: { issue: IssueDetail }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Details</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="flex items-center gap-2">
          <User className="text-muted-foreground h-4 w-4" aria-hidden="true" />
          <span className="text-muted-foreground">Assignee:</span>
          <span>{issue.assignedTo?.name ?? 'Unassigned'}</span>
        </div>

        <Separator />

        <div className="flex items-center gap-2">
          <Calendar className="text-muted-foreground h-4 w-4" aria-hidden="true" />
          <span className="text-muted-foreground">Created:</span>
          <span>{formatDistanceToNow(new Date(issue.createdAt), { addSuffix: true })}</span>
        </div>

        <div className="flex items-center gap-2">
          <Calendar className="text-muted-foreground h-4 w-4" aria-hidden="true" />
          <span className="text-muted-foreground">Updated:</span>
          <span>{formatDistanceToNow(new Date(issue.updatedAt), { addSuffix: true })}</span>
        </div>

        {issue.resolvedAt && (
          <div className="flex items-center gap-2">
            <Calendar className="text-muted-foreground h-4 w-4" aria-hidden="true" />
            <span className="text-muted-foreground">Resolved:</span>
            <span>{formatDistanceToNow(new Date(issue.resolvedAt), { addSuffix: true })}</span>
          </div>
        )}

        <Separator />

        <div className="flex items-center gap-2">
          <Tag className="text-muted-foreground h-4 w-4" aria-hidden="true" />
          <span className="text-muted-foreground">Type:</span>
          <span>{TYPE_LABELS[issue.type]}</span>
        </div>
      </CardContent>
    </Card>
  );
}
