/**
 * Issue Detail Page
 *
 * Displays issue details with SLA tracking, activities, and workflow actions.
 *
 * @see _Initiation/_prd/2-domains/support/support.prd.json - DOM-SUP-001b, DOM-SUP-008
 */
import { createFileRoute, Link } from '@tanstack/react-router';
import { RouteErrorFallback } from '@/components/layout';
import { SupportDetailSkeleton } from '@/components/skeletons/support';
import { ChevronLeft, TicketIcon, User, Calendar, Tag, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow, format } from 'date-fns';

import { PageLayout } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { LoadingState } from '@/components/shared/loading-state';
import { ErrorState } from '@/components/shared/error-state';
import { SlaBadge } from '@/components/domain/support';
import { SlaStatusCard } from '@/components/domain/support';
import { EscalationDialog } from '@/components/domain/support';
import {
  IssueStatusChangeDialog,
  type StatusChangeResult,
  type IssueStatus as DialogIssueStatus,
} from '@/components/domain/support';
import { useIssue, useUpdateIssue } from '@/hooks/support';
import type { IssueStatus, IssuePriority, IssueType } from '@/lib/schemas/support/issues';
import { useState } from 'react';

// ============================================================================
// ROUTE
// ============================================================================

export const Route = createFileRoute('/_authenticated/support/issues/$issueId')({
  component: IssueDetailPage,
  errorComponent: ({ error }) => (
    <RouteErrorFallback error={error} parentRoute="/support/issues" />
  ),
  pendingComponent: () => (
    <PageLayout variant="full-width">
      <PageLayout.Header
        title="Issue Details"
        description="Loading issue information..."
      />
      <PageLayout.Content>
        <SupportDetailSkeleton />
      </PageLayout.Content>
    </PageLayout>
  ),
});

// ============================================================================
// STATUS/PRIORITY COLORS
// ============================================================================

const STATUS_COLORS: Record<IssueStatus, string> = {
  open: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  in_progress: 'bg-purple-500/10 text-purple-600 border-purple-500/20',
  pending: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  on_hold: 'bg-slate-500/10 text-slate-600 border-slate-500/20',
  escalated: 'bg-red-500/10 text-red-600 border-red-500/20',
  resolved: 'bg-green-500/10 text-green-600 border-green-500/20',
  closed: 'bg-slate-400/10 text-slate-500 border-slate-400/20',
};

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

// Issue detail type
interface IssueDetail {
  id: string;
  issueNumber: string;
  title: string;
  description: string | null;
  status: IssueStatus;
  priority: IssuePriority;
  type: IssueType;
  createdAt: Date | string;
  updatedAt: Date | string;
  resolvedAt?: Date | string | null;
  customer?: { id: string; name: string } | null;
  assignedTo?: { id: string; name: string } | null;
  slaMetrics?: {
    responseDueAt?: Date | string | null;
    resolutionDueAt?: Date | string | null;
    responseBreached?: boolean;
    resolutionBreached?: boolean;
    isResponseAtRisk?: boolean;
    isResolutionAtRisk?: boolean;
  } | null;
  escalatedAt?: Date | string | null;
  escalationReason?: string | null;
}

// ============================================================================
// COMPONENT
// ============================================================================

