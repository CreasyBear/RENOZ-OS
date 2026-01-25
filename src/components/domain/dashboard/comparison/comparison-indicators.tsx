/**
 * Comparison Indicators Component
 *
 * ARCHITECTURE: Presenter Component - Visual indicators for metric changes.
 *
 * Features:
 * - Change indicators (up/down arrows with percentages)
 * - Color-coded improvement/decline visualization
 * - Tooltips with detailed statistics
 * - Multiple display variants (badge, inline, detailed)
 *
 * @see DASH-COMPARISON-UI acceptance criteria
 * @see src/lib/schemas/dashboard/comparison.ts
 */

import { memo } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  ArrowUp,
  ArrowDown,
  AlertTriangle,
  CheckCircle,
  HelpCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import type {
  MetricComparison,
  TrendDirection,
  SignificanceLevel,
} from '@/lib/schemas/dashboard/comparison';

// ============================================================================
// TYPES
// ============================================================================

export interface ChangeIndicatorProps {
  /** Percentage change */
  change: number;
  /** Whether higher is better for this metric */
  higherIsBetter?: boolean;
  /** Display variant */
  variant?: 'badge' | 'inline' | 'icon-only';
  /** Size of the indicator */
  size?: 'sm' | 'md' | 'lg';
  /** Show tooltip with details */
  showTooltip?: boolean;
  /** Tooltip content */
  tooltipContent?: React.ReactNode;
  /** Additional class name */
  className?: string;
}

export interface MetricComparisonIndicatorProps {
  /** Full comparison data for a metric */
  comparison: MetricComparison;
  /** Display variant */
  variant?: 'compact' | 'detailed';
  /** Show trend analysis */
  showTrend?: boolean;
  /** Show statistical significance */
  showSignificance?: boolean;
  /** Additional class name */
  className?: string;
}

export interface TrendIndicatorProps {
  /** Trend direction */
  direction: TrendDirection;
  /** Whether higher is better */
  higherIsBetter?: boolean;
  /** Size of the indicator */
  size?: 'sm' | 'md' | 'lg';
  /** Show label */
  showLabel?: boolean;
  /** Additional class name */
  className?: string;
}

export interface SignificanceIndicatorProps {
  /** Significance level */
  level: SignificanceLevel;
  /** Z-score if available */
  zScore?: number | null;
  /** Additional class name */
  className?: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const CHANGE_THRESHOLDS = {
  significant: 10, // 10% change is significant
  major: 25, // 25% change is major
  stable: 2, // Less than 2% is considered stable
} as const;

const SIZE_CLASSES = {
  sm: {
    icon: 'h-3 w-3',
    text: 'text-xs',
    badge: 'text-xs px-1.5 py-0.5',
  },
  md: {
    icon: 'h-4 w-4',
    text: 'text-sm',
    badge: 'text-sm px-2 py-1',
  },
  lg: {
    icon: 'h-5 w-5',
    text: 'text-base',
    badge: 'text-base px-2.5 py-1.5',
  },
} as const;

// ============================================================================
// CHANGE INDICATOR
// ============================================================================

/**
 * Shows a percentage change with color-coded visualization.
 */
export const ChangeIndicator = memo(function ChangeIndicator({
  change,
  higherIsBetter = true,
  variant = 'badge',
  size = 'md',
  showTooltip = false,
  tooltipContent,
  className,
}: ChangeIndicatorProps) {
  const absChange = Math.abs(change);
  const isStable = absChange < CHANGE_THRESHOLDS.stable;
  const isPositive = change > 0;
  const isImprovement = higherIsBetter ? isPositive : !isPositive;

  // Determine color based on improvement status
  let colorClasses: string;
  if (isStable) {
    colorClasses = 'text-muted-foreground bg-muted';
  } else if (isImprovement) {
    colorClasses = 'text-green-700 bg-green-100 dark:text-green-400 dark:bg-green-950';
  } else {
    colorClasses = 'text-red-700 bg-red-100 dark:text-red-400 dark:bg-red-950';
  }

  const sizeConfig = SIZE_CLASSES[size];

  // Select appropriate icon
  const Icon = isStable ? Minus : isPositive ? ArrowUp : ArrowDown;

  // Format the change value
  const formattedChange = `${isPositive ? '+' : ''}${change.toFixed(1)}%`;

  const content = (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-md font-medium',
        colorClasses,
        variant === 'badge' && sizeConfig.badge,
        variant === 'inline' && sizeConfig.text,
        variant === 'icon-only' && 'p-1',
        className
      )}
      role="status"
      aria-label={`${isImprovement ? 'Improved' : isStable ? 'Stable' : 'Declined'} by ${Math.abs(change).toFixed(1)}%`}
    >
      <Icon className={sizeConfig.icon} aria-hidden="true" />
      {variant !== 'icon-only' && <span>{formattedChange}</span>}
    </span>
  );

  if (showTooltip && tooltipContent) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>{content}</TooltipTrigger>
          <TooltipContent>{tooltipContent}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return content;
});

// ============================================================================
// TREND INDICATOR
// ============================================================================

/**
 * Shows the trend direction with optional label.
 */
