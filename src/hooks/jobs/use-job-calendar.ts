/**
 * Job Calendar TanStack Query Hooks
 *
 * Provides data fetching and mutation hooks for job calendar operations.
 * Uses TanStack Query for caching, invalidation, and optimistic updates.
 *
 * @see src/server/functions/job-calendar.ts for server functions
 * @see src/lib/schemas/job-calendar.ts for types
 * @see _Initiation/_prd/2-domains/jobs/jobs.prd.json - DOM-JOBS-005a/b
 */

import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { queryKeys } from '@/lib/query-keys';
import {
  listCalendarJobs,
  listUnscheduledJobs,
  rescheduleJob,
  listCalendarInstallers,
  listCalendarTasksForKanban,
} from '@/server/functions/jobs/job-calendar';
import { listTimelineJobs, getTimelineStats } from '@/server/functions/jobs/job-timeline';
import { useJobDataMutationSync } from './use-jobs-view-sync';
import type {
  ListCalendarJobsInput,
  ListUnscheduledJobsInput,
  RescheduleJobInput,
  CalendarJobEvent,
} from '@/lib/schemas';
import type {
  ListTimelineJobsInput,
  TimelineJobItem,
} from '@/lib/schemas/jobs/job-timeline';

// ============================================================================
// QUERY KEYS
// ============================================================================

// Query keys are now centralized in @/lib/query-keys.ts

// ============================================================================
// CALENDAR EVENTS QUERY
// ============================================================================

/**
 * Get calendar events for a date range.
 */
export function useCalendarJobs(input: ListCalendarJobsInput) {
  const listFn = useServerFn(listCalendarJobs);

  return useQuery({
    queryKey: queryKeys.jobCalendar.eventsRange(
      input.startDate,
      input.endDate,
      input.installerIds,
      input.statuses
    ),
    queryFn: () => listFn({ data: input }),
    // Refetch when window regains focus for up-to-date schedule
    refetchOnWindowFocus: true,
  });
}

// ============================================================================
// UNSCHEDULED JOBS QUERY
// ============================================================================

/**
 * Get unscheduled jobs for the sidebar.
 */
export function useUnscheduledJobs(input: ListUnscheduledJobsInput = { limit: 50, offset: 0 }) {
  const listFn = useServerFn(listUnscheduledJobs);

  return useQuery({
    queryKey: queryKeys.jobCalendar.unscheduledList(input.limit, input.offset),
    queryFn: () => listFn({ data: input }),
  });
}

// ============================================================================
// INSTALLERS QUERY
// ============================================================================

/**
 * Get installers for the filter dropdown.
 */
export function useCalendarInstallers() {
  const listFn = useServerFn(listCalendarInstallers);

  return useQuery({
    queryKey: queryKeys.jobCalendar.installers(),
    queryFn: () => listFn({}),
    // Installers list rarely changes
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// ============================================================================
// RESCHEDULE MUTATION
// ============================================================================

/**
 * Reschedule a job to a new date/time with optimistic update.
 */
export function useRescheduleJob() {
  const queryClient = useQueryClient();
  const rescheduleFn = useServerFn(rescheduleJob);
  const { onJobDataChanged } = useJobDataMutationSync();

  return useMutation({
    mutationFn: (input: RescheduleJobInput) => rescheduleFn({ data: input }),
    onMutate: async (variables) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.jobCalendar.events() });

      // Get all calendar event queries and update optimistically
      const queryCache = queryClient.getQueryCache();
      const eventQueries = queryCache.findAll({
        queryKey: queryKeys.jobCalendar.events(),
      });

      // Store previous values for rollback
      const previousData: Map<string, unknown> = new Map();

      eventQueries.forEach((query) => {
        const queryKey = query.queryKey as readonly unknown[];
        const keyString = JSON.stringify(queryKey);
        const data = queryClient.getQueryData(queryKey);
        previousData.set(keyString, data);

        // Optimistically update the event's date
        if (data && typeof data === 'object' && 'events' in data) {
          const typedData = data as { events: CalendarJobEvent[]; total: number };
          const updatedEvents = typedData.events.map((event) => {
            if (event.id === variables.jobId) {
              const newStart = new Date(variables.newDate);
              if (variables.newTime) {
                const [hours, minutes] = variables.newTime.split(':').map(Number);
                newStart.setHours(hours, minutes, 0, 0);
              } else {
                newStart.setHours(event.start.getHours(), event.start.getMinutes(), 0, 0);
              }
              const duration = event.end.getTime() - event.start.getTime();
              const newEnd = new Date(newStart.getTime() + duration);
              return { ...event, start: newStart, end: newEnd };
            }
            return event;
          });

          queryClient.setQueryData(queryKey, {
            ...typedData,
            events: updatedEvents,
          });
        }
      });

      return { previousData };
    },
    onError: (_err, _variables, context) => {
      // Rollback on error
      if (context?.previousData) {
        context.previousData.forEach((data, keyString) => {
          const queryKey = JSON.parse(keyString);
          queryClient.setQueryData(queryKey, data);
        });
      }
    },
    onSettled: () => {
      // Use centralized synchronization to update all views
      onJobDataChanged();
    },
  });
}

