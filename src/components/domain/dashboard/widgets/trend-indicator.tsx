/**
 * Trend Indicator Component
 *
 * ARCHITECTURE: Presenter Component - Pure UI, receives all data via props.
 *
 * Displays a percentage change with directional icon and color coding.
 * Supports inverted colors for metrics where down is good (e.g., warranty claims).
 *
 * Features:
 * - Directional icons (ArrowUp, ArrowDown, Minus)
 * - Color coding based on positive/negative/neutral values
 * - Inverted color mode for "down is good" metrics
 * - Accessible with role="status"
 *
 * @see _reference/.reui-reference/registry/default/blocks/cards/statistic-cards/statistic-card-1.tsx
 */

import { memo } from 'react';
import { ArrowUp, ArrowDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================================================
// TYPES
// ============================================================================

export interface TrendIndicatorProps {
  /** @source Dashboard metrics data - percentage change */
  value: number;
  /** @source Dashboard metrics data - comparison period description */
  period: string;
  /** @source Optional - invert colors for metrics where down is good (e.g., warranty claims) */
  invertColors?: boolean;
  /** @source Optional className */
  className?: string;
}

// ============================================================================
// HELPERS
// ============================================================================

const TREND_ICONS = {
  up: ArrowUp,
  down: ArrowDown,
  neutral: Minus,
} as const;

/**
 * Format the percentage value for display.
 * Adds + prefix for positive values, - is already included for negative.
 */
function formatPercentage(value: number): string {
  const absValue = Math.abs(value);
  const formatted = absValue.toFixed(1);

  if (value > 0) return `+${formatted}%`;
  if (value < 0) return `-${formatted}%`;
  return `${formatted}%`;
}

/**
 * Get color classes based on value and invertColors setting.
 *
 * Normal mode:
 * - Positive (value > 0): green
 * - Negative (value < 0): red
 * - Zero: muted gray
 *
 * Inverted mode (for metrics where down is good):
 * - Positive (value > 0): red (bad - e.g., more warranty claims)
 * - Negative (value < 0): green (good - e.g., fewer warranty claims)
 * - Zero: muted gray
 */
function getTrendColorClasses(value: number, invertColors: boolean): string {
  if (value === 0) {
    return 'text-muted-foreground';
  }

  const isPositive = value > 0;
  const showGreen = invertColors ? !isPositive : isPositive;

  return showGreen ? 'text-green-600' : 'text-red-600';
}

/**
 * Generate accessible label for screen readers.
 */
function getAriaLabel(value: number, period: string, invertColors: boolean): string {
  const direction = value > 0 ? 'increased' : value < 0 ? 'decreased' : 'unchanged';
  const sentiment = invertColors
    ? value > 0
      ? '(negative trend)'
      : value < 0
        ? '(positive trend)'
        : ''
    : value > 0
      ? '(positive trend)'
      : value < 0
        ? '(negative trend)'
        : '';

  return `${direction} ${Math.abs(value).toFixed(1)}% ${period} ${sentiment}`.trim();
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

/**
 * Displays a trend indicator with icon, percentage, and period.
 *
 * ARCHITECTURE: Presenter Component - receives all data via props from container.
 * NO data hooks (useQuery, useMutation) - only local UI state allowed.
 */
export const TrendIndicator = memo(function TrendIndicator({
  value,
  period,
  invertColors = false,
  className,
}: TrendIndicatorProps) {
  const IconComponent =
    value > 0 ? TREND_ICONS.up : value < 0 ? TREND_ICONS.down : TREND_ICONS.neutral;
  const colorClasses = getTrendColorClasses(value, invertColors);
  const formattedValue = formatPercentage(value);
  const ariaLabel = getAriaLabel(value, period, invertColors);

  return (
    <span
      role="status"
      aria-label={ariaLabel}
      className={cn(
        'inline-flex items-center gap-1 text-sm font-medium',
        colorClasses,
        className
      )}
    >
      <IconComponent className="h-4 w-4" aria-hidden="true" />
      <span>
        {formattedValue} vs {period}
      </span>
    </span>
  );
});