export const TrendIndicator = memo(function TrendIndicator({
  direction,
  higherIsBetter = true,
  size = 'md',
  showLabel = false,
  className,
}: TrendIndicatorProps) {
  const sizeConfig = SIZE_CLASSES[size];

  const isImprovement =
    (direction === 'increasing' && higherIsBetter) ||
    (direction === 'decreasing' && !higherIsBetter);

  let colorClasses: string;
  let Icon: React.ElementType;
  let label: string;

  if (direction === 'stable') {
    colorClasses = 'text-muted-foreground';
    Icon = Minus;
    label = 'Stable';
  } else if (isImprovement) {
    colorClasses = 'text-green-600 dark:text-green-400';
    Icon = TrendingUp;
    label = 'Improving';
  } else {
    colorClasses = 'text-red-600 dark:text-red-400';
    Icon = TrendingDown;
    label = 'Declining';
  }

  return (
    <span
      className={cn('inline-flex items-center gap-1', colorClasses, className)}
      role="status"
      aria-label={label}
    >
      <Icon className={sizeConfig.icon} aria-hidden="true" />
      {showLabel && <span className={sizeConfig.text}>{label}</span>}
    </span>
  );
});

// ============================================================================
// SIGNIFICANCE INDICATOR
// ============================================================================

/**
 * Shows the statistical significance level.
 */
export const SignificanceIndicator = memo(function SignificanceIndicator({
  level,
  zScore,
  className,
}: SignificanceIndicatorProps) {
  const config = {
    high: {
      icon: CheckCircle,
      color: 'text-green-600 dark:text-green-400',
      label: 'Highly Significant',
    },
    moderate: {
      icon: CheckCircle,
      color: 'text-blue-600 dark:text-blue-400',
      label: 'Moderately Significant',
    },
    low: {
      icon: AlertTriangle,
      color: 'text-amber-600 dark:text-amber-400',
      label: 'Low Significance',
    },
    none: {
      icon: HelpCircle,
      color: 'text-muted-foreground',
      label: 'Not Significant',
    },
  }[level];

  const Icon = config.icon;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className={cn('inline-flex items-center gap-1 text-xs', config.color, className)}
          >
            <Icon className="h-3 w-3" aria-hidden="true" />
            <span>{config.label}</span>
          </span>
        </TooltipTrigger>
        <TooltipContent>
          <div className="space-y-1">
            <p className="font-medium">{config.label}</p>
            {zScore != null && (
              <p className="text-xs text-muted-foreground">
                Z-score: {zScore.toFixed(2)}
              </p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
});

// ============================================================================
// METRIC COMPARISON INDICATOR
// ============================================================================

/**
 * Shows comprehensive comparison data for a single metric.
 */
export const MetricComparisonIndicator = memo(function MetricComparisonIndicator({
  comparison,
  variant = 'compact',
  showTrend = true,
  showSignificance = false,
  className,
}: MetricComparisonIndicatorProps) {
  const isInverseMetric = comparison.metric === 'warranty_claims';

  if (variant === 'compact') {
    return (
      <div className={cn('inline-flex items-center gap-2', className)}>
        <ChangeIndicator
          change={comparison.percentageChange}
          higherIsBetter={!isInverseMetric}
          variant="badge"
          size="sm"
        />
        {showTrend && comparison.trend && (
          <TrendIndicator
            direction={comparison.trend.direction}
            higherIsBetter={!isInverseMetric}
            size="sm"
          />
        )}
      </div>
    );
  }

  // Detailed variant
  return (
    <div className={cn('space-y-2', className)}>
      {/* Main change indicator */}
      <div className="flex items-center justify-between">
        <ChangeIndicator
          change={comparison.percentageChange}
          higherIsBetter={!isInverseMetric}
          variant="badge"
          size="md"
          showTooltip
          tooltipContent={
            <div className="space-y-1">
              <p>
                Previous: {formatValue(comparison.previousValue)}
              </p>
              <p>
                Current: {formatValue(comparison.currentValue)}
              </p>
              <p>
                Change: {comparison.absoluteChange >= 0 ? '+' : ''}
                {formatValue(comparison.absoluteChange)}
              </p>
            </div>
          }
        />

        {comparison.improved ? (
          <Badge variant="outline" className="text-green-600 border-green-200">
            Improved
          </Badge>
        ) : (
          <Badge variant="outline" className="text-red-600 border-red-200">
            Declined
          </Badge>
        )}
      </div>

      {/* Trend analysis */}
      {showTrend && comparison.trend && (
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Trend</span>
          <TrendIndicator
            direction={comparison.trend.direction}
            higherIsBetter={!isInverseMetric}
            size="sm"
            showLabel
          />
        </div>
      )}

      {/* Statistical significance */}
      {showSignificance && comparison.significance && (
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Significance</span>
          <SignificanceIndicator
            level={comparison.significance.level}
            zScore={comparison.significance.zScore}
          />
        </div>
      )}

      {/* Forecast if available */}
      {showTrend && comparison.trend?.forecast != null && (
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Forecast</span>
          <span className="font-medium">
            {formatValue(comparison.trend.forecast)}
            <span className="text-muted-foreground ml-1">
              ({(comparison.trend.forecastConfidence ?? 0) * 100}% confidence)
            </span>
          </span>
        </div>
      )}
    </div>
  );
});

// ============================================================================
// HELPERS
// ============================================================================

function formatValue(value: number): string {
  if (Math.abs(value) >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`;
  }
  if (Math.abs(value) >= 1000) {
    return `${(value / 1000).toFixed(1)}K`;
  }
  return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  CHANGE_THRESHOLDS,
};
