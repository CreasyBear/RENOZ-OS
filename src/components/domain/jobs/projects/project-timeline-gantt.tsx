/**
 * ProjectTimelineGantt Component
 *
 * Canonical Gantt for project detail Overview tab.
 *
 * Features:
 * - View modes: Day (14d), Week (7d), Month (30d), Quarter (90d)
 * - Zoom controls (0.5x–2x)
 * - Sticky sidebar + horizontal scroll
 * - Draggable bars with live preview (tasks: move+resize; visits: move only)
 * - Auto-scroll to today when "Today" clicked
 * - Mobile card fallback
 *
 * @see docs/design-system/TIMELINE-GANTT-STANDARDS.md
 * @see _reference/project-management-reference/components/project-timeline.tsx
 */

'use client';

import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import {
  addWeeks,
  subWeeks,
  startOfWeek,
  format,
  isSameDay,
} from 'date-fns';
import { ChevronLeft, ChevronRight, Calendar, Clock, Minus, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useIsMobile } from '@/hooks/_shared/use-mobile';
import {
  formatTimelineTaskDates,
  getTimelineDates,
  MAX_ZOOM,
  MIN_ZOOM,
  NAME_COLUMN_WIDTH,
  ROW_HEIGHT,
  TIMELINE_STATUS_CONFIG,
  VIEW_MODE_CONFIG,
  type TimelineTask,
  type ViewMode,
} from './project-timeline-gantt-config';
import { ProjectTimelineGanttMobileCards } from './project-timeline-gantt-mobile-cards';
import { ProjectTimelineGanttTaskBar } from './project-timeline-gantt-task-bar';

// ============================================================================
// TYPES
// ============================================================================

export type { TimelineTask } from './project-timeline-gantt-config';

