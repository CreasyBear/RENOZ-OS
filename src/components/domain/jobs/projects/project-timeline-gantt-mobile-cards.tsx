import { useMemo } from 'react';
import { differenceInDays, format } from 'date-fns';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  TIMELINE_STATUS_CONFIG,
  type TimelineTask,
} from './project-timeline-gantt-config';

export interface ProjectTimelineGanttMobileCardsProps {
  tasks: TimelineTask[];
  onItemClick?: (task: TimelineTask) => void;
}

export function ProjectTimelineGanttMobileCards({
  tasks,
  onItemClick,
}: ProjectTimelineGanttMobileCardsProps) {
  const sorted = useMemo(
    () => [...tasks].sort((a, b) => a.startDate.getTime() - b.startDate.getTime()),
    [tasks]
  );

  return (
    <div className="space-y-2">
      {sorted.map((task) => {
        const status = TIMELINE_STATUS_CONFIG[task.status];
        const duration = differenceInDays(task.endDate, task.startDate) + 1;
        return (
          <button
            key={task.id}
            type="button"
            onClick={() => onItemClick?.(task)}
            className={cn(
              'w-full text-left p-4 rounded-lg border transition-colors',
              status.bg,
              status.border,
              onItemClick && 'cursor-pointer hover:shadow-md'
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="font-medium text-sm truncate">{task.title}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {format(task.startDate, 'MMM d')} – {format(task.endDate, 'MMM d')}
                </p>
              </div>
              <Badge variant="secondary" className="shrink-0">
                {duration} {duration === 1 ? 'day' : 'days'}
              </Badge>
            </div>
            <div className="flex items-center gap-2 mt-2">
              <div className={cn('w-2 h-2 rounded-full', status.bar)} />
              <span className={cn('text-xs', status.text)}>{status.label}</span>
              {task.progress > 0 && <span className={cn('text-xs', status.text)}>{task.progress}%</span>}
            </div>
          </button>
        );
      })}
    </div>
  );
}
