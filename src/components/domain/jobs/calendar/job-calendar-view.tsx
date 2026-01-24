'use client';

import { format } from 'date-fns';
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { JobCalendarWeekHeader } from './job-calendar-week-header';
import { JobCalendarHoursColumn } from './job-calendar-hours-column';
import { JobCalendarDayColumn } from './job-calendar-day-column';
import { JobEventCard } from './job-event-card';
import { JobCalendarControls } from './job-calendar-controls';
import type { CalendarKanbanTask } from '@/lib/schemas';
import type { JobsFilterBarFilters, JobsFilterBarInstaller } from '../jobs-filter-bar';

type CalendarKanbanTaskWithPosition = CalendarKanbanTask & {
  position: { top: number; height: number; slots: number };
  timeSlot: { start: Date; end: Date; duration: number };
};

interface JobCalendarViewProps {
  /** Source: route container view state. */
  currentWeekStart: Date;
  /** Source: route container view state. */
  onWeekChange: (date: Date) => void;
  /** Source: route container view state. */
  installerIds?: string[];
  /** Source: route container view state. */
  onInstallerFilterChange?: (ids: string[]) => void;
  /** Source: route container view state. */
  filters: JobsFilterBarFilters;
  /** Source: `useCalendarInstallers` in the route container. */
  installers: JobsFilterBarInstaller[];
  /** Source: route container view state. */
  onFiltersChange: (filters: JobsFilterBarFilters) => void;
  /** Source: `useExportCalendarData` in the route container. */
  onExport: (format: 'ics' | 'csv' | 'json') => void;
  /** Source: `useCalendarOAuthStatus` in the route container. */
  isOAuthConfigured: boolean;
  /** Source: `useCalendarOAuthStatus` in the route container. */
  oauthProvider?: 'google' | 'outlook' | null;
  /** Source: `useCalendarOAuthStatus` in the route container. */
  oauthLoading?: boolean;
  /** Source: route container navigation handler. */
  onManageIntegrations?: () => void;
  /** Source: route container handler. */
  onCreateTemplate?: () => void;
  /** Source: `useJobCalendarKanban` in the route container. */
  tasks: CalendarKanbanTaskWithPosition[];
  /** Source: `useJobCalendarKanban` in the route container. */
  isLoading?: boolean;
  /** Source: `useJobCalendarKanban` in the route container. */
  error?: Error | null;
  /** Source: `useRescheduleJob` in the route container. */
  onReschedule?: (taskId: string, newDate: string, newTime: string) => Promise<void>;
}

