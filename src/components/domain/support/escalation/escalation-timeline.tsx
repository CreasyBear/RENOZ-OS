/**
 * Escalation Timeline Component
 *
 * Displays escalation history for an issue in timeline format.
 *
 * @see src/server/functions/escalation.ts - getEscalationHistory
 */

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { AlertTriangle, ArrowDown, User, Clock } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import type { EscalationHistoryItem } from '@/lib/schemas/support/escalation';

export type { EscalationHistoryItem };

interface EscalationTimelineProps {
  history: EscalationHistoryItem[];
  isLoading?: boolean;
  className?: string;
}

/**
 * Single timeline item
 */
function TimelineItem({ item }: { item: EscalationHistoryItem }) {
  const isEscalation = item.action === 'escalate';
  const Icon = isEscalation ? AlertTriangle : ArrowDown;

  return (
    <div className="flex gap-4">
      {/* Timeline indicator */}
      <div className="flex flex-col items-center">
        <div
          className={cn(
            'flex h-8 w-8 items-center justify-center rounded-full',
            isEscalation
              ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
              : 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400'
          )}
        >
          <Icon className="h-4 w-4" />
        </div>
        <div className="bg-border w-px flex-1" />
      </div>

      {/* Content */}
      <div className="flex-1 pb-6">
        <div className="flex items-center gap-2">
          <Badge variant={isEscalation ? 'destructive' : 'default'}>
            {isEscalation ? 'Escalated' : 'De-escalated'}
          </Badge>
          {item.escalationRuleId && (
            <Badge variant="outline" className="text-xs">
              Auto
            </Badge>
          )}
        </div>

        <p className="text-muted-foreground mt-2 text-sm">{item.reason ?? 'No reason provided'}</p>

        <div className="text-muted-foreground mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
          {/* Performed by */}
          <span className="flex items-center gap-1">
            <User className="h-3 w-3" />
            {item.performedByUser?.name ?? item.performedByUser?.email ?? 'Unknown'}
          </span>

          {/* Timestamp */}
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
          </span>

          {/* Escalated to */}
          {item.escalatedToUser && (
            <span className="flex items-center gap-1">
              <span className="text-muted-foreground">→</span>
              {item.escalatedToUser.name ?? item.escalatedToUser.email}
            </span>
          )}
        </div>

        <div className="text-muted-foreground/60 mt-1 text-xs">
          {format(new Date(item.createdAt), "MMM d, yyyy 'at' h:mm a")}
        </div>
      </div>
    </div>
  );
}

export function EscalationTimeline({ history, isLoading, className }: EscalationTimelineProps) {
  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Escalation History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="bg-muted h-16 rounded" />
            <div className="bg-muted h-16 rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (history.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Escalation History</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            No escalation events recorded for this issue.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" />
          Escalation History
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-0">
          {history.map((item) => (
            <TimelineItem key={item.id} item={item} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Compact inline timeline for sidebar or summary views
 */
export function EscalationTimelineCompact({
  history,
  className,
}: {
  history: EscalationHistoryItem[];
  className?: string;
}) {
  const escalationCount = history.filter((h) => h.action === 'escalate').length;
  const deEscalationCount = history.filter((h) => h.action === 'de_escalate').length;
  const lastEvent = history[0];

  if (history.length === 0) return null;

  return (
    <div className={cn('flex items-center gap-2 text-sm', className)}>
      <AlertTriangle className="text-muted-foreground h-4 w-4" />
      <span>
        {escalationCount} escalation{escalationCount !== 1 ? 's' : ''}
        {deEscalationCount > 0 &&
          `, ${deEscalationCount} de-escalation${deEscalationCount !== 1 ? 's' : ''}`}
      </span>
      {lastEvent && (
        <span className="text-muted-foreground">
          (last{' '}
          {formatDistanceToNow(new Date(lastEvent.createdAt), {
            addSuffix: true,
          })}
          )
        </span>
      )}
    </div>
  );
}
