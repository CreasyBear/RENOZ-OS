/**
 * Progress Card - Project Sidebar
 *
 * Displays project progress, task completion, and budget status.
 * Pure presenter component - receives all data via props.
 *
 * @see docs/design-system/PROJECTS-DOMAIN-PHILOSOPHY.md Part 4.1 Zone 5B
 */

import { TrendingUp, CheckCircle2, DollarSign } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ProgressCircle } from '../progress-circle';
import { cn } from '@/lib/utils';

// ============================================================================
// TYPES
// ============================================================================

export interface ProgressCardProps {
  /** Progress percentage (0-100) */
  progressPercent: number;
  /** Number of completed tasks */
  completedTasks: number;
  /** Total number of tasks */
  totalTasks: number;
  /** Estimated budget */
  estimatedBudget?: number | null;
  /** Actual cost so far */
  actualCost?: number | null;
  /** Currency code for formatting */
  currency?: string;
  className?: string;
}

// ============================================================================
// HELPERS
// ============================================================================

function formatCurrency(amount: number, currency = 'AUD'): string {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function getBudgetStatus(
  estimated: number | null | undefined,
  actual: number | null | undefined
): { label: string; color: string } {
  if (!estimated || !actual) {
    return { label: 'N/A', color: 'text-muted-foreground' };
  }

  const variance = ((actual - estimated) / estimated) * 100;

  if (variance <= -5) {
    return { label: `${Math.abs(Math.round(variance))}% under`, color: 'text-green-600' };
  } else if (variance >= 5) {
    return { label: `${Math.round(variance)}% over`, color: 'text-red-600' };
  }
  return { label: 'On target', color: 'text-muted-foreground' };
}

// ============================================================================
// COMPONENT
// ============================================================================

export function ProgressCard({
  progressPercent,
  completedTasks,
  totalTasks,
  estimatedBudget,
  actualCost,
  currency = 'AUD',
  className,
}: ProgressCardProps) {
  const budgetStatus = getBudgetStatus(estimatedBudget, actualCost);
  const taskPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  return (
    <Card className={cn('shadow-none', className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          Progress
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Overall Progress */}
        <div className="flex items-center gap-3">
          <ProgressCircle
            progress={progressPercent}
            size={48}
            strokeWidth={4}
            showLabel
          />
          <div className="flex-1">
            <div className="text-sm font-medium">{progressPercent}% Complete</div>
            <Progress value={progressPercent} className="h-1.5 mt-1" />
          </div>
        </div>

        {/* Task Completion */}
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
            Tasks
          </div>
          <div>
            <span className="font-medium">{completedTasks}</span>
            <span className="text-muted-foreground">/{totalTasks}</span>
            <span className="text-muted-foreground ml-1">({taskPercent}%)</span>
          </div>
        </div>

        {/* Budget Status */}
        {(estimatedBudget || actualCost) && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <DollarSign className="h-4 w-4" aria-hidden="true" />
                Budget
              </div>
              <span className={cn('text-xs font-medium', budgetStatus.color)}>
                {budgetStatus.label}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <div className="text-muted-foreground">Estimated</div>
                <div className="font-medium">
                  {estimatedBudget ? formatCurrency(estimatedBudget, currency) : '—'}
                </div>
              </div>
              <div>
                <div className="text-muted-foreground">Actual</div>
                <div className="font-medium">
                  {actualCost ? formatCurrency(actualCost, currency) : '—'}
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