// ============================================================================
// CALENDAR KANBAN VIEW QUERY
// ============================================================================

/**
 * Get calendar tasks for kanban view with time-slot positioning.
 */
export function useCalendarTasksForKanban(input: ListCalendarJobsInput) {
  const listFn = useServerFn(listCalendarTasksForKanban);

  return useQuery({
    queryKey: queryKeys.jobCalendar.kanbanRange(
      input.startDate,
      input.endDate,
      input.installerIds,
      input.statuses
    ),
    queryFn: () => listFn({ data: input }),
    // Refetch when window regains focus for up-to-date schedule
    refetchOnWindowFocus: true,
  });
}

// ============================================================================
// CALENDAR VIEW HOOK (Main hook for weekly calendar)
// ============================================================================

/**
 * Main hook for job calendar kanban view with time-slot calculations.
 */
export function useJobCalendarKanban(input: ListCalendarJobsInput) {
  const query = useCalendarTasksForKanban(input);

  // Calculate time slot positions for tasks
  const tasksWithPositions = React.useMemo(() => {
    if (!query.data?.tasks) return [];

    return query.data.tasks.map((task) => {
      // Calculate position relative to 8 AM start time (typical work day)
      const workDayStart = new Date(task.startTime);
      workDayStart.setHours(8, 0, 0, 0);

      const minutesFromStart = (task.startTime.getTime() - workDayStart.getTime()) / (1000 * 60);
      const durationInSlots = Math.max(1, Math.ceil(task.duration / 15)); // 15-minute slots

      return {
        ...task,
        position: {
          top: Math.max(0, minutesFromStart),
          height: task.duration,
          slots: durationInSlots,
        },
        timeSlot: {
          start: task.startTime,
          end: task.endTime,
          duration: task.duration,
        },
      };
    });
  }, [query.data?.tasks]);

  return {
    ...query,
    tasks: tasksWithPositions,
    total: query.data?.total ?? 0,
  };
}

// ============================================================================
// TIMELINE HOOKS
// ============================================================================

/**
 * Get timeline jobs for a date range with span calculations.
 */
export function useTimelineJobs(input: ListTimelineJobsInput) {
  const listFn = useServerFn(listTimelineJobs);

  return useQuery({
    queryKey: queryKeys.jobCalendar.timelineRange(
      input.startDate,
      input.endDate,
      input.installerIds,
      input.statuses
    ),
    queryFn: () => listFn({ data: input }),
    // Refetch when window regains focus for up-to-date schedule
    refetchOnWindowFocus: true,
  });
}

/**
 * Get timeline statistics for a date range.
 */
export function useTimelineStats(input: ListTimelineJobsInput) {
  const statsFn = useServerFn(getTimelineStats);

  return useQuery({
    queryKey: queryKeys.jobCalendar.timelineStats(
      input.startDate,
      input.endDate,
      input.installerIds,
      input.statuses
    ),
    queryFn: () => statsFn({ data: input }),
    // Stats can be cached longer
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Main hook for jobs timeline with organized data for visualization.
 */
export function useJobsTimeline(input: ListTimelineJobsInput) {
  const timelineQuery = useTimelineJobs(input);
  const statsQuery = useTimelineStats(input);

  // Organize timeline items into rows to prevent overlapping
  const organizedRows = React.useMemo(() => {
    if (!timelineQuery.data?.items) return [];

    const items = timelineQuery.data.items;
    const rows: TimelineJobItem[][] = [];

    // Sort items by start date and duration (longest first)
    const sortedItems = [...items].sort((a, b) => {
      if (a.timelineSpan.startIndex !== b.timelineSpan.startIndex) {
        return a.timelineSpan.startIndex - b.timelineSpan.startIndex;
      }
      return b.timelineSpan.spanDays - a.timelineSpan.spanDays;
    });

    // Place items in rows without overlapping
    sortedItems.forEach((item) => {
      let placed = false;

      // Try to place in existing row
      for (const row of rows) {
        const hasOverlap = row.some((existingItem) => {
          return !(
            item.timelineSpan.endIndex < existingItem.timelineSpan.startIndex ||
            item.timelineSpan.startIndex > existingItem.timelineSpan.endIndex
          );
        });

        if (!hasOverlap) {
          row.push(item);
          placed = true;
          break;
        }
      }

      // Create new row if couldn't place in existing rows
      if (!placed) {
        rows.push([item]);
      }
    });

    return rows;
  }, [timelineQuery.data?.items]);

  return {
    timelineItems: organizedRows,
    totalItems: timelineQuery.data?.total ?? 0,
    weekStart: timelineQuery.data?.weekStart,
    weekEnd: timelineQuery.data?.weekEnd,
    stats: statsQuery.data,
    isLoading: timelineQuery.isLoading || statsQuery.isLoading,
    error: timelineQuery.error || statsQuery.error,
    refetch: () => {
      timelineQuery.refetch();
      statsQuery.refetch();
    },
  };
}
