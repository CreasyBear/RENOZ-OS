import { useMemo } from 'react';
import { isPast, isToday } from 'date-fns';
import { AlertCircle, CheckCircle2, CheckSquare, Timer } from 'lucide-react';

import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import type { TaskWithWorkstream } from '@/lib/schemas/jobs';

export interface ProjectTaskSummaryCardsProps {
  tasks: TaskWithWorkstream[];
}

export function ProjectTaskSummaryCards({ tasks }: ProjectTaskSummaryCardsProps) {
  const stats = useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter(t => t.status === 'completed').length;
    const inProgress = tasks.filter(t => t.status === 'in_progress').length;

    const overdue = tasks.filter(t => {
      if (t.status === 'completed' || !t.dueDate) return false;
      return isPast(new Date(t.dueDate)) && !isToday(new Date(t.dueDate));
    }).length;

    const totalHours = tasks.reduce((sum, t) => sum + (t.estimatedHours || 0), 0);
    const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

    return {
      total,
      completed,
      inProgress,
      overdue,
      totalHours,
      progress,
    };
  }, [tasks]);

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-100">
              <CheckSquare className="h-4 w-4 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Tasks</p>
              <p className="text-xl font-semibold">{stats.total}</p>
            </div>
          </div>
          <div className="flex gap-2 mt-2 text-xs">
            <span className="text-green-600">{stats.completed} done</span>
            <span className="text-muted-foreground">•</span>
            <span className="text-blue-600">{stats.inProgress} active</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-100">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Progress</p>
              <p className="text-xl font-semibold">{stats.progress}%</p>
            </div>
          </div>
          <Progress value={stats.progress} className="mt-2 h-1.5" />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-100">
              <Timer className="h-4 w-4 text-purple-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Est. Hours</p>
              <p className="text-xl font-semibold">{stats.totalHours}h</p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Across {tasks.filter(t => t.estimatedHours).length} tasks
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className={cn(
              'p-2 rounded-lg',
              stats.overdue > 0 ? 'bg-red-100' : 'bg-green-100'
            )}>
              <AlertCircle className={cn(
                'h-4 w-4',
                stats.overdue > 0 ? 'text-red-600' : 'text-green-600'
              )} />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Overdue</p>
              <p className={cn(
                'text-xl font-semibold',
                stats.overdue > 0 ? 'text-red-600' : ''
              )}>
                {stats.overdue}
              </p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            {stats.overdue > 0 ? 'Tasks need attention' : 'All on track'}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
