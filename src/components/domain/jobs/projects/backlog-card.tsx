/**
 * Backlog Card Component
 *
 * Displays project workstream and task summary.
 * Adapted from reference project patterns.
 *
 * @path src/components/domain/jobs/projects/backlog-card.tsx
 */

import { CheckCircle2, Circle, Clock, Layers } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

// ============================================================================
// TYPES
// ============================================================================

interface BacklogCardProps {
  workstreamCount: number;
  taskStats: {
    total: number;
    completed: number;
    inProgress: number;
    pending: number;
  };
}

// ============================================================================
// COMPONENT
// ============================================================================

export function BacklogCard({ workstreamCount, taskStats }: BacklogCardProps) {
  const completionRate = taskStats.total > 0 
    ? Math.round((taskStats.completed / taskStats.total) * 100) 
    : 0;

  return (
    <Card className="border-border/70 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium flex items-center gap-2">
          <Layers className="h-4 w-4" />
          Backlog
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Workstream Count */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Workstreams</span>
          <span className="font-medium">{workstreamCount}</span>
        </div>

        {/* Task Stats */}
        <div className="grid grid-cols-3 gap-2">
          <div className="text-center p-2 rounded-lg bg-muted">
            <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
              <CheckCircle2 className="h-3.5 w-3.5" />
            </div>
            <div className="text-lg font-semibold">{taskStats.completed}</div>
            <div className="text-xs text-muted-foreground">Done</div>
          </div>

          <div className="text-center p-2 rounded-lg bg-muted">
            <div className="flex items-center justify-center gap-1 text-blue-500 mb-1">
              <Clock className="h-3.5 w-3.5" />
            </div>
            <div className="text-lg font-semibold">{taskStats.inProgress}</div>
            <div className="text-xs text-muted-foreground">Active</div>
          </div>

          <div className="text-center p-2 rounded-lg bg-muted">
            <div className="flex items-center justify-center gap-1 text-gray-400 mb-1">
              <Circle className="h-3.5 w-3.5" />
            </div>
            <div className="text-lg font-semibold">{taskStats.pending}</div>
            <div className="text-xs text-muted-foreground">Pending</div>
          </div>
        </div>

        {/* Completion Rate */}
        {taskStats.total > 0 && (
          <div className="pt-1">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Completion</span>
              <span className="font-medium">{completionRate}%</span>
            </div>
            <div className="mt-1.5 h-1.5 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-green-500 transition-all duration-300"
                style={{ width: `${completionRate}%` }}
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
