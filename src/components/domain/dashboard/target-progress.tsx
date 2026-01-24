/**
 * Target Progress Component
 *
 * ARCHITECTURE: Presenter Component - Displays progress toward KPI targets.
 *
 * Features:
 * - Progress bars with status colors (on_track=green, ahead=blue, behind=amber, completed=emerald)
 * - Days remaining indicator
 * - Achievement percentage display
 * - Overall summary with achieved/total counts
 *
 * @see DASH-TARGETS-UI acceptance criteria
 * @see src/lib/schemas/dashboard/targets.ts for types
 */

import { memo, useMemo } from 'react';
import { Target, Clock, Check, AlertTriangle, TrendingUp, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import type {
  TargetProgress as TargetProgressType,
  TargetProgressResponse,
  TargetMetric,
} from '@/lib/schemas/dashboard/targets';

// ============================================================================
// TYPES
// ============================================================================

export interface TargetProgressProps {
  /** @source useTargetProgress() in dashboard container */
  progress?: TargetProgressResponse | null;
  /** @source useTargetProgress() loading state */
  isLoading?: boolean;
  /** @source useTargetProgress() error state */
  error?: Error | null;
  /** @source useCallback handler in dashboard container - retry on error */
  onRetry?: () => void;
  /** @source useCallback handler in dashboard container - navigate to settings */
  onManageTargets?: () => void;
  /** Widget title */
  title?: string;
  /** Maximum targets to display (for compact mode) */
  maxItems?: number;
  /** Show overall summary */
  showSummary?: boolean;
  /** Additional class name */
  className?: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const STATUS_CONFIG = {
  on_track: {
    label: 'On Track',
    color: 'text-green-600',
    bgColor: 'bg-green-600',
    progressColor: 'bg-green-500',
    icon: TrendingUp,
  },
  ahead: {
    label: 'Ahead',
    color: 'text-blue-600',
    bgColor: 'bg-blue-600',
    progressColor: 'bg-blue-500',
    icon: TrendingUp,
  },
  behind: {
    label: 'Behind',
    color: 'text-amber-600',
    bgColor: 'bg-amber-600',
    progressColor: 'bg-amber-500',
    icon: AlertTriangle,
  },
  completed: {
    label: 'Completed',
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-600',
    progressColor: 'bg-emerald-500',
    icon: Check,
  },
} as const;

const METRIC_LABELS: Record<TargetMetric, string> = {
  revenue: 'Revenue',
  kwh_deployed: 'kWh Deployed',
  quote_win_rate: 'Win Rate',
  active_installations: 'Installations',
  warranty_claims: 'Claims',
  pipeline_value: 'Pipeline',
  customer_count: 'Customers',
  orders_count: 'Orders',
  average_order_value: 'Avg Order',
};

// ============================================================================
// UTILITIES
// ============================================================================

function formatValue(value: number, metric: TargetMetric): string {
  switch (metric) {
    case 'revenue':
    case 'pipeline_value':
    case 'average_order_value':
      return new Intl.NumberFormat('en-AU', {
        style: 'currency',
        currency: 'AUD',
        maximumFractionDigits: 0,
      }).format(value);
    case 'quote_win_rate':
      return `${value.toFixed(1)}%`;
    case 'kwh_deployed':
      return `${value.toLocaleString()} kWh`;
    default:
      return value.toLocaleString();
  }
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

function TargetProgressSkeleton({ className }: { className?: string }) {
  return (
    <Card className={cn('relative overflow-hidden', className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-5" />
            <Skeleton className="h-5 w-28" />
          </div>
          <Skeleton className="h-8 w-20" />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <div className="flex justify-between">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-16" />
            </div>
            <Skeleton className="h-2 w-full" />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function TargetProgressEmpty({
  onManageTargets,
  className,
}: {
  onManageTargets?: () => void;
  className?: string;
}) {
  return (
    <Card className={cn('relative overflow-hidden', className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <Target className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
          <CardTitle className="text-base">Target Progress</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col items-center justify-center py-8 text-center">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted mb-3">
          <Target className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
        </div>
        <p className="text-sm font-medium mb-1">No active targets</p>
        <p className="text-xs text-muted-foreground mb-4">
          Create targets to track your KPI progress.
        </p>
        {onManageTargets && (
          <Button variant="outline" size="sm" onClick={onManageTargets}>
            <Settings className="h-4 w-4 mr-2" />
            Manage Targets
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

function TargetProgressError({
  error,
  onRetry,
  className,
}: {
  error: Error;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <Card className={cn('relative overflow-hidden', className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <Target className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
          <CardTitle className="text-base">Target Progress</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col items-center justify-center py-8 text-center">
        <AlertTriangle
          className="h-8 w-8 text-destructive mb-2"
          aria-hidden="true"
        />
        <p className="text-sm text-muted-foreground mb-2">
          {error.message || 'Failed to load targets'}
        </p>
        {onRetry && (
          <Button variant="outline" size="sm" onClick={onRetry}>
            Try again
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

interface TargetItemProps {
  target: TargetProgressType;
}

const TargetItem = memo(function TargetItem({ target }: TargetItemProps) {
  const config = STATUS_CONFIG[target.status];
  const StatusIcon = config.icon;
  const progress = Math.min(target.percentage, 100);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <StatusIcon
            className={cn('h-4 w-4 flex-shrink-0', config.color)}
            aria-hidden="true"
          />
          <span className="text-sm font-medium truncate">{target.targetName}</span>
          <span className="text-xs text-muted-foreground">
            {METRIC_LABELS[target.metric]}
          </span>
        </div>
        <div className="flex items-center gap-2 text-right flex-shrink-0">
          <span className={cn('text-xs font-medium', config.color)}>
            {target.percentage.toFixed(0)}%
          </span>
        </div>
      </div>

      <div className="relative">
        <Progress value={progress} className="h-2" />
        <div
          className={cn('absolute top-0 left-0 h-full rounded-full', config.progressColor)}
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          {formatValue(target.currentValue, target.metric)} /{' '}
          {formatValue(target.targetValue, target.metric)}
        </span>
        <div className="flex items-center gap-1">
          <Clock className="h-3 w-3" aria-hidden="true" />
          <span>
            {target.daysRemaining > 0
              ? `${target.daysRemaining} days left`
              : target.status === 'completed'
                ? 'Achieved'
                : 'Ended'}
          </span>
        </div>
      </div>
    </div>
  );
});

// ============================================================================
// MAIN COMPONENT
// ============================================================================

/**
 * Displays progress toward KPI targets in a dashboard widget.
 *
 * ARCHITECTURE: Presenter Component - receives all data via props from container.
 * NO data hooks (useQuery, useMutation) - only local UI state allowed.
 */
export const TargetProgressWidget = memo(function TargetProgressWidget({
  progress,
  isLoading = false,
  error = null,
  onRetry,
  onManageTargets,
  title = 'Target Progress',
  maxItems,
  showSummary = true,
  className,
}: TargetProgressProps) {
  // Filter to display items
  const displayTargets = useMemo(() => {
    if (!progress?.targets) return [];
    if (maxItems && progress.targets.length > maxItems) {
      return progress.targets.slice(0, maxItems);
    }
    return progress.targets;
  }, [progress?.targets, maxItems]);

  // Loading state
  if (isLoading && !progress) {
    return <TargetProgressSkeleton className={className} />;
  }

  // Error state
  if (error && !progress) {
    return (
      <TargetProgressError
        error={error}
        onRetry={onRetry}
        className={className}
      />
    );
  }

  // Empty state
  if (!progress?.targets.length) {
    return (
      <TargetProgressEmpty
        onManageTargets={onManageTargets}
        className={className}
      />
    );
  }

  return (
    <Card className={cn('relative overflow-hidden', className)}>
      {/* Header */}
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
            <div>
              <CardTitle className="text-base">{title}</CardTitle>
              {showSummary && progress.overall && (
                <CardDescription className="text-xs">
                  {progress.overall.achieved} of {progress.overall.total} achieved (
                  {progress.overall.percentage}%)
                </CardDescription>
              )}
            </div>
          </div>
          {onManageTargets && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onManageTargets}
              className="text-xs gap-1"
            >
              <Settings className="h-3 w-3" aria-hidden="true" />
              Manage
            </Button>
          )}
        </div>
      </CardHeader>

      {/* Target List */}
      <CardContent className="space-y-4">
        {displayTargets.map((target) => (
          <TargetItem key={target.targetId} target={target} />
        ))}

        {/* Truncation indicator */}
        {maxItems && progress.targets.length > maxItems && (
          <div className="text-center pt-2 border-t">
            <Button
              variant="ghost"
              size="sm"
              onClick={onManageTargets}
              className="text-xs text-muted-foreground"
            >
              View all {progress.targets.length} targets
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
});
