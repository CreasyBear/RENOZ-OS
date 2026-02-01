/**
 * AI Cost Indicator Component
 *
 * Displays real-time AI usage metrics with budget warnings.
 * Shows daily/monthly usage percentages with visual progress bars.
 *
 * ARCHITECTURE: Presenter Component - Pure UI, receives all data via props.
 *
 * @see _Initiation/_prd/3-integrations/ai-infrastructure/ai-infrastructure.prd.json (AI-INFRA-008)
 */

import { memo } from 'react';
import { AlertCircle, TrendingUp, Wallet } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { AIBudgetStatus } from '@/hooks/ai';

// ============================================================================
// TYPES
// ============================================================================

export interface CostIndicatorProps {
  /** Budget status data from useAIBudget hook */
  budget: AIBudgetStatus | undefined;
  /** Loading state */
  isLoading?: boolean;
  /** Error state */
  error?: Error | null;
  /** Display variant */
  variant?: 'compact' | 'full';
  /** Optional className */
  className?: string;
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Get color class based on usage percentage
 */
function getUsageColor(percentUsed: number): string {
  if (percentUsed >= 95) return 'text-destructive';
  if (percentUsed >= 80) return 'text-amber-600';
  return 'text-muted-foreground';
}

/**
 * Get progress bar color class based on usage percentage
 */
function getProgressColor(percentUsed: number): string {
  if (percentUsed >= 95) return '[&>div]:bg-destructive';
  if (percentUsed >= 80) return '[&>div]:bg-amber-500';
  return '';
}

// ============================================================================
// LOADING STATE
// ============================================================================

function CostIndicatorSkeleton({ variant = 'full' }: { variant?: 'compact' | 'full' }) {
  if (variant === 'compact') {
    return (
      <div className="flex items-center gap-2">
        <Skeleton className="h-4 w-4" />
        <Skeleton className="h-4 w-16" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <Skeleton className="h-5 w-32" />
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-2 w-full" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-2 w-full" />
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// COMPACT VARIANT
// ============================================================================

interface CompactIndicatorProps {
  budget: AIBudgetStatus;
  className?: string;
}

const CompactIndicator = memo(function CompactIndicator({
  budget,
  className,
}: CompactIndicatorProps) {
  const { dailyPercentUsed, warnings } = budget;
  const hasWarning = warnings.dailyWarning || warnings.userWarning;
  const hasCritical = warnings.dailyCritical || warnings.userCritical;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={cn(
              'flex items-center gap-1.5 text-sm',
              hasCritical && 'text-destructive',
              hasWarning && !hasCritical && 'text-amber-600',
              !hasWarning && !hasCritical && 'text-muted-foreground',
              className
            )}
          >
            {hasCritical ? (
              <AlertCircle className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Wallet className="h-4 w-4" aria-hidden="true" />
            )}
            <span className="font-medium">{dailyPercentUsed.toFixed(0)}%</span>
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs">
          <div className="space-y-1 text-sm">
            <p>
              <strong>Daily:</strong> {budget.formatted.dailyUsed} / {budget.formatted.dailyLimit}
            </p>
            <p>
              <strong>Monthly:</strong> {budget.formatted.monthlyUsed} / {budget.formatted.monthlyLimit}
            </p>
            {hasCritical && (
              <p className="text-destructive font-medium">Budget limit approaching!</p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
});

// ============================================================================
// FULL VARIANT
// ============================================================================

interface FullIndicatorProps {
  budget: AIBudgetStatus;
  className?: string;
}

const FullIndicator = memo(function FullIndicator({
  budget,
  className,
}: FullIndicatorProps) {
  const { warnings } = budget;

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Wallet className="h-4 w-4" aria-hidden="true" />
          AI Usage
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Daily Usage */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Daily Budget</span>
            <span className={cn('font-medium', getUsageColor(budget.dailyPercentUsed))}>
              {budget.formatted.dailyUsed} / {budget.formatted.dailyLimit}
            </span>
          </div>
          <Progress
            value={Math.min(budget.dailyPercentUsed, 100)}
            className={cn('h-2', getProgressColor(budget.dailyPercentUsed))}
          />
          {warnings.dailyCritical && (
            <p className="flex items-center gap-1 text-xs text-destructive">
              <AlertCircle className="h-3 w-3" />
              Daily limit almost reached
            </p>
          )}
        </div>

        {/* User Daily Usage */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Your Daily Limit</span>
            <span className={cn('font-medium', getUsageColor(budget.userDailyPercentUsed))}>
              {budget.formatted.userDailyUsed} / {budget.formatted.userDailyLimit}
            </span>
          </div>
          <Progress
            value={Math.min(budget.userDailyPercentUsed, 100)}
            className={cn('h-2', getProgressColor(budget.userDailyPercentUsed))}
          />
          {warnings.userCritical && (
            <p className="flex items-center gap-1 text-xs text-destructive">
              <AlertCircle className="h-3 w-3" />
              Your daily limit almost reached
            </p>
          )}
        </div>

        {/* Monthly Usage */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Monthly Budget</span>
            <span className={cn('font-medium', getUsageColor(budget.monthlyPercentUsed))}>
              {budget.formatted.monthlyUsed} / {budget.formatted.monthlyLimit}
            </span>
          </div>
          <Progress
            value={Math.min(budget.monthlyPercentUsed, 100)}
            className={cn('h-2', getProgressColor(budget.monthlyPercentUsed))}
          />
        </div>

        {/* Trend indicator */}
        <div className="flex items-center gap-1 text-xs text-muted-foreground pt-2 border-t">
          <TrendingUp className="h-3 w-3" />
          <span>
            {budget.dailyRemaining > 0
              ? `${budget.formatted.dailyLimit} remaining today`
              : 'Daily budget exhausted'}
          </span>
        </div>
      </CardContent>
    </Card>
  );
});

// ============================================================================
// MAIN COMPONENT
// ============================================================================

/**
 * Displays AI cost and budget usage with visual indicators.
 *
 * Variants:
 * - `compact`: Small inline indicator with tooltip (for sidebars/headers)
 * - `full`: Full card with progress bars and breakdown
 */
export const CostIndicator = memo(function CostIndicator({
  budget,
  isLoading = false,
  error = null,
  variant = 'full',
  className,
}: CostIndicatorProps) {
  // Loading state
  if (isLoading) {
    return <CostIndicatorSkeleton variant={variant} />;
  }

  // Error state
  if (error) {
    return (
      <div className={cn('flex items-center gap-2 text-sm text-muted-foreground', className)}>
        <AlertCircle className="h-4 w-4 text-destructive" />
        <span>Failed to load usage</span>
      </div>
    );
  }

  // No data
  if (!budget) {
    return null;
  }

  // Render based on variant
  if (variant === 'compact') {
    return <CompactIndicator budget={budget} className={className} />;
  }

  return <FullIndicator budget={budget} className={className} />;
});
