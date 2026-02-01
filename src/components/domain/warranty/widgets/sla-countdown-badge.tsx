/**
 * SLA Countdown Badge Component
 *
 * Displays SLA due time with countdown and color-coded status.
 * Shows response time and resolution time with appropriate urgency indicators.
 *
 * @see _Initiation/_prd/2-domains/warranty/warranty.prd.json - DOM-WAR-006c
 */

'use client';

import * as React from 'react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Clock, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================================================
// TYPES
// ============================================================================

export interface SlaCountdownBadgeProps {
  /** Response due date/time */
  responseDueAt?: Date | string | null;
  /** Resolution due date/time */
  resolutionDueAt?: Date | string | null;
  /** When the claim was responded to (if responded) */
  respondedAt?: Date | string | null;
  /** When the claim was resolved (if resolved) */
  resolvedAt?: Date | string | null;
  /** Show compact variant (just badge, no label) */
  compact?: boolean;
  /** Custom class name */
  className?: string;
}

// ============================================================================
// HELPERS
// ============================================================================

interface SlaStatus {
  label: string;
  isOverdue: boolean;
  isAtRisk: boolean;
  isMet: boolean;
}

function calculateSlaStatus(
  dueDate: Date | string | null | undefined,
  completedAt: Date | string | null | undefined
): SlaStatus | null {
  if (!dueDate) return null;

  const due = typeof dueDate === 'string' ? new Date(dueDate) : dueDate;

  // If already completed, check if it was met
  if (completedAt) {
    const completed = typeof completedAt === 'string' ? new Date(completedAt) : completedAt;
    const wasMet = completed <= due;
    return {
      label: wasMet ? 'Met' : 'Breached',
      isOverdue: !wasMet,
      isAtRisk: false,
      isMet: wasMet,
    };
  }

  // Calculate remaining time
  const now = new Date();
  const diffMs = due.getTime() - now.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffMinutes = Math.floor(diffMs / (1000 * 60));

  if (diffMs < 0) {
    const overdueHours = Math.abs(diffHours);
    const overdueDays = Math.abs(diffDays);
    return {
      label:
        overdueDays > 0
          ? `${overdueDays}d overdue`
          : overdueHours > 0
            ? `${overdueHours}h overdue`
            : 'Overdue',
      isOverdue: true,
      isAtRisk: true,
      isMet: false,
    };
  }

  if (diffDays > 1) {
    return {
      label: `${diffDays}d`,
      isOverdue: false,
      isAtRisk: diffDays <= 1,
      isMet: false,
    };
  }

  if (diffHours > 0) {
    return {
      label: `${diffHours}h`,
      isOverdue: false,
      isAtRisk: diffHours <= 4,
      isMet: false,
    };
  }

  return {
    label: `${diffMinutes}m`,
    isOverdue: false,
    isAtRisk: true,
    isMet: false,
  };
}

function formatFullDate(date: Date | string | null | undefined): string {
  if (!date) return 'Not set';
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleString('en-AU', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// ============================================================================
// COMPONENT
// ============================================================================

export function SlaCountdownBadge({
  responseDueAt,
  resolutionDueAt,
  respondedAt,
  resolvedAt,
  compact = false,
  className,
}: SlaCountdownBadgeProps) {
  // Update countdown every minute
  const [, forceUpdate] = React.useReducer((x: number) => x + 1, 0);

  React.useEffect(() => {
    const interval = setInterval(forceUpdate, 60000); // Update every minute
    return () => clearInterval(interval);
  }, []);

  const responseStatus = calculateSlaStatus(responseDueAt, respondedAt);
  const resolutionStatus = calculateSlaStatus(resolutionDueAt, resolvedAt);

  // If no SLA data, don't render
  if (!responseStatus && !resolutionStatus) {
    return null;
  }

  // Determine overall status (worst case)
  const isOverdue = responseStatus?.isOverdue || resolutionStatus?.isOverdue;
  const isAtRisk = !isOverdue && (responseStatus?.isAtRisk || resolutionStatus?.isAtRisk);
  const isMet = (responseStatus?.isMet ?? true) && (resolutionStatus?.isMet ?? true);

  // Get the most urgent status to display
  const primaryStatus =
    responseStatus?.isOverdue || responseStatus?.isAtRisk
      ? responseStatus
      : resolutionStatus?.isOverdue || resolutionStatus?.isAtRisk
        ? resolutionStatus
        : responseStatus || resolutionStatus;

  if (!primaryStatus) return null;

  const Icon = isOverdue ? AlertTriangle : isMet ? CheckCircle2 : Clock;

  const badgeContent = (
    <Badge
      variant={isOverdue ? 'destructive' : isMet ? 'default' : 'outline'}
      className={cn(
        'gap-1',
        isAtRisk && !isOverdue && 'border-orange-500 bg-orange-50 text-orange-700',
        isMet && 'border-green-500 bg-green-50 text-green-700',
        className
      )}
    >
      <Icon className="size-3" />
      {!compact && <span className="text-xs">SLA:</span>}
      <span>{primaryStatus.label}</span>
    </Badge>
  );

  // Tooltip with full details
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>{badgeContent}</TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <div className="space-y-2 text-xs">
            <p className="font-semibold">SLA Status</p>

            {responseStatus && (
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Response:</span>
                <span
                  className={cn(
                    responseStatus.isOverdue && 'text-destructive font-medium',
                    responseStatus.isMet && 'font-medium text-green-600',
                    responseStatus.isAtRisk && !responseStatus.isOverdue && 'text-orange-600'
                  )}
                >
                  {responseStatus.label}
                </span>
              </div>
            )}

            {responseDueAt && (
              <div className="text-muted-foreground flex justify-between gap-4">
                <span>Due:</span>
                <span>{formatFullDate(responseDueAt)}</span>
              </div>
            )}

            {resolutionStatus && (
              <>
                <div className="mt-2 border-t pt-2" />
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground">Resolution:</span>
                  <span
                    className={cn(
                      resolutionStatus.isOverdue && 'text-destructive font-medium',
                      resolutionStatus.isMet && 'font-medium text-green-600',
                      resolutionStatus.isAtRisk && !resolutionStatus.isOverdue && 'text-orange-600'
                    )}
                  >
                    {resolutionStatus.label}
                  </span>
                </div>
              </>
            )}

            {resolutionDueAt && (
              <div className="text-muted-foreground flex justify-between gap-4">
                <span>Due:</span>
                <span>{formatFullDate(resolutionDueAt)}</span>
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
