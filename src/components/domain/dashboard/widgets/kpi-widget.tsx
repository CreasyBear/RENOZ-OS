/**
 * KPI Widget Component
 *
 * ARCHITECTURE: Presenter Component - Pure UI, receives all data via props.
 *
 * Displays a key performance indicator card with value, trend, progress,
 * and optional breakdown statistics. Supports loading and error states.
 *
 * Features:
 * - Large value display with optional icon
 * - Trend indicator integration
 * - Progress bar for target tracking
 * - Breakdown stats in footer
 * - Loading skeleton state
 * - Error state with optional retry
 * - Clickable for drill-down navigation
 * - Full accessibility support
 *
 * @see _reference/.reui-reference/registry/default/blocks/cards/statistic-cards/statistic-card-1.tsx
 * @see _reference/.square-ui-reference/templates/dashboard-1/components/dashboard/stat-card.tsx
 */

import { memo, useId, useCallback } from 'react';
import { AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendIndicator } from './trend-indicator';
import { ProgressBar } from './progress-bar';

// ============================================================================
// TYPES
// ============================================================================

export interface KPIWidgetProps {
  /** @source Dashboard metrics data - the primary value to display */
  value: number | string;
  /** @source Dashboard metrics data - label for this KPI */
  label: string;
  /** @source Optional icon component from lucide-react */
  icon?: React.ComponentType<{ className?: string }>;
  /** @source Dashboard metrics data - trend comparison */
  trend?: { value: number; period: string };
  /** @source Dashboard targets data - target for progress bar */
  target?: { value: number; label: string };
  /** @source useCallback handler in dashboard container - drill-down navigation */
  onViewDetails?: () => void;
  /** @source Optional value formatter function */
  formatValue?: (value: number | string) => string;
  /** @source Loading state from container */
  isLoading?: boolean;
  /** @source Error state from container */
  error?: Error | null;
  /** @source Optional breakdown stats for footer */
  breakdown?: { label: string; value: string }[];
  /** @source Invert trend colors (for metrics where down is good) */
  invertTrendColors?: boolean;
  /** @source Optional className */
  className?: string;
}

// ============================================================================
// LOADING STATE COMPONENT
// ============================================================================

function KPIWidgetSkeleton({ className }: { className?: string }) {
  return (
    <Card className={cn('relative overflow-hidden', className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-5" />
          <Skeleton className="h-4 w-24" />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-4 w-28" />
      </CardContent>
    </Card>
  );
}

// ============================================================================
// ERROR STATE COMPONENT
// ============================================================================

interface KPIWidgetErrorProps {
  error: Error;
  onRetry?: () => void;
  className?: string;
}

function KPIWidgetError({ error, onRetry, className }: KPIWidgetErrorProps) {
  return (
    <Card className={cn('relative overflow-hidden', className)}>
      <CardContent className="flex flex-col items-center justify-center py-6 text-center">
        <AlertCircle
          className="h-8 w-8 text-destructive mb-2"
          aria-hidden="true"
        />
        <p className="text-sm text-muted-foreground mb-2">
          {error.message || 'Failed to load data'}
        </p>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="text-sm text-primary hover:underline focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded"
          >
            Try again
          </button>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Default value formatter - returns value as string.
 */
function defaultFormatValue(value: number | string): string {
  if (typeof value === 'number') {
    // Format large numbers with locale formatting
    return value.toLocaleString();
  }
  return value;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

/**
 * Displays a KPI card with value, trend, progress, and breakdown stats.
 *
 * ARCHITECTURE: Presenter Component - receives all data via props from container.
 * NO data hooks (useQuery, useMutation) - only local UI state allowed.
 */
export const KPIWidget = memo(function KPIWidget({
  value,
  label,
  icon: Icon,
  trend,
  target,
  onViewDetails,
  formatValue = defaultFormatValue,
  isLoading = false,
  error = null,
  breakdown,
  invertTrendColors = false,
  className,
}: KPIWidgetProps) {
  // Generate unique IDs for accessibility
  const uniqueId = useId();
  const labelId = `kpi-label-${uniqueId}`;
  const valueId = `kpi-value-${uniqueId}`;

  // Handle keyboard interaction for clickable state
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (onViewDetails && (event.key === 'Enter' || event.key === ' ')) {
        event.preventDefault();
        onViewDetails();
      }
    },
    [onViewDetails]
  );

  // Loading state
  if (isLoading) {
    return <KPIWidgetSkeleton className={className} />;
  }

  // Error state
  if (error) {
    return (
      <KPIWidgetError
        error={error}
        onRetry={onViewDetails}
        className={className}
      />
    );
  }

  // Determine if card is interactive
  const isClickable = Boolean(onViewDetails);

  // Calculate current value for progress bar (if target provided)
  const numericValue = typeof value === 'number' ? value : parseFloat(value) || 0;

  return (
    <Card
      className={cn(
        'relative overflow-hidden transition-colors',
        isClickable && 'cursor-pointer hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        className
      )}
      onClick={isClickable ? onViewDetails : undefined}
      onKeyDown={isClickable ? handleKeyDown : undefined}
      tabIndex={isClickable ? 0 : undefined}
      role={isClickable ? 'button' : undefined}
      aria-labelledby={labelId}
    >
      {/* Header: Icon + Label */}
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          {Icon && (
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-muted">
              <Icon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            </div>
          )}
          <span
            id={labelId}
            className="text-sm font-medium text-muted-foreground"
          >
            {label}
          </span>
        </div>
      </CardHeader>

      {/* Body: Value + Trend */}
      <CardContent className="space-y-2">
        {/* Large value display */}
        <p
          id={valueId}
          aria-describedby={labelId}
          className="text-2xl font-medium text-foreground tracking-tight"
        >
          {formatValue(value)}
        </p>

        {/* Trend indicator */}
        {trend && (
          <TrendIndicator
            value={trend.value}
            period={trend.period}
            invertColors={invertTrendColors}
          />
        )}

        {/* Progress bar if target provided */}
        {target && (
          <div className="pt-2 space-y-1">
            <ProgressBar
              current={numericValue}
              target={target.value}
              label={target.label}
              showPercentage
            />
            <p className="text-xs text-muted-foreground">
              {target.label}
            </p>
          </div>
        )}
      </CardContent>

      {/* Footer: Breakdown stats */}
      {breakdown && breakdown.length > 0 && (
        <CardFooter className="border-t pt-4">
          <div className="flex w-full flex-wrap gap-x-4 gap-y-1">
            {breakdown.map((stat, index) => (
              <div key={index} className="flex items-center gap-1 text-xs">
                <span className="text-muted-foreground">{stat.label}:</span>
                <span className="font-medium text-foreground">{stat.value}</span>
              </div>
            ))}
          </div>
        </CardFooter>
      )}
    </Card>
  );
});
