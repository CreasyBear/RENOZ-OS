/**
 * SLA Status Badge Component
 *
 * Displays SLA status with color-coded badges:
 * - Green (default): On track
 * - Yellow (warning): At risk (configurable threshold, default 25% remaining)
 * - Red (destructive): Breached
 * - Gray (secondary): Paused or Resolved
 *
 * @see src/server/functions/issues.ts - IssueSlaMetrics
 */

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Clock, AlertTriangle, XCircle, CheckCircle, PauseCircle } from 'lucide-react';

export type SlaStatusType =
  | 'on_track'
  | 'at_risk'
  | 'breached'
  | 'paused'
  | 'resolved'
  | 'responded';

export interface SlaBadgeProps {
  /** Current SLA status */
  status: SlaStatusType;
  /** Optional label override */
  label?: string;
  /** Show icon alongside text */
  showIcon?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Size variant */
  size?: 'sm' | 'default';
}

const statusConfig: Record<
  SlaStatusType,
  {
    label: string;
    variant: 'default' | 'secondary' | 'destructive' | 'outline';
    className: string;
    icon: React.ComponentType<{ className?: string }>;
  }
> = {
  on_track: {
    label: 'On Track',
    variant: 'default',
    className: 'bg-green-500 hover:bg-green-600 text-white border-green-500',
    icon: Clock,
  },
  at_risk: {
    label: 'At Risk',
    variant: 'outline',
    className:
      'bg-yellow-100 text-yellow-800 border-yellow-400 dark:bg-yellow-900/30 dark:text-yellow-200 dark:border-yellow-600',
    icon: AlertTriangle,
  },
  breached: {
    label: 'Breached',
    variant: 'destructive',
    className: '',
    icon: XCircle,
  },
  paused: {
    label: 'Paused',
    variant: 'secondary',
    className: '',
    icon: PauseCircle,
  },
  resolved: {
    label: 'Resolved',
    variant: 'default',
    className: 'bg-green-500 hover:bg-green-600 text-white border-green-500',
    icon: CheckCircle,
  },
  responded: {
    label: 'Responded',
    variant: 'default',
    className: 'bg-blue-500 hover:bg-blue-600 text-white border-blue-500',
    icon: CheckCircle,
  },
};

/**
 * Determine the SLA status from metrics
 */
export function getSlaStatus(metrics: {
  isPaused?: boolean;
  responseBreached?: boolean;
  resolutionBreached?: boolean;
  isResponseAtRisk?: boolean;
  isResolutionAtRisk?: boolean;
  status?: string;
}): SlaStatusType {
  // Check for paused first
  if (metrics.isPaused) {
    return 'paused';
  }

  // Check for resolved status
  if (metrics.status === 'resolved') {
    return 'resolved';
  }

  // Check for responded status (but not yet resolved)
  if (metrics.status === 'responded') {
    return 'responded';
  }

  // Check for breached (either response or resolution)
  if (metrics.responseBreached || metrics.resolutionBreached) {
    return 'breached';
  }

  // Check for at-risk (either response or resolution)
  if (metrics.isResponseAtRisk || metrics.isResolutionAtRisk) {
    return 'at_risk';
  }

  return 'on_track';
}

export function SlaBadge({
  status,
  label,
  showIcon = true,
  className,
  size = 'default',
}: SlaBadgeProps) {
  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <Badge
      variant={config.variant}
      className={cn(config.className, size === 'sm' && 'px-1.5 py-0 text-[10px]', className)}
    >
      {showIcon && <Icon className={cn('mr-1', size === 'sm' ? 'h-3 w-3' : 'h-3.5 w-3.5')} />}
      {label ?? config.label}
    </Badge>
  );
}

/**
 * Compact SLA indicator for table rows
 * Shows just the icon with a tooltip
 */
export function SlaIndicator({ status, className }: { status: SlaStatusType; className?: string }) {
  const config = statusConfig[status];
  const Icon = config.icon;

  const colorClass = {
    on_track: 'text-green-500',
    at_risk: 'text-yellow-500',
    breached: 'text-red-500',
    paused: 'text-gray-400',
    resolved: 'text-green-500',
    responded: 'text-blue-500',
  }[status];

  return (
    <span title={config.label} className={cn(colorClass, className)}>
      <Icon className="h-4 w-4" />
    </span>
  );
}
