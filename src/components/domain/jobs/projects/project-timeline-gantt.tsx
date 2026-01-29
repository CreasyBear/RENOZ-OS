/**
 * ProjectTimelineGantt Component
 *
 * Week-based timeline Gantt for project detail view.
 * Combines existing JobsTimeline patterns with reference Gantt features.
 *
 * SPRINT-03: New component for project-centric jobs model
 */

'use client';

import { useState, useMemo } from 'react';
import {
  addDays,
  addWeeks,
  subWeeks,
  startOfWeek,
  format,
  isSameDay,
  differenceInCalendarDays,
} from 'date-fns';
import { ChevronLeft, ChevronRight, Calendar, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

// ============================================================================
// TYPES
// ============================================================================

interface TimelineTask {
  id: string;
  title: string;
  startDate: Date;
  endDate: Date;
  status: 'todo' | 'in_progress' | 'completed' | 'blocked';
  progress: number;
  assignee?: {
    name: string;
    avatar?: string;
  };
  workstreamName?: string;
}

interface ProjectTimelineGanttProps {
  tasks: TimelineTask[];
  projectStartDate?: Date;
  projectEndDate?: Date;
  className?: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const STATUS_CONFIG = {
  todo: {
    label: 'To Do',
    bg: 'bg-slate-100',
    border: 'border-slate-200',
    text: 'text-slate-700',
    bar: 'bg-slate-400',
  },
  in_progress: {
    label: 'In Progress',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    text: 'text-blue-700',
    bar: 'bg-blue-500',
  },
  completed: {
    label: 'Completed',
    bg: 'bg-green-50',
    border: 'border-green-200',
    text: 'text-green-700',
    bar: 'bg-green-500',
  },
  blocked: {
    label: 'Blocked',
    bg: 'bg-red-50',
    border: 'border-red-200',
    text: 'text-red-700',
    bar: 'bg-red-500',
  },
};

const DAY_COLUMN_WIDTH = 60;
const ROW_HEIGHT = 48;

// ============================================================================
// HELPERS
// ============================================================================

function getWeekDays(weekStart: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
}

function formatTaskDates(start: Date, end: Date): string {
  const sameMonth = start.getMonth() === end.getMonth();
  const sameYear = start.getFullYear() === end.getFullYear();
  
  if (sameMonth && sameYear) {
    return `${format(start, 'MMM d')} - ${format(end, 'd')}`;
  }
  if (sameYear) {
    return `${format(start, 'MMM d')} - ${format(end, 'MMM d')}`;
  }
  return `${format(start, 'MMM d, yyyy')} - ${format(end, 'MMM d, yyyy')}`;
}

// ============================================================================
// TASK BAR COMPONENT
// ============================================================================

interface TaskBarProps {
  task: TimelineTask;
  weekStart: Date;
  onClick?: () => void;
}

function TaskBar({ task, weekStart, onClick }: TaskBarProps) {
  const weekEnd = addDays(weekStart, 6);
  
  // Calculate if task is visible in current week
  const isVisible = task.startDate <= weekEnd && task.endDate >= weekStart;
  if (!isVisible) return null;

  // Calculate position
  const daysFromWeekStart = Math.max(0, differenceInCalendarDays(task.startDate, weekStart));
  const startOffset = daysFromWeekStart * DAY_COLUMN_WIDTH;
  
  // Calculate width
  const visibleStart = task.startDate < weekStart ? weekStart : task.startDate;
  const visibleEnd = task.endDate > weekEnd ? weekEnd : task.endDate;
  const durationDays = differenceInCalendarDays(visibleEnd, visibleStart) + 1;
  const width = Math.max(DAY_COLUMN_WIDTH * 0.8, durationDays * DAY_COLUMN_WIDTH - 8);

  const status = STATUS_CONFIG[task.status];

  return (
    <div
      className={cn(
        'absolute h-8 rounded-md border cursor-pointer transition-all',
        'hover:shadow-md hover:scale-[1.02]',
        status.bg,
        status.border
      )}
      style={{
        left: `${startOffset + 4}px`,
        width: `${width}px`,
        top: '8px',
      }}
      onClick={onClick}
    >
      {/* Progress fill */}
      <div
        className={cn('absolute inset-y-0 left-0 rounded-l-md opacity-30', status.bar)}
        style={{ width: `${task.progress}%` }}
      />
      
      {/* Content */}
      <div className="relative flex items-center h-full px-2 gap-2 min-w-0">
        <span className={cn('text-xs font-medium truncate flex-1', status.text)}>
          {task.title}
        </span>
        {task.progress > 0 && (
          <span className={cn('text-[10px] tabular-nums', status.text)}>
            {task.progress}%
          </span>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function ProjectTimelineGantt({
  tasks,
  projectStartDate: _projectStartDate,
  projectEndDate: _projectEndDate,
  className,
}: ProjectTimelineGanttProps) {
  // State
  const [currentWeekStart, setCurrentWeekStart] = useState(() => {
    const today = new Date();
    return startOfWeek(today, { weekStartsOn: 1 });
  });

  // Memoized calculations
  const weekDays = useMemo(() => getWeekDays(currentWeekStart), [currentWeekStart]);
  
  const weekRange = useMemo(() => {
    const start = weekDays[0];
    const end = weekDays[6];
    const sameMonth = start.getMonth() === end.getMonth();
    return {
      label: sameMonth
        ? format(start, 'MMMM yyyy')
        : `${format(start, 'MMM')} - ${format(end, 'MMM yyyy')}`,
      sublabel: `Week of ${format(start, 'MMM d')}`,
    };
  }, [weekDays]);

  const stats = useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter(t => t.status === 'completed').length;
    const inProgress = tasks.filter(t => t.status === 'in_progress').length;
    const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { total, completed, inProgress, progress };
  }, [tasks]);

  // Navigation handlers
  const goToPreviousWeek = () => setCurrentWeekStart(prev => subWeeks(prev, 1));
  const goToNextWeek = () => setCurrentWeekStart(prev => addWeeks(prev, 1));
  const goToToday = () => setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }));

  // Check if today is in current week
  const isCurrentWeek = weekDays.some(day => isSameDay(day, new Date()));

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Expected Timeline</h3>
          <p className="text-sm text-muted-foreground">
            {weekRange.label} · {stats.completed} of {stats.total} tasks completed
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Stats badges */}
          {stats.inProgress > 0 && (
            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
              <Clock className="w-3 h-3 mr-1" />
              {stats.inProgress} in progress
            </Badge>
          )}
          
          {/* Navigation */}
          <Button
            variant="outline"
            size="sm"
            onClick={goToPreviousWeek}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          
          <Button
            variant={isCurrentWeek ? 'default' : 'outline'}
            size="sm"
            onClick={goToToday}
          >
            <Calendar className="h-4 w-4 mr-1" />
            Today
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={goToNextWeek}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Overall Progress */}
      <div className="flex items-center gap-4 p-3 bg-muted/50 rounded-lg">
        <div className="flex-1">
          <div className="flex justify-between text-sm mb-1">
            <span className="text-muted-foreground">Project Progress</span>
            <span className="font-medium">{stats.progress}%</span>
          </div>
          <Progress value={stats.progress} className="h-2" />
        </div>
      </div>

      {/* Gantt Chart */}
      <div className="border rounded-lg overflow-hidden">
        {/* Day Headers */}
        <div className="grid" style={{ gridTemplateColumns: `200px repeat(7, ${DAY_COLUMN_WIDTH}px)` }}>
          {/* Task name column header */}
          <div className="p-3 border-b border-r bg-muted/50 font-medium text-sm">
            Task
          </div>
          
          {/* Day columns */}
          {weekDays.map((day, i) => {
            const isToday = isSameDay(day, new Date());
            const isWeekend = i >= 5;
            
            return (
              <div
                key={day.toISOString()}
                className={cn(
                  'p-2 border-b text-center',
                  isToday && 'bg-primary/5',
                  isWeekend && 'bg-muted/30',
                  i < 6 && 'border-r'
                )}
              >
                <div className={cn('text-xs font-medium', isToday && 'text-primary')}>
                  {format(day, 'EEE')}
                </div>
                <div className={cn(
                  'text-lg font-semibold',
                  isToday ? 'text-primary' : 'text-foreground'
                )}>
                  {format(day, 'd')}
                </div>
              </div>
            );
          })}
        </div>

        {/* Tasks */}
        <div className="relative" style={{ minHeight: `${Math.max(200, tasks.length * ROW_HEIGHT + 20)}px` }}>
          {tasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
              <Calendar className="h-12 w-12 mb-2 opacity-50" />
              <p className="text-sm">No tasks scheduled</p>
              <p className="text-xs">Add tasks to see them on the timeline</p>
            </div>
          ) : (
            <>
              {/* Today indicator line */}
              {isCurrentWeek && (
                <div
                  className="absolute top-0 bottom-0 w-px bg-primary z-10 pointer-events-none"
                  style={{
                    left: `${200 + differenceInCalendarDays(new Date(), weekDays[0]) * DAY_COLUMN_WIDTH + DAY_COLUMN_WIDTH / 2}px`,
                  }}
                >
                  <div className="absolute -top-1 -translate-x-1/2 bg-primary text-primary-foreground text-[10px] px-1.5 py-0.5 rounded">
                    Today
                  </div>
                </div>
              )}

              {/* Task rows */}
              {tasks.map((task, index) => (
                <div
                  key={task.id}
                  className={cn(
                    'grid border-b hover:bg-muted/30 transition-colors',
                    index % 2 === 0 && 'bg-muted/10'
                  )}
                  style={{
                    gridTemplateColumns: `200px repeat(7, ${DAY_COLUMN_WIDTH}px)`,
                    height: `${ROW_HEIGHT}px`,
                  }}
                >
                  {/* Task name cell */}
                  <div className="p-2 border-r flex items-center gap-2 min-w-0">
                    <div className={cn(
                      'w-2 h-2 rounded-full flex-shrink-0',
                      STATUS_CONFIG[task.status].bar
                    )} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{task.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatTaskDates(task.startDate, task.endDate)}
                      </p>
                    </div>
                  </div>

                  {/* Timeline cell */}
                  <div className="col-span-7 relative">
                    <TaskBar task={task} weekStart={weekDays[0]} />
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
        {Object.entries(STATUS_CONFIG).map(([key, config]) => (
          <div key={key} className="flex items-center gap-1.5">
            <div className={cn('w-2 h-2 rounded-full', config.bar)} />
            <span>{config.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
