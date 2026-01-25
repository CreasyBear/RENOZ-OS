/**
 * Star Rating Component
 *
 * Interactive 5-star rating component with hover states and keyboard support.
 * Can be used in both editable and read-only modes.
 *
 * @see _Initiation/_prd/2-domains/support/support.prd.json - DOM-SUP-005a
 */

'use client';

import { useState, useCallback } from 'react';
import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

// Rating labels for accessibility
const RATING_LABELS: Record<number, string> = {
  1: 'Very Poor',
  2: 'Poor',
  3: 'Average',
  4: 'Good',
  5: 'Excellent',
};

interface StarRatingProps {
  /** Current rating value (1-5) */
  value: number;
  /** Callback when rating changes (omit for read-only) */
  onChange?: (rating: number) => void;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Whether to show the rating label */
  showLabel?: boolean;
  /** Custom class name */
  className?: string;
  /** Whether the component is disabled */
  disabled?: boolean;
}

export function StarRating({
  value,
  onChange,
  size = 'md',
  showLabel = false,
  className,
  disabled = false,
}: StarRatingProps) {
  const [hoverValue, setHoverValue] = useState<number | null>(null);
  const isReadOnly = !onChange || disabled;
  const displayValue = hoverValue ?? value;

  // Size classes
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6',
  };

  const gapClasses = {
    sm: 'gap-0.5',
    md: 'gap-1',
    lg: 'gap-1.5',
  };

  const handleClick = useCallback(
    (rating: number) => {
      if (!isReadOnly) {
        onChange?.(rating);
      }
    },
    [isReadOnly, onChange]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent, rating: number) => {
      if (isReadOnly) return;

      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onChange?.(rating);
      } else if (e.key === 'ArrowRight' && rating < 5) {
        e.preventDefault();
        onChange?.(rating + 1);
      } else if (e.key === 'ArrowLeft' && rating > 1) {
        e.preventDefault();
        onChange?.(rating - 1);
      }
    },
    [isReadOnly, onChange]
  );

  return (
    <div className={cn('flex flex-col', className)}>
      <div className={cn('flex items-center', gapClasses[size])} role="group" aria-label="Rating">
        {[1, 2, 3, 4, 5].map((rating) => {
          const isFilled = rating <= displayValue;
          const isInteractive = !isReadOnly;

          return (
            <button
              key={rating}
              type="button"
              disabled={isReadOnly}
              onClick={() => handleClick(rating)}
              onMouseEnter={() => isInteractive && setHoverValue(rating)}
              onMouseLeave={() => isInteractive && setHoverValue(null)}
              onKeyDown={(e) => handleKeyDown(e, rating)}
              className={cn(
                'focus-visible:ring-ring rounded-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
                isInteractive && 'cursor-pointer transition-transform hover:scale-110',
                isReadOnly && 'cursor-default'
              )}
              aria-label={`${rating} star${rating !== 1 ? 's' : ''} - ${RATING_LABELS[rating]}`}
              aria-pressed={rating <= value}
            >
              <Star
                className={cn(
                  sizeClasses[size],
                  'transition-colors',
                  isFilled
                    ? 'fill-yellow-400 text-yellow-400'
                    : 'text-muted-foreground/40 fill-none'
                )}
              />
            </button>
          );
        })}
      </div>

      {showLabel && displayValue > 0 && (
        <span
          className={cn(
            'text-muted-foreground mt-1',
            size === 'sm' ? 'text-xs' : size === 'md' ? 'text-sm' : 'text-base'
          )}
        >
          {RATING_LABELS[displayValue]}
        </span>
      )}
    </div>
  );
}

// ============================================================================
// RATING BADGE
// ============================================================================

interface RatingBadgeProps {
  /** Rating value (1-5) */
  rating: number;
  /** Size variant */
  size?: 'sm' | 'md';
  /** Custom class name */
  className?: string;
}

export function RatingBadge({ rating, size = 'md', className }: RatingBadgeProps) {
  // Color based on rating
  const colorClasses =
    rating >= 4
      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      : rating >= 3
        ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
        : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';

  const sizeClasses = size === 'sm' ? 'text-xs px-1.5 py-0.5' : 'text-sm px-2 py-1';

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full font-medium',
        colorClasses,
        sizeClasses,
        className
      )}
    >
      <Star className={cn('fill-current', size === 'sm' ? 'h-3 w-3' : 'h-4 w-4')} />
      {rating.toFixed(1)}
    </span>
  );
}