interface ProjectTimelineGanttProps {
  tasks: TimelineTask[];
  projectStartDate?: Date;
  projectEndDate?: Date;
  className?: string;
  /** Called when user clicks a task bar. Enables navigation to task/visit detail. */
  onItemClick?: (task: TimelineTask) => void;
  /** Called when user drags/resizes a bar. Enables persistence. */
  onDateChange?: (taskId: string, startDate: Date, endDate: Date) => void;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function ProjectTimelineGantt({
  tasks,
  projectStartDate: projectStartDateProp,
  projectEndDate: projectEndDateProp,
  className,
  onItemClick,
  onDateChange,
}: ProjectTimelineGanttProps) {
  const isMobile = useIsMobile();

  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [zoom, setZoom] = useState(1);
  const [viewStart, setViewStart] = useState(() => {
    const today = new Date();
    if (projectStartDateProp && projectEndDateProp) {
      const start = new Date(projectStartDateProp);
      const end = new Date(projectEndDateProp);
      const rangeStart = start < end ? start : end;
      return startOfWeek(rangeStart, { weekStartsOn: 1 });
    }
    return startOfWeek(today, { weekStartsOn: 1 });
  });

  const config = VIEW_MODE_CONFIG[viewMode];
  const cellWidth = Math.max(20, Math.round(config.baseCellWidth * zoom));
  const dates = useMemo(() => getTimelineDates(viewStart, viewMode), [viewStart, viewMode]);
  const viewEnd = dates[dates.length - 1] ?? viewStart;
  const timelineWidth = dates.length * cellWidth;

  const rangeLabel = useMemo(() => {
    const start = dates[0];
    const end = dates[dates.length - 1];
    if (!start || !end) return '';
    return `${format(start, 'MMM d')} – ${format(end, 'MMM d, yyyy')}`;
  }, [dates]);

  const stats = useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter((t) => t.status === 'completed').length;
    const inProgress = tasks.filter((t) => t.status === 'in_progress').length;
    const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { total, completed, inProgress, progress };
  }, [tasks]);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const shouldScrollToTodayRef = useRef(false);

  const todayOffset = useMemo(() => {
    const idx = dates.findIndex((d) => isSameDay(d, new Date()));
    return idx >= 0 ? idx : null;
  }, [dates]);

  const navigate = useCallback(
    (dir: -1 | 1) => {
      const step = viewMode === 'quarter' ? 12 : viewMode === 'month' ? 4 : viewMode === 'day' ? 2 : 1;
      setViewStart((d) => (dir === 1 ? addWeeks(d, step) : subWeeks(d, step)));
    },
    [viewMode]
  );
  const goToToday = useCallback(() => {
    setViewStart(startOfWeek(new Date(), { weekStartsOn: 1 }));
    shouldScrollToTodayRef.current = true;
  }, []);

  useEffect(() => {
    if (!shouldScrollToTodayRef.current || todayOffset == null) return;
    const el = scrollContainerRef.current;
    if (!el) return;
    const dayX = todayOffset * cellWidth;
    const target = Math.max(0, dayX - el.clientWidth / 2 + cellWidth / 2);
    el.scrollTo({ left: target, behavior: 'smooth' });
    shouldScrollToTodayRef.current = false;
  }, [todayOffset, cellWidth]);

  const handleTaskDateChange = useCallback(
    (taskId: string, startDate: Date, endDate: Date) => {
      onDateChange?.(taskId, startDate, endDate);
    },
    [onDateChange]
  );

  if (isMobile) {
    return (
      <div className={cn('space-y-4', className)}>
        <div>
          <h3 className="text-lg font-semibold">Expected Timeline</h3>
          <p className="text-sm text-muted-foreground">
            {stats.completed} of {stats.total} tasks completed
          </p>
        </div>
        <div className="flex items-center gap-4 p-3 bg-muted/50 rounded-lg">
          <div className="flex-1">
            <div className="flex justify-between text-sm mb-1">
              <span className="text-muted-foreground">Project Progress</span>
              <span className="font-medium">{stats.progress}%</span>
            </div>
            <Progress value={stats.progress} className="h-2" />
          </div>
        </div>
        {tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
            <Calendar className="h-12 w-12 mb-2 opacity-50" />
            <p className="text-sm">No tasks scheduled</p>
          </div>
        ) : (
          <ProjectTimelineGanttMobileCards tasks={tasks} onItemClick={onItemClick} />
        )}
      </div>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold">Expected Timeline</h3>
          <p className="text-sm text-muted-foreground">
            {rangeLabel} · {stats.completed} of {stats.total} tasks completed
          </p>
        </div>

        <div className="flex items-center gap-2">
          {stats.inProgress > 0 && (
            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
              <Clock className="w-3 h-3 mr-1" />
              {stats.inProgress} in progress
            </Badge>
          )}
          <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant={todayOffset != null ? 'default' : 'outline'}
            size="sm"
            onClick={goToToday}
          >
            <Calendar className="h-4 w-4 mr-1" />
            Today
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigate(1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <div className="flex border rounded-md p-0.5">
            {(['day', 'week', 'month', 'quarter'] as const).map((mode) => (
              <Button
                key={mode}
                variant={viewMode === mode ? 'secondary' : 'ghost'}
                size="sm"
                className="capitalize"
                onClick={() => setViewMode(mode)}
              >
                {VIEW_MODE_CONFIG[mode].label}
              </Button>
            ))}
          </div>
          <div className="flex items-center gap-0.5">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setZoom((z) => Math.max(MIN_ZOOM, z / 1.2))}
              disabled={zoom <= MIN_ZOOM}
            >
              <Minus className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setZoom((z) => Math.min(MAX_ZOOM, z * 1.2))}
              disabled={zoom >= MAX_ZOOM}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Progress */}
      <div className="flex items-center gap-4 p-3 bg-muted/50 rounded-lg">
        <div className="flex-1">
          <div className="flex justify-between text-sm mb-1">
            <span className="text-muted-foreground">Project Progress</span>
            <span className="font-medium">{stats.progress}%</span>
          </div>
          <Progress value={stats.progress} className="h-2" />
        </div>
      </div>

      {/* Gantt Chart: sticky sidebar + horizontal scroll */}
      <div className="border rounded-lg overflow-hidden">
        <div ref={scrollContainerRef} className="overflow-x-auto">
          <div className="min-w-max">
            {/* Header row */}
            <div className="flex border-b bg-muted/30 sticky top-0 z-20">
              <div
                className="shrink-0 bg-muted/50 border-r sticky left-0 z-30 flex items-center px-3 py-2"
                style={{ width: NAME_COLUMN_WIDTH }}
              >
                <span className="text-xs font-medium text-muted-foreground">Task</span>
              </div>
              <div className="flex shrink-0" style={{ width: timelineWidth }}>
                {dates.map((day, i) => {
                  const isToday = isSameDay(day, new Date());
                  const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                  const showLabel =
                    viewMode === 'week' ||
                    viewMode === 'day' ||
                    i % 2 === 0 ||
                    day.getDate() === 1 ||
                    (viewMode === 'quarter' && day.getDate() === 1);
                  if (!showLabel) return <div key={i} style={{ width: cellWidth }} className="border-r border-border/20" />;
                  return (
                    <div
                      key={day.toISOString()}
                      className={cn(
                        'flex flex-col items-center justify-center py-2 border-r border-border/20',
                        isToday && 'bg-primary/5',
                        isWeekend && 'bg-muted/20'
                      )}
                      style={{ width: cellWidth }}
                    >
                      <span className={cn('text-xs', isToday ? 'text-primary font-semibold' : 'text-muted-foreground')}>
                        {viewMode === 'quarter' ? format(day, 'MMM') : viewMode === 'month' ? format(day, 'd') : format(day, 'EEE d')}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Task rows */}
            <div className="relative" style={{ minHeight: `${Math.max(200, tasks.length * ROW_HEIGHT + 20)}px` }}>
              {tasks.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
                  <Calendar className="h-12 w-12 mb-2 opacity-50" />
                  <p className="text-sm">No tasks scheduled</p>
                  <p className="text-xs">Add tasks to see them on the timeline</p>
                </div>
              ) : (
                <>
                  {todayOffset != null && (
                    <div
                      className="absolute top-0 bottom-0 w-px bg-primary z-10 pointer-events-none"
                      style={{
                        left: NAME_COLUMN_WIDTH + todayOffset * cellWidth + cellWidth / 2,
                      }}
                    >
                      <div className="absolute -top-1 -translate-x-1/2 bg-primary text-primary-foreground text-[10px] px-1.5 py-0.5 rounded">
                        Today
                      </div>
                    </div>
                  )}

                  {tasks.map((task, index) => (
                    <div
                      key={task.id}
                      className={cn(
                        'flex border-b hover:bg-muted/30 transition-colors',
                        onItemClick && 'cursor-pointer',
                        index % 2 === 0 && 'bg-muted/5'
                      )}
                      style={{ height: ROW_HEIGHT }}
                      onClick={onItemClick ? () => onItemClick(task) : undefined}
                      onKeyDown={
                        onItemClick
                          ? (e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                onItemClick(task);
                              }
                            }
                          : undefined
                      }
                      role={onItemClick ? 'button' : undefined}
                      tabIndex={onItemClick ? 0 : undefined}
                    >
                      <div
                        className="shrink-0 p-2 border-r flex items-center gap-2 min-w-0 sticky left-0 z-10 bg-background"
                        style={{ width: NAME_COLUMN_WIDTH }}
                      >
                        <div className={cn('w-2 h-2 rounded-full flex-shrink-0', TIMELINE_STATUS_CONFIG[task.status].bar)} />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">{task.title}</p>
                          <p className="text-xs text-muted-foreground">{formatTimelineTaskDates(task.startDate, task.endDate)}</p>
                        </div>
                      </div>
                      <div className="relative shrink-0" style={{ width: timelineWidth, height: ROW_HEIGHT }}>
                        <ProjectTimelineGanttTaskBar
                          task={task}
                          viewStart={dates[0]!}
                          viewEnd={viewEnd}
                          cellWidth={cellWidth}
                          onClick={onItemClick ? (e) => { e.stopPropagation(); onItemClick(task); } : undefined}
                          onDateChange={
                            onDateChange
                              ? (start, end) => handleTaskDateChange(task.id, start, end)
                              : undefined
                          }
                        />
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
        {Object.entries(TIMELINE_STATUS_CONFIG).map(([key, config]) => (
          <div key={key} className="flex items-center gap-1.5">
            <div className={cn('w-2 h-2 rounded-full', config.bar)} />
            <span>{config.label}</span>
          </div>
        ))}
        {onDateChange && (
          <span className="text-muted-foreground/70">
            Tasks: drag edges to resize, center to move. Visits: drag to move only.
          </span>
        )}
      </div>
    </div>
  );
}
