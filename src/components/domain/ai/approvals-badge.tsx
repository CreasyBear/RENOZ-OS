/**
 * AI Approvals Badge Component
 *
 * Displays pending AI approval count as a badge indicator.
 * Used in navigation/sidebar to alert users of pending actions.
 *
 * ARCHITECTURE: Container Component - Uses hooks, composes presenter.
 *
 * @see _Initiation/_prd/3-integrations/ai-infrastructure/ai-infrastructure.prd.json (AI-INFRA-007)
 */

import { memo } from 'react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useAIPendingApprovalsCount } from '@/hooks/ai';

// ============================================================================
// TYPES
// ============================================================================

export interface ApprovalsBadgeProps {
  /** Whether to show loading state */
  showLoading?: boolean;
  /** Maximum count to display (shows "9+" if exceeded) */
  maxCount?: number;
  /** Display variant */
  variant?: 'default' | 'dot' | 'count';
  /** Optional className */
  className?: string;
}

// ============================================================================
// PRESENTER COMPONENT
// ============================================================================

interface ApprovalsBadgePresenterProps {
  count: number;
  isLoading: boolean;
  showLoading: boolean;
  maxCount: number;
  variant: 'default' | 'dot' | 'count';
  className?: string;
}

const ApprovalsBadgePresenter = memo(function ApprovalsBadgePresenter({
  count,
  isLoading,
  showLoading,
  maxCount,
  variant,
  className,
}: ApprovalsBadgePresenterProps) {
  // Loading state
  if (isLoading && showLoading) {
    return <Skeleton className={cn('h-5 w-5 rounded-full', className)} />;
  }

  // No pending approvals
  if (count === 0) {
    return null;
  }

  // Format display count
  const displayCount = count > maxCount ? `${maxCount}+` : String(count);

  // Dot variant - just shows a dot indicator
  if (variant === 'dot') {
    return (
      <span
        className={cn(
          'h-2 w-2 rounded-full bg-destructive animate-pulse',
          className
        )}
        aria-label={`${count} pending approvals`}
      />
    );
  }

  // Count variant - inline count
  if (variant === 'count') {
    return (
      <span
        className={cn(
          'text-xs font-medium text-destructive',
          className
        )}
        aria-label={`${count} pending approvals`}
      >
        ({displayCount})
      </span>
    );
  }

  // Default variant - full badge
  return (
    <Badge
      variant="destructive"
      className={cn(
        'h-5 min-w-5 px-1.5 text-xs font-semibold',
        className
      )}
      aria-label={`${count} pending approvals`}
    >
      {displayCount}
    </Badge>
  );
});

// ============================================================================
// CONTAINER COMPONENT
// ============================================================================

/**
 * Badge showing count of pending AI approvals.
 *
 * Variants:
 * - `default`: Full badge with count
 * - `dot`: Simple dot indicator
 * - `count`: Inline count text
 *
 * Automatically polls for updates every 30 seconds.
 */
export const ApprovalsBadge = memo(function ApprovalsBadge({
  showLoading = false,
  maxCount = 9,
  variant = 'default',
  className,
}: ApprovalsBadgeProps) {
  const { data: count = 0, isLoading } = useAIPendingApprovalsCount();

  return (
    <ApprovalsBadgePresenter
      count={count}
      isLoading={isLoading}
      showLoading={showLoading}
      maxCount={maxCount}
      variant={variant}
      className={className}
    />
  );
});

// ============================================================================
// STATIC VARIANT (for non-hook usage)
// ============================================================================

export interface StaticApprovalsBadgeProps {
  /** Count to display */
  count: number;
  /** Maximum count to display (shows "9+" if exceeded) */
  maxCount?: number;
  /** Display variant */
  variant?: 'default' | 'dot' | 'count';
  /** Optional className */
  className?: string;
}

/**
 * Static version that accepts count as prop (for SSR or non-hook contexts).
 */
export const StaticApprovalsBadge = memo(function StaticApprovalsBadge({
  count,
  maxCount = 9,
  variant = 'default',
  className,
}: StaticApprovalsBadgeProps) {
  return (
    <ApprovalsBadgePresenter
      count={count}
      isLoading={false}
      showLoading={false}
      maxCount={maxCount}
      variant={variant}
      className={className}
    />
  );
});
