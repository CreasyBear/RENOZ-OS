/**
 * Progress Bar Component
 *
 * ARCHITECTURE: Presenter Component - Pure UI, receives all data via props.
 *
 * Displays a progress bar with color coding based on percentage achieved.
 * Supports displaying percentage text and handles 100%+ achieved states.
 *
 * Features:
 * - Color coding based on percentage (<70% red, 70-90% amber, >90% green)
 * - Checkmark icon for 100%+ achieved
 * - ARIA attributes for accessibility
 * - Visual capped at 100% but shows actual percentage
 *
 * @see _reference/.reui-reference/registry/default/blocks/cards/statistic-cards/statistic-card-1.tsx
 */

import { memo } from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================================================
// TYPES
// ============================================================================

export interface ProgressBarProps {
  /** @source Dashboard target data - current value achieved */
  current: number;
  /** @source Dashboard target data - target value */
  target: number;
  /** @source Optional label for the progress bar */
  label?: string;
  /** @source Show percentage text next to bar */
  showPercentage?: boolean;
  /** @source Optional className */
  className?: string;
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Calculate the percentage of progress toward target.
 * Returns 0 if target is 0 to avoid division by zero.
 */
function calculatePercentage(current: number, target: number): number {
  if (target <= 0) return 0;
  return (current / target) * 100;
}

/**
 * Get the appropriate background color class based on percentage.
 *
 * Color coding:
 * - < 70%: red (bg-red-500)
 * - 70-90%: amber (bg-amber-500)
 * - > 90%: green (bg-green-500)
 */
function getColorClass(percentage: number): string {
  if (percentage < 70) return 'bg-red-500';
  if (percentage <= 90) return 'bg-amber-500';
  return 'bg-green-500';
}

/**
 * Format the percentage for display.
 */
function formatPercentage(percentage: number): string {
  return `${Math.round(percentage)}%`;
}

/**
 * Get the visual width percentage for the progress bar.
 * Capped at 100% for visual display.
 */
function getVisualWidth(percentage: number): number {
  return Math.min(percentage, 100);
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

/**
 * Displays a progress bar with color-coded fill based on percentage achieved.
 *
 * ARCHITECTURE: Presenter Component - receives all data via props from container.
 * NO data hooks (useQuery, useMutation) - only local UI state allowed.
 */
export const ProgressBar = memo(function ProgressBar({
  current,
  target,
  label,
  showPercentage = false,
  className,
}: ProgressBarProps) {
  const percentage = calculatePercentage(current, target);
  const visualWidth = getVisualWidth(percentage);
  const colorClass = getColorClass(percentage);
  const isComplete = percentage >= 100;
  const ariaLabel = label || 'Progress toward target';

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {/* Progress bar container */}
      <div
        role="progressbar"
        aria-valuenow={current}
        aria-valuemin={0}
        aria-valuemax={target}
        aria-label={ariaLabel}
        className="relative h-2 flex-1 overflow-hidden rounded-full bg-muted"
      >
        {/* Progress fill */}
        <div
          className={cn(
            'h-full rounded-full transition-all duration-300',
            colorClass
          )}
          style={{ width: `${visualWidth}%` }}
        />
      </div>

      {/* Percentage display and/or checkmark */}
      {(showPercentage || isComplete) && (
        <div className="flex items-center gap-1">
          {isComplete && (
            <Check
              className="h-4 w-4 text-green-500"
              aria-label="Target achieved"
            />
          )}
          {showPercentage && (
            <span className="text-sm font-medium text-muted-foreground">
              {formatPercentage(percentage)}
            </span>
          )}
        </div>
      )}
    </div>
  );
});
