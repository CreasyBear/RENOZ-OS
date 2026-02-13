/**
 * SLA Status Card Component
 *
 * Displays comprehensive SLA information on issue detail pages.
 * Shows response and resolution tracking separately with progress bars.
 *
 * @see src/lib/sla/types.ts - SlaStateSnapshot
 */

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { SlaBadge, getSlaStatus, type SlaStatusType } from './sla-badge';
import { cn } from '@/lib/utils';
import { Clock, CheckCircle, AlertTriangle, Timer } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import type { SlaStatusData } from '@/lib/schemas/support/sla';

export type { SlaStatusData };

interface SlaStatusCardProps {
  slaData: SlaStatusData | null;
  className?: string;
}

/**
 * Format seconds into human-readable time
 */
function formatDuration(seconds: number | null): string {
  if (seconds === null) return '—';

  const absSeconds = Math.abs(seconds);
  const isOverdue = seconds < 0;

  if (absSeconds < 60) {
    return isOverdue ? 'Overdue' : `${absSeconds}s`;
  }

  if (absSeconds < 3600) {
    const minutes = Math.floor(absSeconds / 60);
    return isOverdue ? `${minutes}m overdue` : `${minutes}m`;
  }

  if (absSeconds < 86400) {
    const hours = Math.floor(absSeconds / 3600);
    const minutes = Math.floor((absSeconds % 3600) / 60);
    return isOverdue ? `${hours}h ${minutes}m overdue` : `${hours}h ${minutes}m`;
  }

  const days = Math.floor(absSeconds / 86400);
  const hours = Math.floor((absSeconds % 86400) / 3600);
  return isOverdue ? `${days}d ${hours}h overdue` : `${days}d ${hours}h`;
}

/**
 * Get status for individual SLA target (response or resolution)
 */
function getTargetStatus(
  breached: boolean,
  atRisk: boolean,
  completed: boolean,
  isPaused: boolean
): SlaStatusType {
  if (isPaused) return 'paused';
  if (completed) return 'resolved';
  if (breached) return 'breached';
  if (atRisk) return 'at_risk';
  return 'on_track';
}

/**
 * Progress bar with color based on status
 */
function SlaProgress({ value, status }: { value: number | null; status: SlaStatusType }) {
  if (value === null) return null;

  // Clamp to 0-100 for display, but track overdue
  const displayValue = Math.min(Math.max(value, 0), 100);
  const isOverdue = value > 100;

  const colorClass = {
    on_track: 'bg-green-500',
    at_risk: 'bg-yellow-500',
    breached: 'bg-red-500',
    paused: 'bg-gray-400',
    resolved: 'bg-green-500',
    responded: 'bg-blue-500',
  }[status];

  return (
    <div className="relative">
      <Progress
        value={displayValue}
        className={cn('h-2', isOverdue && 'bg-red-200 dark:bg-red-900/30')}
      />
      {/* Overlay colored indicator */}
      <div
        className={cn('absolute top-0 left-0 h-2 rounded-full transition-all', colorClass)}
        style={{ width: `${displayValue}%` }}
      />
    </div>
  );
}

/**
 * Individual SLA target row (response or resolution)
 */
function SlaTargetRow({
  label,
  dueAt,
  completedAt,
  timeRemaining,
  percentComplete,
  breached,
  atRisk,
  isPaused,
}: {
  label: string;
  dueAt: Date | null;
  completedAt?: Date | null;
  timeRemaining: number | null;
  percentComplete: number | null;
  breached: boolean;
  atRisk: boolean;
  isPaused: boolean;
}) {
  const status = getTargetStatus(breached, atRisk, !!completedAt, isPaused);
  const Icon = completedAt ? CheckCircle : breached ? AlertTriangle : Timer;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon
            className={cn(
              'h-4 w-4',
              completedAt
                ? 'text-green-500'
                : breached
                  ? 'text-red-500'
                  : atRisk
                    ? 'text-yellow-500'
                    : 'text-muted-foreground'
            )}
          />
          <span className="text-sm font-medium">{label}</span>
        </div>
        <SlaBadge status={status} size="sm" showIcon={false} />
      </div>

      {/* Progress bar */}
      <SlaProgress value={percentComplete} status={status} />

      {/* Time info */}
      <div className="text-muted-foreground flex items-center justify-between text-xs">
        <span>
          {completedAt
            ? `Completed ${formatDistanceToNow(completedAt, { addSuffix: true })}`
            : timeRemaining !== null
              ? `${formatDuration(timeRemaining)} remaining`
              : 'No target set'}
        </span>
        {dueAt && !completedAt && <span>Due {format(dueAt, 'MMM d, h:mm a')}</span>}
        {completedAt && <span>{format(completedAt, 'MMM d, h:mm a')}</span>}
      </div>
    </div>
  );
}

export function SlaStatusCard({ slaData, className }: SlaStatusCardProps) {
  if (!slaData) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            SLA Status
          </CardTitle>
          <CardDescription>No SLA tracking configured</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const overallStatus = getSlaStatus(slaData);

  return (
    <Card className={className}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            SLA Status
          </CardTitle>
          <SlaBadge status={overallStatus} />
        </div>
        {slaData.configurationName && (
          <CardDescription>{slaData.configurationName}</CardDescription>
        )}
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Response Target */}
        <SlaTargetRow
          label="First Response"
          dueAt={slaData.responseDueAt}
          completedAt={slaData.respondedAt}
          timeRemaining={slaData.responseTimeRemaining}
          percentComplete={slaData.responsePercentComplete}
          breached={slaData.responseBreached}
          atRisk={slaData.isResponseAtRisk}
          isPaused={slaData.isPaused}
        />

        {/* Resolution Target */}
        <SlaTargetRow
          label="Resolution"
          dueAt={slaData.resolutionDueAt}
          completedAt={slaData.resolvedAt}
          timeRemaining={slaData.resolutionTimeRemaining}
          percentComplete={slaData.resolutionPercentComplete}
          breached={slaData.resolutionBreached}
          atRisk={slaData.isResolutionAtRisk}
          isPaused={slaData.isPaused}
        />

        {/* Paused indicator */}
        {slaData.isPaused && (
          <div className="bg-muted text-muted-foreground flex items-center gap-2 rounded-md p-3 text-sm">
            <Clock className="h-4 w-4" />
            SLA timer is currently paused
          </div>
        )}
      </CardContent>
    </Card>
  );
}