export function JobCalendarView({
  currentWeekStart,
  onWeekChange,
  installerIds: _installerIds = [],
  onInstallerFilterChange: _onInstallerFilterChange,
  filters,
  installers,
  onFiltersChange,
  onExport,
  isOAuthConfigured,
  oauthProvider,
  oauthLoading,
  onManageIntegrations,
  onCreateTemplate,
  tasks,
  isLoading = false,
  error = null,
  onReschedule,
}: JobCalendarViewProps) {
  const [currentTime, setCurrentTime] = useState<Date>(() => new Date());
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeTask, setActiveTask] = useState<CalendarKanbanTaskWithPosition | null>(null);
  const [announcement, setAnnouncement] = useState<string>('');
  const hoursScrollRef = useRef<HTMLDivElement>(null);
  const daysScrollRefs = useRef<(HTMLDivElement | null)[]>([]);
  const hasScrolledRef = useRef(false);

  // Calculate week dates (Monday to Sunday)
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(currentWeekStart);
    date.setDate(currentWeekStart.getDate() + i);
    return date;
  });

  // Configure sensors for drag detection
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px movement before drag starts
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Update every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  // Auto-scroll to 8 AM on mount
  useEffect(() => {
    const scrollToStart = () => {
      if (!hasScrolledRef.current && hoursScrollRef.current) {
        // Scroll to 8 AM (8 hours * 60 minutes * pixels per minute)
        // Assuming 1 hour = 120px, 8 AM = 8 * 120 = 960px
        const pixelsPerHour = 120;
        const eightAMOffset = 8 * pixelsPerHour;
        hoursScrollRef.current.scrollTop = eightAMOffset;
        daysScrollRefs.current.forEach((ref) => {
          if (ref) ref.scrollTop = eightAMOffset;
        });
        hasScrolledRef.current = true;
      }
    };

    scrollToStart();
    const timeoutId = setTimeout(scrollToStart, 100);
    return () => clearTimeout(timeoutId);
  }, [weekDays]);

  // Handle synchronized scrolling
  const handleHoursScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const scrollTop = e.currentTarget.scrollTop;
    daysScrollRefs.current.forEach((ref) => {
      if (ref) ref.scrollTop = scrollTop;
    });
  };

  const handleDayScroll = (index: number) => (e: React.UIEvent<HTMLDivElement>) => {
    const scrollTop = e.currentTarget.scrollTop;
    if (hoursScrollRef.current) {
      hoursScrollRef.current.scrollTop = scrollTop;
    }
    daysScrollRefs.current.forEach((ref, idx) => {
      if (ref && idx !== index) ref.scrollTop = scrollTop;
    });
  };

  // Group tasks by day
  const tasksByDay = weekDays.map((day) => {
    const dayStr = format(day, 'yyyy-MM-dd');
    return tasks.filter((task) => format(task.startTime, 'yyyy-MM-dd') === dayStr);
  });

  const isTodayInWeek = weekDays.some(
    (day) => format(day, 'yyyy-MM-dd') === format(currentTime, 'yyyy-MM-dd')
  );

  // Calculate current time position for today
  const currentTimePosition = useMemo(() => {
    const today = weekDays.find(
      (day) => format(day, 'yyyy-MM-dd') === format(currentTime, 'yyyy-MM-dd')
    );

    if (!today) return null;

    const now = new Date();
    const hoursSince6AM = now.getHours() - 6 + now.getMinutes() / 60;
    return Math.max(0, hoursSince6AM * 120); // 120px per hour
  }, [currentTime, weekDays]);

  // Drag handlers
  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const { active } = event;
      const taskId = active.id as string;

      // Find the task being dragged
      const draggedTask = tasks.find((task) => task.id === taskId) || null;

      setActiveId(taskId);
      setActiveTask(draggedTask);
      setAnnouncement(`Picked up task ${draggedTask?.title}. Drag to a time slot to reschedule.`);
    },
    [tasks, setActiveId, setActiveTask, setAnnouncement]
  );

  const handleDragOver = useCallback(
    (event: DragOverEvent) => {
      const { over } = event;
      if (over && activeTask) {
        // Parse the drop target ID (format: "timeslot-{dayIndex}-{hour}-{minute}")
        const overId = over.id as string;
        if (overId.startsWith('timeslot-')) {
          const [, dayIndexStr, hourStr, minuteStr] = overId.split('-');
          const dayIndex = parseInt(dayIndexStr);
          const hour = parseInt(hourStr);
          const minute = parseInt(minuteStr);

          const targetDate = new Date(weekDays[dayIndex]);
          targetDate.setHours(hour, minute, 0, 0);

          const dayName = format(targetDate, 'EEEE');
          const timeStr = format(targetDate, 'h:mm a');

          setAnnouncement(
            `Task ${activeTask.title} over ${dayName} at ${timeStr}. Release to schedule here.`
          );
        }
      }
    },
    [activeTask, weekDays, setAnnouncement]
  );

  // Event creation and editing handlers
  const handleCreateEvent = useCallback(
    (date: Date, timeSlot: string) => {
      // For now, just log the event. In a full implementation, this would open a dialog
      console.log(`Create event on ${format(date, 'yyyy-MM-dd')} at ${timeSlot}`);
      setAnnouncement(
        `Event creation not yet implemented. Would create event on ${format(date, 'EEEE')} at ${timeSlot}.`
      );
    },
    [setAnnouncement]
  );

  const handleEditEvent = useCallback(
    (taskId: string) => {
      // For now, just log the event. In a full implementation, this would open an edit dialog
      const task = tasks.find((t) => t.id === taskId);
      console.log(`Edit event: ${task?.title}`);
      setAnnouncement(`Event editing not yet implemented. Would edit "${task?.title}".`);
    },
    [tasks, setAnnouncement]
  );

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;
      const taskId = active.id as string;

      setActiveId(null);

      if (!over) {
        setAnnouncement(`Cancelled moving task ${activeTask?.title}.`);
        setActiveTask(null);
        return;
      }

      const overId = over.id as string;

      // Handle time slot drops
      if (overId.startsWith('timeslot-') && activeTask) {
        const [, dayIndexStr, hourStr, minuteStr] = overId.split('-');
        const dayIndex = parseInt(dayIndexStr);
        const hour = parseInt(hourStr);
        const minute = parseInt(minuteStr);

        const targetDate = new Date(weekDays[dayIndex]);
        targetDate.setHours(hour, minute, 0, 0);

        const newDate = format(targetDate, 'yyyy-MM-dd');
        const newTime = format(targetDate, 'HH:mm');

        try {
          if (onReschedule) {
            await onReschedule(taskId, newDate, newTime);
          }

          const dayName = format(targetDate, 'EEEE');
          const timeStr = format(targetDate, 'h:mm a');
          setAnnouncement(
            `Successfully rescheduled ${activeTask.title} to ${dayName} at ${timeStr}.`
          );
        } catch (error) {
          setAnnouncement(`Failed to reschedule ${activeTask.title}.`);
          console.error('Failed to reschedule job:', error);
        }
      } else {
        setAnnouncement(`Task ${activeTask?.title} returned to original position.`);
      }

      setActiveTask(null);
    },
    [activeTask, weekDays, onReschedule, setActiveTask, setActiveId, setAnnouncement]
  );

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <div className="border-primary mx-auto h-8 w-8 animate-spin rounded-full border-b-2"></div>
          <p className="text-muted-foreground mt-2 text-sm">Loading calendar...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <p className="text-destructive text-sm">Failed to load calendar</p>
          <p className="text-muted-foreground mt-1 text-xs">
            {error.message || 'Please try again'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="bg-background flex h-full flex-col">
        {/* Header with controls */}
        <div className="border-border border-b px-6 py-4">
          <JobCalendarControls
            currentWeekStart={currentWeekStart}
            onWeekChange={onWeekChange}
            filters={filters}
            installers={installers}
            onFiltersChange={onFiltersChange}
            onExport={onExport}
            isOAuthConfigured={isOAuthConfigured}
            oauthProvider={oauthProvider}
            oauthLoading={oauthLoading}
            onManageIntegrations={onManageIntegrations}
            onCreateTemplate={onCreateTemplate}
          />
        </div>

        {/* Calendar Grid */}
        <div className="flex-1 overflow-hidden">
          <JobCalendarWeekHeader
            weekDays={weekDays}
            onPreviousWeek={() =>
              onWeekChange(new Date(currentWeekStart.getTime() - 7 * 24 * 60 * 60 * 1000))
            }
            onNextWeek={() =>
              onWeekChange(new Date(currentWeekStart.getTime() + 7 * 24 * 60 * 60 * 1000))
            }
          />

          <div className="flex h-full w-max min-w-full">
            <JobCalendarHoursColumn onScroll={handleHoursScroll} scrollRef={hoursScrollRef} />

            {weekDays.map((day, dayIndex) => {
              const dayTasks = tasksByDay[dayIndex] || [];
              const isToday = currentTime
                ? format(day, 'yyyy-MM-dd') === format(currentTime, 'yyyy-MM-dd')
                : false;

              return (
                <JobCalendarDayColumn
                  key={day.toISOString()}
                  day={day}
                  dayIndex={dayIndex}
                  tasks={dayTasks}
                  isToday={isToday}
                  isTodayInWeek={isTodayInWeek}
                  currentTime={currentTime}
                  currentTimePosition={isToday ? currentTimePosition : null}
                  activeId={activeId}
                  onCreateEvent={handleCreateEvent}
                  onEditEvent={handleEditEvent}
                  onScroll={handleDayScroll}
                  scrollRef={(el) => {
                    daysScrollRefs.current[dayIndex] = el;
                  }}
                />
              );
            })}
          </div>
        </div>

        {/* Drag Overlay */}
        <DragOverlay>
          {activeTask ? (
            <div className="rotate-3 opacity-90">
              <JobEventCard task={activeTask} />
            </div>
          ) : null}
        </DragOverlay>

        {/* Screen reader announcements */}
        {announcement && (
          <div role="status" aria-live="polite" className="sr-only">
            {announcement}
          </div>
        )}
      </div>
    </DndContext>
  );
}