function IssueDetailPage() {
  const { issueId } = Route.useParams();
  const [statusDialog, setStatusDialog] = useState<{
    open: boolean;
    toStatus: DialogIssueStatus;
  } | null>(null);
  const [escalationDialogOpen, setEscalationDialogOpen] = useState(false);

  // Fetch issue detail
  const { data, isLoading, error, refetch } = useIssue({ issueId });
  const issue = data as IssueDetail | undefined;

  // Update mutation
  const updateMutation = useUpdateIssue();

  // Handle status change
  const handleStatusChange = (newStatus: IssueStatus) => {
    if (newStatus === 'escalated') {
      setEscalationDialogOpen(true);
    } else {
      setStatusDialog({
        open: true,
        toStatus: newStatus as DialogIssueStatus,
      });
    }
  };

  // Handle status change confirmation
  const handleStatusConfirm = async (result: StatusChangeResult) => {
    if (!statusDialog || !result.confirmed) {
      setStatusDialog(null);
      return;
    }

    try {
      await updateMutation.mutateAsync({
        issueId,
        status: statusDialog.toStatus,
        ...(result.note && { resolutionNotes: result.note }),
      });
      toast.success(`Issue status updated to ${statusDialog.toStatus.replace('_', ' ')}`);
    } catch {
      toast.error('Failed to update issue status');
    }

    setStatusDialog(null);
  };

  // Handle escalation
  const handleEscalate = async (reason: string) => {
    try {
      await updateMutation.mutateAsync({
        issueId,
        status: 'escalated',
        // Store escalation reason in holdReason field
        holdReason: `Escalation reason: ${reason}`,
      });
      toast.success('Issue escalated');
      setEscalationDialogOpen(false);
    } catch {
      toast.error('Failed to escalate issue');
    }
  };

  if (isLoading) {
    return <LoadingState text="Loading issue..." />;
  }

  if (error || !issue) {
    return (
      <ErrorState
        title="Failed to load issue"
        message={error instanceof Error ? error.message : 'Issue not found'}
        onRetry={refetch}
      />
    );
  }

  const slaStatus = issue.slaMetrics
    ? issue.slaMetrics.responseBreached || issue.slaMetrics.resolutionBreached
      ? 'breached'
      : issue.slaMetrics.isResponseAtRisk || issue.slaMetrics.isResolutionAtRisk
        ? 'at_risk'
        : 'on_track'
    : null;

  return (
    <PageLayout variant="full-width">
      <PageLayout.Header
        title={
          <div className="flex items-center gap-2">
            <TicketIcon className="h-6 w-6" />
            {issue.issueNumber}
          </div>
        }
        description={issue.title}
        actions={
          <Link to="/support/issues">
            <Button variant="outline">
              <ChevronLeft className="mr-2 h-4 w-4" />
              Back to Issues
            </Button>
          </Link>
        }
      />

      <PageLayout.Content>
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Content */}
          <div className="space-y-6 lg:col-span-2">
            {/* Status & Priority Badges */}
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className={STATUS_COLORS[issue.status]}>
                {issue.status.replace('_', ' ')}
              </Badge>
              <Badge variant="outline" className={PRIORITY_COLORS[issue.priority]}>
                {issue.priority}
              </Badge>
              <Badge variant="outline">{TYPE_LABELS[issue.type]}</Badge>
              {slaStatus && <SlaBadge status={slaStatus} />}
              {issue.escalatedAt && (
                <Badge variant="destructive" className="gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  Escalated
                </Badge>
              )}
            </div>

            {/* Description */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Description</CardTitle>
              </CardHeader>
              <CardContent>
                {issue.description ? (
                  <p className="whitespace-pre-wrap text-sm">{issue.description}</p>
                ) : (
                  <p className="text-muted-foreground text-sm">No description provided</p>
                )}
              </CardContent>
            </Card>

            {/* SLA Status Card */}
            {issue.slaMetrics && (
              <SlaStatusCard
                slaData={{
                  status: 'active',
                  isPaused: false,
                  responseDueAt: issue.slaMetrics.responseDueAt ? new Date(issue.slaMetrics.responseDueAt as string) : null,
                  resolutionDueAt: issue.slaMetrics.resolutionDueAt ? new Date(issue.slaMetrics.resolutionDueAt as string) : null,
                  responseBreached: issue.slaMetrics.responseBreached ?? false,
                  resolutionBreached: issue.slaMetrics.resolutionBreached ?? false,
                  isResponseAtRisk: issue.slaMetrics.isResponseAtRisk ?? false,
                  isResolutionAtRisk: issue.slaMetrics.isResolutionAtRisk ?? false,
                  responseTimeRemaining: null,
                  resolutionTimeRemaining: null,
                  responsePercentComplete: null,
                  resolutionPercentComplete: null,
                }}
              />
            )}

            {/* Escalation Info */}
            {issue.escalatedAt && (
              <Card className="border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/20">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-base text-red-700 dark:text-red-400">
                    <AlertTriangle className="h-4 w-4" />
                    Escalation Details
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm">
                    <span className="text-muted-foreground">Escalated: </span>
                    {format(new Date(issue.escalatedAt), 'PPp')}
                  </p>
                  {issue.escalationReason && (
                    <p className="mt-2 text-sm">
                      <span className="text-muted-foreground">Reason: </span>
                      {issue.escalationReason}
                    </p>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Quick Actions */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Actions</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-2">
                {issue.status !== 'closed' && issue.status !== 'resolved' && (
                  <>
                    {issue.status !== 'in_progress' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleStatusChange('in_progress')}
                        disabled={updateMutation.isPending}
                      >
                        Start Working
                      </Button>
                    )}
                    {issue.status !== 'on_hold' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleStatusChange('on_hold')}
                        disabled={updateMutation.isPending}
                      >
                        Put On Hold
                      </Button>
                    )}
                    {issue.status !== 'escalated' && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-red-600 hover:text-red-700"
                        onClick={() => handleStatusChange('escalated')}
                        disabled={updateMutation.isPending}
                      >
                        Escalate
                      </Button>
                    )}
                    <Button
                      size="sm"
                      onClick={() => handleStatusChange('resolved')}
                      disabled={updateMutation.isPending}
                    >
                      Resolve
                    </Button>
                  </>
                )}
                {issue.status === 'resolved' && (
                  <Button
                    size="sm"
                    onClick={() => handleStatusChange('closed')}
                    disabled={updateMutation.isPending}
                  >
                    Close Issue
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Details */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex items-center gap-2">
                  <User className="text-muted-foreground h-4 w-4" />
                  <span className="text-muted-foreground">Customer:</span>
                  {issue.customer ? (
                    <Link
                      to="/customers/$customerId"
                      params={{ customerId: issue.customer.id }}
                      className="text-primary hover:underline"
                    >
                      {issue.customer.name}
                    </Link>
                  ) : (
                    <span>—</span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <User className="text-muted-foreground h-4 w-4" />
                  <span className="text-muted-foreground">Assignee:</span>
                  <span>{issue.assignedTo?.name ?? 'Unassigned'}</span>
                </div>

                <Separator />

                <div className="flex items-center gap-2">
                  <Calendar className="text-muted-foreground h-4 w-4" />
                  <span className="text-muted-foreground">Created:</span>
                  <span>{formatDistanceToNow(new Date(issue.createdAt), { addSuffix: true })}</span>
                </div>

                <div className="flex items-center gap-2">
                  <Calendar className="text-muted-foreground h-4 w-4" />
                  <span className="text-muted-foreground">Updated:</span>
                  <span>{formatDistanceToNow(new Date(issue.updatedAt), { addSuffix: true })}</span>
                </div>

                {issue.resolvedAt && (
                  <div className="flex items-center gap-2">
                    <Calendar className="text-muted-foreground h-4 w-4" />
                    <span className="text-muted-foreground">Resolved:</span>
                    <span>
                      {formatDistanceToNow(new Date(issue.resolvedAt), { addSuffix: true })}
                    </span>
                  </div>
                )}

                <Separator />

                <div className="flex items-center gap-2">
                  <Tag className="text-muted-foreground h-4 w-4" />
                  <span className="text-muted-foreground">Type:</span>
                  <span>{TYPE_LABELS[issue.type]}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </PageLayout.Content>

      {/* Status Change Dialog */}
      {statusDialog && issue && (
        <IssueStatusChangeDialog
          open={statusDialog.open}
          onOpenChange={(open) => {
            if (!open) setStatusDialog(null);
          }}
          issueTitle={issue.title}
          fromStatus={issue.status as DialogIssueStatus}
          toStatus={statusDialog.toStatus}
          onConfirm={handleStatusConfirm}
        />
      )}

      {/* Escalation Dialog */}
      <EscalationDialog
        open={escalationDialogOpen}
        onOpenChange={setEscalationDialogOpen}
        onEscalate={handleEscalate}
        isPending={updateMutation.isPending}
      />
    </PageLayout>
  );
}
