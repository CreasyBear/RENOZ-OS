/**
 * Time Card Component
 *
 * Displays project timeline summary with progress visualization.
 * Adapted from reference project patterns.
 *
 * @path src/components/domain/jobs/projects/time-card.tsx
 */

import { Clock, Calendar } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { format, differenceInDays } from 'date-fns';

// ============================================================================
// TYPES
// ============================================================================

interface TimeCardProps {
  startDate?: string | null;
  targetCompletionDate?: string | null;
  actualCompletionDate?: string | null;
  progressPercent: number;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function TimeCard({
  startDate,
  targetCompletionDate,
  actualCompletionDate,
  progressPercent,
}: TimeCardProps) {
  const today = new Date();
  const target = targetCompletionDate ? new Date(targetCompletionDate) : null;
  const actual = actualCompletionDate ? new Date(actualCompletionDate) : null;
  const start = startDate ? new Date(startDate) : null;

  // Calculate days remaining or overdue
  const daysRemaining = target
    ? differenceInDays(target, today)
    : null;

  const isOverdue = daysRemaining !== null && daysRemaining < 0 && !actual;
  const isCompleted = !!actual;

  // Format labels
  const daysLabel = isCompleted
    ? 'Completed'
    : daysRemaining === null
      ? 'No due date'
      : daysRemaining === 0
        ? 'Due today'
        : daysRemaining > 0
          ? `${daysRemaining} days remaining`
          : `${Math.abs(daysRemaining)} days overdue`;

  const progressLabel = isCompleted
    ? '100%'
    : `${progressPercent}%`;

  return (
    <Card className="border-border/70 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium">Time</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Timeline Info */}
        <div className="space-y-2">
          {start && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Start
              </span>
              <span className="font-medium">
                {format(start, 'd MMM yyyy')}
              </span>
            </div>
          )}

          {(target || actual) && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                {actual ? 'Completed' : 'Due Date'}
              </span>
              <span className="font-medium">
                {format(actual || target!, 'd MMM yyyy')}
              </span>
            </div>
          )}
        </div>

        {/* Days Remaining */}
        <div className="pt-1">
          <div className="flex items-center justify-between text-sm">
            <span className={isOverdue ? 'text-red-500 font-medium' : 'text-muted-foreground'}>
              {daysLabel}
            </span>
            <span className="text-muted-foreground">{progressLabel}</span>
          </div>
          <Progress 
            className="mt-2 h-1.5" 
            value={isCompleted ? 100 : progressPercent}
          />
        </div>
      </CardContent>
    </Card>
  );
}
