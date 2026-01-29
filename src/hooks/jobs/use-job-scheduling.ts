/**
 * Job Scheduling Hooks
 *
 * TanStack Query hooks for calendar views, timeline management, and OAuth calendar sync.
 * Consolidates scheduling-related hooks for job management.
 *
 * @see src/server/functions/jobs/job-calendar.ts
 * @see src/server/functions/jobs/job-timeline.ts
 * @see src/lib/jobs/oauth-bridge.ts
 */

import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { toast } from 'sonner';
import { queryKeys } from '@/lib/query-keys';
import {
  listCalendarJobs,
  listUnscheduledJobs,
  rescheduleJob,
  listCalendarInstallers,
  listCalendarTasksForKanban,
} from '@/server/functions/jobs/job-calendar';
import { listTimelineJobs, getTimelineStats } from '@/server/functions/jobs/job-timeline';
import {
  syncJobToCalendar,
  updateJobCalendarEvent,
  removeJobFromCalendar,
  listAvailableCalendars,
  getCalendarOAuthConnection,
} from '@/server/functions/jobs/oauth-bridge';
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
// CALENDAR VIEW HOOKS
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
      { installerIds: input.installerIds, statuses: input.statuses }
    ),
    queryFn: () => listFn({ data: input }),
    refetchOnWindowFocus: true,
  });
}

/**
 * Get unscheduled jobs for the sidebar.
 */
export function useUnscheduledJobs(input: ListUnscheduledJobsInput = { limit: 50, offset: 0 }) {
  const listFn = useServerFn(listUnscheduledJobs);

  return useQuery({
    queryKey: queryKeys.jobCalendar.unscheduledList({ limit: input.limit, offset: input.offset }),
    queryFn: () => listFn({ data: input }),
  });
}

/**
 * Get installers for the filter dropdown.
 */
export function useCalendarInstallers() {
  const listFn = useServerFn(listCalendarInstallers);

  return useQuery({
    queryKey: queryKeys.jobCalendar.installers({}),
    queryFn: () => listFn({}),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// ============================================================================
// TIMELINE VIEW HOOKS
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
      { installerIds: input.installerIds, statuses: input.statuses }
    ),
    queryFn: () => listFn({ data: input }),
    refetchOnWindowFocus: true,
  });
}

/**
 * Get timeline statistics for a date range.
 */
export function useTimelineStats(input: ListTimelineJobsInput) {
  const statsFn = useServerFn(getTimelineStats);

  return useQuery({
    queryKey: queryKeys.jobCalendar.timelineStats(input.startDate, input.endDate),
    queryFn: () => statsFn({ data: input }),
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

// ============================================================================
// KANBAN CALENDAR HOOKS
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
      { installerIds: input.installerIds, statuses: input.statuses }
    ),
    queryFn: () => listFn({ data: input }),
    refetchOnWindowFocus: true,
  });
}

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
// SCHEDULING MUTATIONS
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
      if (context?.previousData) {
        context.previousData.forEach((data, keyString) => {
          const queryKey = JSON.parse(keyString);
          queryClient.setQueryData(queryKey, data);
        });
      }
    },
    onSettled: () => {
      onJobDataChanged();
    },
  });
}

// ============================================================================
// OAUTH CALENDAR SYNC
// ============================================================================

/**
 * Hook to get the current calendar OAuth connection for the organization.
 */
export function useCalendarOAuthConnection() {
  const getConnectionFn = useServerFn(getCalendarOAuthConnection);
  
  return useQuery({
    queryKey: queryKeys.jobCalendar.oauth.connection(),
    queryFn: () => getConnectionFn(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
  });
}

/**
 * Hook to list available calendars for OAuth sync.
 */
export function useAvailableCalendars() {
  const listCalendarsFn = useServerFn(listAvailableCalendars);
  
  return useQuery({
    queryKey: queryKeys.jobCalendar.oauth.calendars(),
    queryFn: () => listCalendarsFn(),
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

/**
 * Hook to sync a job to the connected calendar.
 */
export function useSyncJobToCalendar() {
  const queryClient = useQueryClient();
  const syncFn = useServerFn(syncJobToCalendar);

  return useMutation({
    mutationFn: async (jobData: {
      id: string;
      title: string;
      description?: string;
      scheduledDate: Date;
      scheduledTime?: string;
      duration?: number;
      installerName?: string;
      location?: string;
    }) => {
      const result = await syncFn({ data: jobData });

      if (!result.success) {
        throw new Error(result.error || 'Failed to sync job to calendar');
      }

      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.jobCalendar.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.jobCalendar.oauth.all() });

      toast.success('Job synced to calendar', {
        description: 'Event created in your connected calendar',
      });
    },
    onError: (error) => {
      toast.error('Calendar sync failed', {
        description: error instanceof Error ? error.message : 'Unknown error occurred',
      });
    },
  });
}

/**
 * Hook to update an existing job calendar event.
 */
export function useUpdateJobCalendarEvent() {
  const queryClient = useQueryClient();
  const updateFn = useServerFn(updateJobCalendarEvent);

  return useMutation({
    mutationFn: async (params: {
      jobId: string;
      updates: {
        title?: string;
        description?: string;
        scheduledDate?: Date;
        scheduledTime?: string;
        duration?: number;
        location?: string;
      };
    }) => {
      const result = await updateFn({ data: params });

      if (!result.success) {
        throw new Error(result.error || 'Failed to update calendar event');
      }

      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.jobCalendar.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.jobCalendar.oauth.all() });

      toast.success('Calendar event updated', {
        description: 'Job changes synced to your calendar',
      });
    },
    onError: (error) => {
      toast.error('Calendar update failed', {
        description: error instanceof Error ? error.message : 'Failed to update calendar event',
      });
    },
  });
}

/**
 * Hook to remove a job from the calendar.
 */
export function useRemoveJobFromCalendar() {
  const queryClient = useQueryClient();
  const removeFn = useServerFn(removeJobFromCalendar);

  return useMutation({
    mutationFn: async (jobId: string) => {
      const result = await removeFn({ data: { jobId } });

      if (!result.success) {
        throw new Error(result.error || 'Failed to remove job from calendar');
      }

      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.jobCalendar.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.jobCalendar.oauth.all() });

      toast.success('Job removed from calendar', {
        description: 'Calendar event has been deleted',
      });
    },
    onError: (error) => {
      toast.error('Calendar removal failed', {
        description: error instanceof Error ? error.message : 'Failed to remove from calendar',
      });
    },
  });
}

/**
 * Hook to check if calendar OAuth is configured and active.
 */
export function useCalendarOAuthStatus() {
  const { data: connection, isLoading } = useCalendarOAuthConnection();

  return {
    isConfigured: !!connection && connection.isActive,
    connection,
    isLoading,
    provider: connection?.provider,
    calendarName: connection?.calendarName,
  };
}

/**
 * Hook to get calendar sync statistics.
 */
export function useCalendarSyncStats(organizationId: string) {
  return useQuery({
    queryKey: [...queryKeys.jobCalendar.oauth.status(), 'stats', organizationId] as const,
    queryFn: async () => {
      // This would query the OAuth sync logs for calendar operations
      return {
        totalEvents: 0,
        syncedToday: 0,
        lastSync: null as Date | null,
        syncErrors: 0,
      };
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: !!organizationId,
  });
}
