/**
 * Approval History Component
 *
 * Timeline display of approval events for a purchase order.
 * Shows submissions, approvals, rejections, and escalations.
 */

import { ArrowUp, Check, Clock, ClipboardList, FileText, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState, EmptyStateContainer } from '@/components/shared/empty-state';
import { useOrgFormat } from '@/hooks/use-org-format';
import { cn } from '@/lib/utils';
import type { ApprovalEvent, ApprovalRule, ApprovalEventType } from '@/lib/schemas/approvals';

// ============================================================================
// TYPES
// ============================================================================

interface ApprovalHistoryProps {
  events: ApprovalEvent[];
  currentStatus: string;
  appliedRule?: ApprovalRule;
  isLoading?: boolean;
}

// ============================================================================
// EVENT ICON
// ============================================================================

const eventConfig: Record<
  ApprovalEventType,
  {
    icon: typeof Check;
    color: string;
    bgColor: string;
    label: string;
  }
> = {
  created: {
    icon: FileText,
    color: 'text-gray-600',
    bgColor: 'bg-gray-100',
    label: 'Created',
  },
  submitted: {
    icon: ArrowUp,
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
    label: 'Submitted',
  },
  approved: {
    icon: Check,
    color: 'text-green-600',
    bgColor: 'bg-green-100',
    label: 'Approved',
  },
  rejected: {
    icon: X,
    color: 'text-red-600',
    bgColor: 'bg-red-100',
    label: 'Rejected',
  },
  escalated: {
    icon: Clock,
    color: 'text-orange-600',
    bgColor: 'bg-orange-100',
    label: 'Escalated',
  },
};

function EventIcon({ type }: { type: ApprovalEventType }) {
  const config = eventConfig[type];
  const Icon = config.icon;

  return (
    <div className={cn('flex h-8 w-8 items-center justify-center rounded-full', config.bgColor)}>
      <Icon className={cn('h-4 w-4', config.color)} />
    </div>
  );
}

// ============================================================================
// LOADING SKELETON
// ============================================================================

function HistorySkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 2 }).map((_, i) => (
        <div key={i} className="flex gap-3">
          <Skeleton className="h-8 w-8 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-48" />
            <Skeleton className="h-3 w-64" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// EMPTY STATE
// ============================================================================


// ============================================================================
// CURRENT STATUS INDICATOR
// ============================================================================

function CurrentStatus({ status }: { status: string }) {
  const statusLabels: Record<string, string> = {
    draft: 'Draft - Not Submitted',
    pending_approval: 'Awaiting Approval',
    approved: 'Approved',
    ordered: 'Ordered',
    partial_received: 'Partially Received',
    received: 'Received',
    closed: 'Closed',
    cancelled: 'Cancelled',
  };

  const isPending = status === 'pending_approval';

  return (
    <div
      className={cn(
        'rounded-md border p-3',
        isPending ? 'border-orange-200 bg-orange-50' : 'border-muted bg-muted/30'
      )}
    >
      <div className="flex items-center gap-2">
        <Clock className={cn('h-4 w-4', isPending ? 'text-orange-600' : 'text-muted-foreground')} />
        <span
          className={cn(
            'text-sm font-medium',
            isPending ? 'text-orange-800' : 'text-muted-foreground'
          )}
        >
          {statusLabels[status] || status}
        </span>
      </div>
    </div>
  );
}

// ============================================================================
// TIMELINE EVENT
// ============================================================================

function TimelineEvent({ event, isLast }: { event: ApprovalEvent; isLast: boolean }) {
  const config = eventConfig[event.type];
  const { formatDate } = useOrgFormat();

  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <EventIcon type={event.type} />
        {!isLast && <div className="bg-border mt-2 h-full w-px" />}
      </div>
      <div className="flex-1 pb-4">
        <div className="flex items-baseline justify-between gap-2">
          <p className={cn('text-sm font-medium', config.color)}>{config.label}</p>
          <time className="text-muted-foreground text-xs">
            {formatDate(event.date, { format: 'short', includeTime: true })}
          </time>
        </div>
        <p className="text-muted-foreground mt-0.5 text-sm">
          {event.user.name}
          {event.user.role && ` (${event.user.role})`}
        </p>
        {event.note && <p className="mt-2 text-sm italic">&ldquo;{event.note}&rdquo;</p>}
        {event.reason && <p className="text-destructive mt-2 text-sm">Reason: {event.reason}</p>}
      </div>
    </div>
  );
}

// ============================================================================
// APPROVAL RULE INFO
// ============================================================================

function AppliedRuleInfo({ rule }: { rule: ApprovalRule }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium">Approval Rule Applied</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Rule</span>
          <span>{rule.name}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Condition</span>
          <span>{rule.condition}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Approver Role</span>
          <span>{rule.approverRole}</span>
        </div>
        {rule.approvers.length > 0 && (
          <div>
            <p className="text-muted-foreground">Approvers:</p>
            <ul className="mt-1 ml-4 list-disc">
              {rule.approvers.map((approver) => (
                <li key={approver.id}>
                  {approver.name} ({approver.email})
                </li>
              ))}
            </ul>
          </div>
        )}
        {rule.escalationHours && rule.escalationRole && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Auto-escalation</span>
            <span>
              After {rule.escalationHours}h → {rule.escalationRole}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function ApprovalHistory({
  events,
  currentStatus,
  appliedRule,
  isLoading = false,
}: ApprovalHistoryProps) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        <h3 className="font-semibold">Approval History</h3>
        <HistorySkeleton />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="font-semibold">Approval History</h3>

      {/* Current Status */}
      <CurrentStatus status={currentStatus} />

      {/* Timeline */}
      {events.length === 0 ? (
        <EmptyStateContainer variant="inline">
          <EmptyState
            icon={ClipboardList}
            title="No Approval History"
            message="This order has not been submitted for approval yet."
          />
        </EmptyStateContainer>
      ) : (
        <div className="mt-4">
          {events.map((event, index) => (
            <TimelineEvent key={event.id} event={event} isLast={index === events.length - 1} />
          ))}
        </div>
      )}

      {/* Applied Rule */}
      {appliedRule && <AppliedRuleInfo rule={appliedRule} />}
    </div>
  );
}

export type { ApprovalHistoryProps };
