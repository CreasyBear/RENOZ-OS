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
  TicketIcon,
  User,
  Calendar,
  Tag,
  AlertTriangle,
  Trash2,
  MessageSquare,
  FileText,
  Shield,
  Package,
  ExternalLink,
  PackageSearch,
  Play,
  CheckCircle,
  Pause,
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';

import { Button, buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { EntityHeader } from '@/components/shared';
import { ISSUE_STATUS_CONFIG } from './issue-status-config';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SlaBadge } from '@/components/domain/support';
import { SlaStatusCard } from '@/components/domain/support';
import { EscalationDialog } from '@/components/domain/support';
import { IssueActivityTimelineContainer } from './issue-activity-timeline-container';
import {
  IssueStatusChangeDialog,
  type StatusChangeResult,
} from './issue-status-change-dialog';
import { formatDate } from '@/lib/formatters';
import type {
  IssueStatus,
  IssuePriority,
  IssueType,
  IssueDetail,
} from '@/lib/schemas/support/issues';
import type { CustomerContextData, IssueDetailActions } from '@/hooks/support';

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
  actions: IssueDetailActions;
  statusDialog: { open: boolean; toStatus: IssueStatus } | null;
  setStatusDialog: (dialog: { open: boolean; toStatus: IssueStatus } | null) => void;
  escalationDialogOpen: boolean;
  setEscalationDialogOpen: (open: boolean) => void;
  isUpdatePending: boolean;
  isDeletePending: boolean;
  onEscalate: (reason: string, escalateToUserId?: string) => Promise<void>;
  isEscalatePending: boolean;
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
  actions,
  statusDialog,
  setStatusDialog,
  escalationDialogOpen,
  setEscalationDialogOpen,
  isUpdatePending,
  isDeletePending,
  onEscalate,
  isEscalatePending,
  onLogActivity,
}: IssueDetailViewProps) {
  const slaStatus = issue.slaMetrics
    ? issue.slaMetrics.responseBreached || issue.slaMetrics.resolutionBreached
      ? 'breached'
      : issue.slaMetrics.isResponseAtRisk || issue.slaMetrics.isResolutionAtRisk
        ? 'at_risk'
        : 'on_track'
    : null;

  const isResolvedOrClosed = issue.status === 'resolved' || issue.status === 'closed';
  const primaryAction =
    !isResolvedOrClosed && issue.status !== 'in_progress' && issue.status !== 'escalated'
      ? {
          label: 'Start Working',
          onClick: () => actions.onStatusChange('in_progress'),
          icon: <Play className="h-4 w-4" aria-hidden="true" />,
          disabled: isUpdatePending,
        }
      : !isResolvedOrClosed
        ? {
            label: 'Resolve',
            onClick: () => actions.onStatusChange('resolved'),
            icon: <CheckCircle className="h-4 w-4" aria-hidden="true" />,
            disabled: isUpdatePending,
          }
        : issue.status === 'resolved'
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
    ...(issue.status !== 'on_hold' && !isResolvedOrClosed
      ? [
          {
            label: 'Put On Hold',
            onClick: () => actions.onStatusChange('on_hold'),
            icon: <Pause className="h-4 w-4" aria-hidden="true" />,
            disabled: isUpdatePending,
          },
        ]
      : []),
    ...(issue.status !== 'escalated' && !isResolvedOrClosed
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

  const showDelete =
    issue.status !== 'in_progress' && issue.status !== 'escalated';

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
              {issue.escalatedAt && (
                <Badge variant="destructive" className="gap-1">
                  <AlertTriangle className="h-3 w-3" aria-hidden="true" />
                  Escalated
                </Badge>
              )}
            </div>
          }
          primaryAction={primaryAction}
          secondaryActions={secondaryActions}
          onDelete={showDelete ? actions.onDelete : undefined}
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
              <RelatedTab
                customerId={customerId}
                warrantyId={issue.warrantyId}
                contextData={customerContext}
              />
            </TabsContent>
          </main>

          <aside className="space-y-4 lg:sticky lg:top-4 lg:self-start z-10">
            <ActionsCard
              issue={issue}
              customerId={customerId ?? null}
              onStatusChange={actions.onStatusChange}
              onDelete={actions.onDelete}
              isPending={isUpdatePending || isDeletePending}
            />
            <DetailsCard issue={issue} />
            {customerId && (
              <CustomerContextSidebar
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
          onConfirm={(result: StatusChangeResult) => {
            actions.onStatusConfirm(result);
          }}
        />
      )}

      <EscalationDialog
        open={escalationDialogOpen}
        onOpenChange={setEscalationDialogOpen}
        onEscalate={onEscalate}
        isPending={isEscalatePending}
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

  if (issue.escalatedAt && !issue.escalationReason) {
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

function RelatedTab({
  customerId,
  warrantyId,
  contextData,
}: {
  customerId?: string | null;
  warrantyId?: string | null;
  contextData: CustomerContextData;
}) {
  return (
    <div className="space-y-6">
      {warrantyId && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="h-4 w-4" aria-hidden="true" />
              Linked Warranty
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Link
              to="/support/warranties/$warrantyId"
              params={{ warrantyId }}
              className="text-primary hover:underline"
            >
              View Warranty
            </Link>
          </CardContent>
        </Card>
      )}

      {customerId && (
        <>
          <RelatedOrdersSection
            data={contextData.orderSummary}
            isLoading={contextData.isLoading}
            error={contextData.error}
          />
          <RelatedWarrantiesSection
            warranties={contextData.warranties}
            isLoading={contextData.isLoading}
            error={contextData.error}
          />
          <RelatedIssuesSection
            issues={contextData.otherIssues}
            isLoading={contextData.isLoading}
            error={contextData.error}
          />
        </>
      )}
    </div>
  );
}

function ActionsCard({
  issue,
  customerId,
  onStatusChange,
  onDelete,
  isPending,
}: {
  issue: IssueDetail;
  customerId: string | null;
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
        {(issue.status === 'resolved' || issue.status === 'closed') && customerId && (
          <>
            <Link
              to="/orders"
              search={{ customerId, fromIssueId: issue.id }}
              className={cn(buttonVariants({ variant: 'default', size: 'sm' }), 'gap-2 w-full justify-center')}
            >
              <PackageSearch className="h-4 w-4" aria-hidden="true" />
              Create RMA
            </Link>
            <Separator className="my-2" />
          </>
        )}
        {issue.status !== 'closed' && issue.status !== 'resolved' && (
          <>
            {issue.status !== 'in_progress' && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onStatusChange('in_progress')}
                disabled={isPending}
              >
                Start Working
              </Button>
            )}
            {issue.status !== 'on_hold' && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onStatusChange('on_hold')}
                disabled={isPending}
              >
                Put On Hold
              </Button>
            )}
            {issue.status !== 'escalated' && (
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
            <Button size="sm" onClick={() => onStatusChange('resolved')} disabled={isPending}>
              Resolve
            </Button>
          </>
        )}
        {issue.status === 'resolved' && (
          <Button size="sm" onClick={() => onStatusChange('closed')} disabled={isPending}>
            Close Issue
          </Button>
        )}

        {issue.status !== 'in_progress' && issue.status !== 'escalated' && (
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

function CustomerContextSidebar({
  customerId,
  customerName,
  contextData,
}: {
  customerId: string;
  customerName: string | null | undefined;
  contextData: CustomerContextData;
}) {
  return (
    <div className="space-y-4">
      <CustomerInfoCard customerId={customerId} customerName={customerName} />
      <CustomerOrdersCard
        data={contextData.orderSummary}
        isLoading={contextData.isLoading}
        error={contextData.error}
      />
      <CustomerWarrantiesCard
        warranties={contextData.warranties}
        isLoading={contextData.isLoading}
        error={contextData.error}
      />
      <CustomerIssuesCard
        issues={contextData.otherIssues}
        isLoading={contextData.isLoading}
        error={contextData.error}
      />
    </div>
  );
}

function CustomerInfoCard({
  customerId,
  customerName,
}: {
  customerId: string;
  customerName: string | null | undefined;
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <User className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          Customer
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <Link
              to="/customers/$customerId"
              params={{ customerId }}
              search={{}}
              className="font-medium hover:underline text-primary truncate block"
            >
              {customerName || 'Unknown Customer'}
            </Link>
            <p className="text-xs text-muted-foreground mt-1">ID: {customerId.slice(0, 8)}...</p>
          </div>
          <Link
            to="/customers/$customerId"
            params={{ customerId }}
            search={{}}
            className={cn(buttonVariants({ variant: 'ghost', size: 'icon' }), 'h-11 w-11 shrink-0')}
            aria-label="View customer details"
          >
            <ExternalLink className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

function CustomerOrdersCard({
  data,
  isLoading,
  error,
}: {
  data: CustomerContextData['orderSummary'];
  isLoading: boolean;
  error: Error | null;
}) {
  const recentOrders = data?.recentOrders?.slice(0, 3) || [];
  const totalOrders = data?.totalOrders ?? 0;

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Package className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            Recent Orders
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex items-center justify-center py-4">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" role="status" aria-label="Loading" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Package className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            Recent Orders
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <p className="text-sm text-red-600 py-2">Failed to load orders</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Package className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          Recent Orders
          <Badge variant="secondary" className="text-xs">
            {totalOrders}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {recentOrders.length === 0 ? (
          <p className="text-sm text-muted-foreground py-2">No orders found</p>
        ) : (
          <div className="space-y-2">
            {recentOrders.map((order) => (
              <RelatedEntityLink
                key={order.id}
                to="/orders/$orderId"
                params={{ orderId: order.id }}
                title={order.orderNumber}
                subtitle={order.orderDate ? formatDate(order.orderDate) : 'No date'}
                badge={order.status}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function CustomerWarrantiesCard({
  warranties,
  isLoading,
  error,
}: {
  warranties: CustomerContextData['warranties'];
  isLoading: boolean;
  error: Error | null;
}) {
  const activeWarranties = warranties.filter(
    (w) => w.status === 'active' || w.status === 'expiring_soon'
  );

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Shield className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            Warranties
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex items-center justify-center py-4">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" role="status" aria-label="Loading" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Shield className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            Warranties
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <p className="text-sm text-red-600 py-2">Failed to load warranties</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Shield className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          Warranties
          {activeWarranties.length > 0 && (
            <Badge variant="secondary" className="text-xs">
              {activeWarranties.length} active
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {warranties.length === 0 ? (
          <p className="text-sm text-muted-foreground py-2">No warranties found</p>
        ) : (
          <div className="space-y-2">
            {warranties.slice(0, 3).map((warranty) => (
              <RelatedEntityLink
                key={warranty.id}
                to="/support/warranties/$warrantyId"
                params={{ warrantyId: warranty.id }}
                title={warranty.productName || 'Unknown Product'}
                subtitle={`SN: ${warranty.productSerial || 'N/A'}`}
                badge={warranty.status}
                badgeVariant={getWarrantyBadgeVariant(warranty.status)}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function CustomerIssuesCard({
  issues,
  isLoading,
  error,
}: {
  issues: CustomerContextData['otherIssues'];
  isLoading: boolean;
  error: Error | null;
}) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <TicketIcon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            Previous Issues
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex items-center justify-center py-4">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" role="status" aria-label="Loading" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <TicketIcon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            Previous Issues
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <p className="text-sm text-red-600 py-2">Failed to load issues</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <TicketIcon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          Previous Issues
          {issues.length > 0 && (
            <Badge variant="secondary" className="text-xs">
              {issues.length}+
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {issues.length === 0 ? (
          <p className="text-sm text-muted-foreground py-2">No previous issues</p>
        ) : (
          <div className="space-y-2">
            {issues.slice(0, 3).map((issue) => (
              <RelatedEntityLink
                key={issue.id}
                to="/support/issues/$issueId"
                params={{ issueId: issue.id }}
                title={issue.title}
                subtitle={issue.createdAt ? formatDate(issue.createdAt) : ''}
                badge={issue.status}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function RelatedOrdersSection({
  data,
  isLoading,
  error,
}: {
  data: CustomerContextData['orderSummary'];
  isLoading: boolean;
  error: Error | null;
}) {
  const recentOrders = data?.recentOrders?.slice(0, 5) || [];
  const totalOrders = data?.totalOrders ?? 0;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Package className="h-4 w-4" aria-hidden="true" />
            Customer Orders
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-4">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" role="status" aria-label="Loading" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Package className="h-4 w-4" aria-hidden="true" />
            Customer Orders
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-red-600">Failed to load orders</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Package className="h-4 w-4" aria-hidden="true" />
          Customer Orders
          <Badge variant="secondary">{totalOrders}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {recentOrders.length === 0 ? (
          <p className="text-sm text-muted-foreground">No orders found for this customer</p>
        ) : (
          <div className="space-y-2">
            {recentOrders.map((order) => (
              <RelatedEntityLink
                key={order.id}
                to="/orders/$orderId"
                params={{ orderId: order.id }}
                title={order.orderNumber}
                subtitle={order.orderDate ? formatDate(order.orderDate) : 'No date'}
                badge={order.status}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function RelatedWarrantiesSection({
  warranties,
  isLoading,
  error,
}: {
  warranties: CustomerContextData['warranties'];
  isLoading: boolean;
  error: Error | null;
}) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="h-4 w-4" aria-hidden="true" />
            Customer Warranties
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-4">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" role="status" aria-label="Loading" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="h-4 w-4" aria-hidden="true" />
            Customer Warranties
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-red-600">Failed to load warranties</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Shield className="h-4 w-4" aria-hidden="true" />
          Customer Warranties
          <Badge variant="secondary">{warranties.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {warranties.length === 0 ? (
          <p className="text-sm text-muted-foreground">No warranties found for this customer</p>
        ) : (
          <div className="space-y-2">
            {warranties.slice(0, 5).map((warranty) => (
              <RelatedEntityLink
                key={warranty.id}
                to="/support/warranties/$warrantyId"
                params={{ warrantyId: warranty.id }}
                title={warranty.productName || 'Unknown Product'}
                subtitle={`SN: ${warranty.productSerial || 'N/A'}`}
                badge={warranty.status}
                badgeVariant={getWarrantyBadgeVariant(warranty.status)}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function RelatedIssuesSection({
  issues,
  isLoading,
  error,
}: {
  issues: CustomerContextData['otherIssues'];
  isLoading: boolean;
  error: Error | null;
}) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <TicketIcon className="h-4 w-4" aria-hidden="true" />
            Other Issues from Customer
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-4">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" role="status" aria-label="Loading" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <TicketIcon className="h-4 w-4" aria-hidden="true" />
            Other Issues from Customer
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-red-600">Failed to load issues</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <TicketIcon className="h-4 w-4" aria-hidden="true" />
          Other Issues from Customer
          {issues.length > 0 && <Badge variant="secondary">{issues.length}+</Badge>}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {issues.length === 0 ? (
          <p className="text-sm text-muted-foreground">No other issues from this customer</p>
        ) : (
          <div className="space-y-2">
            {issues.slice(0, 5).map((issue) => (
              <RelatedEntityLink
                key={issue.id}
                to="/support/issues/$issueId"
                params={{ issueId: issue.id }}
                title={issue.title}
                subtitle={issue.createdAt ? formatDate(issue.createdAt) : ''}
                badge={issue.status}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface RelatedEntityLinkProps {
  to: string;
  params: Record<string, string>;
  title: string;
  subtitle?: string;
  badge?: string;
  badgeVariant?: 'default' | 'secondary' | 'destructive' | 'outline';
}

function RelatedEntityLink({
  to,
  params,
  title,
  subtitle,
  badge,
  badgeVariant = 'outline',
}: RelatedEntityLinkProps) {
  return (
    <Link
      to={to}
      params={params}
      className="flex items-center justify-between p-2 rounded-md hover:bg-muted transition-colors group cursor-pointer"
    >
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium truncate">{title}</p>
        {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-2">
        {badge && (
          <Badge variant={badgeVariant} className="text-xs shrink-0 capitalize">
            {badge}
          </Badge>
        )}
        <ExternalLink className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 motion-safe:transition-opacity" aria-hidden="true" />
      </div>
    </Link>
  );
}

function getWarrantyBadgeVariant(status: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'active':
      return 'default';
    case 'expiring_soon':
      return 'secondary';
    case 'expired':
      return 'destructive';
    default:
      return 'outline';
  }
}
