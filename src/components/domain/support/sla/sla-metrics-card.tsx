/**
 * SLA Metrics Card Component
 *
 * Dashboard widget showing SLA metrics summary including
 * breach counts, breach rates, and average times.
 *
 * @see src/server/functions/sla.ts - getSlaMetrics
 */

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  TrendingDown,
  TrendingUp,
  PauseCircle,
} from 'lucide-react';
import type { SlaMetricsData } from '@/lib/schemas/support/sla';

export type { SlaMetricsData };

interface SlaMetricsCardProps {
  metrics: SlaMetricsData | null;
  isLoading?: boolean;
  className?: string;
}

/**
 * Format seconds into human-readable duration
 */
function formatAvgTime(seconds: number | null): string {
  if (seconds === null) return '—';

  if (seconds < 60) {
    return `${seconds}s`;
  }

  if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60);
    return `${minutes}m`;
  }

  if (seconds < 86400) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  }

  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  return hours > 0 ? `${days}d ${hours}h` : `${days}d`;
}

/**
 * Single metric display with icon and value
 */
function MetricItem({
  icon: Icon,
  label,
  value,
  subValue,
  variant = 'default',
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  subValue?: string;
  variant?: 'default' | 'success' | 'warning' | 'danger';
}) {
  const variantClasses = {
    default: 'text-muted-foreground',
    success: 'text-green-600 dark:text-green-400',
    warning: 'text-yellow-600 dark:text-yellow-400',
    danger: 'text-red-600 dark:text-red-400',
  };

  return (
    <div className="flex items-center gap-3">
      <div
        className={cn(
          'bg-muted flex h-10 w-10 items-center justify-center rounded-lg',
          variant !== 'default' && 'bg-opacity-20',
          variant === 'success' && 'bg-green-100 dark:bg-green-900/30',
          variant === 'warning' && 'bg-yellow-100 dark:bg-yellow-900/30',
          variant === 'danger' && 'bg-red-100 dark:bg-red-900/30'
        )}
      >
        <Icon className={cn('h-5 w-5', variantClasses[variant])} />
      </div>
      <div>
        <div className="text-muted-foreground text-sm">{label}</div>
        <div className="text-xl font-semibold">{value}</div>
        {subValue && <div className="text-muted-foreground text-xs">{subValue}</div>}
      </div>
    </div>
  );
}

export function SlaMetricsCard({ metrics, isLoading, className }: SlaMetricsCardProps) {
  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>SLA Performance</CardTitle>
          <CardDescription>Loading metrics...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="bg-muted h-10 rounded" />
            <div className="bg-muted h-10 rounded" />
            <div className="bg-muted h-10 rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!metrics) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>SLA Performance</CardTitle>
          <CardDescription>No SLA data available</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          SLA Performance
        </CardTitle>
        <CardDescription>{metrics.total} total issues tracked</CardDescription>
      </CardHeader>

      <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* Total Tracked */}
        <MetricItem
          icon={Clock}
          label="Total Tracked"
          value={metrics.total}
          subValue={`${metrics.resolved} resolved`}
        />

        {/* Response Breaches */}
        <MetricItem
          icon={metrics.responseBreached > 0 ? AlertTriangle : CheckCircle}
          label="Response Breaches"
          value={metrics.responseBreached}
          subValue={`${metrics.responseBreachRate}% breach rate`}
          variant={
            metrics.responseBreachRate > 20
              ? 'danger'
              : metrics.responseBreachRate > 10
                ? 'warning'
                : 'success'
          }
        />

        {/* Resolution Breaches */}
        <MetricItem
          icon={metrics.resolutionBreached > 0 ? AlertTriangle : CheckCircle}
          label="Resolution Breaches"
          value={metrics.resolutionBreached}
          subValue={`${metrics.resolutionBreachRate}% breach rate`}
          variant={
            metrics.resolutionBreachRate > 20
              ? 'danger'
              : metrics.resolutionBreachRate > 10
                ? 'warning'
                : 'success'
          }
        />

        {/* Currently Paused */}
        <MetricItem
          icon={PauseCircle}
          label="Currently Paused"
          value={metrics.currentlyPaused}
          variant={metrics.currentlyPaused > 5 ? 'warning' : 'default'}
        />

        {/* Avg Response Time */}
        <MetricItem
          icon={TrendingUp}
          label="Avg Response Time"
          value={formatAvgTime(metrics.avgResponseTimeSeconds)}
        />

        {/* Avg Resolution Time */}
        <MetricItem
          icon={TrendingDown}
          label="Avg Resolution Time"
          value={formatAvgTime(metrics.avgResolutionTimeSeconds)}
        />
      </CardContent>
    </Card>
  );
}

/**
 * Compact version for sidebar or small widgets
 */
export function SlaMetricsCompact({
  metrics,
  className,
}: {
  metrics: SlaMetricsData | null;
  className?: string;
}) {
  if (!metrics) return null;

  const totalBreaches = metrics.responseBreached + metrics.resolutionBreached;

  return (
    <div className={cn('flex items-center gap-4 text-sm', className)}>
      <div className="flex items-center gap-1">
        <Clock className="text-muted-foreground h-4 w-4" />
        <span>{metrics.total} tracked</span>
      </div>

      {totalBreaches > 0 && (
        <div className="flex items-center gap-1 text-red-600 dark:text-red-400">
          <AlertTriangle className="h-4 w-4" />
          <span>{totalBreaches} breached</span>
        </div>
      )}

      {metrics.currentlyPaused > 0 && (
        <div className="flex items-center gap-1 text-yellow-600 dark:text-yellow-400">
          <PauseCircle className="h-4 w-4" />
          <span>{metrics.currentlyPaused} paused</span>
        </div>
      )}
    </div>
  );
}
