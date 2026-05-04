import { AlertTriangle, Calendar, Tag, User } from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { SlaStatusCard } from '@/components/domain/support/sla/sla-status-card';
import type { IssueDetail } from '@/lib/schemas/support/issues';
import {
  ISSUE_NEXT_ACTION_LABELS,
  ISSUE_RESOLUTION_CATEGORY_LABELS,
} from './issue-options';
import { IssueRemedyCard } from './issue-remedy-card';

interface IssueOverviewTabProps {
  issue: IssueDetail;
}

export function IssueOverviewTab({ issue }: IssueOverviewTabProps) {
  return (
    <>
      <IssueDescriptionCard description={issue.description} />
      {issue.resolution && (
        <IssueResolutionCard resolution={issue.resolution} />
      )}
      {issue.rmaReadiness && (
        <IssueRemedyCard
          issueId={issue.id}
          rmaReadiness={issue.rmaReadiness}
        />
      )}
      {issue.slaMetrics && <IssueSlaCard slaMetrics={issue.slaMetrics} />}
      {issue.escalatedAt && (
        <IssueEscalationCard
          escalatedAt={issue.escalatedAt}
          reason={issue.escalationReason}
        />
      )}
    </>
  );
}

export function IssueAlerts({ issue }: { issue: IssueDetail }) {
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

export function IssueDetailsCard({
  issue,
  typeLabel,
}: {
  issue: IssueDetail;
  typeLabel: string;
}) {
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
          <span>{typeLabel}</span>
        </div>
      </CardContent>
    </Card>
  );
}

function IssueDescriptionCard({ description }: { description: string | null }) {
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

function IssueResolutionCard({
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

function IssueSlaCard({
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

function IssueEscalationCard({
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
