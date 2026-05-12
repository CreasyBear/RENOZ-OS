/**
 * Jobs View Synchronization Hook
 *
 * Ensures all job views (calendar, timeline, kanban) stay synchronized
 * when data changes occur. Handles real-time updates and cross-view consistency.
 */

import { useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';

// Note: useJobsViewSync is imported from jobs-view-context

async function invalidateJobCalendarViewFamilies(queryClient: QueryClient) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.jobCalendar.eventsAll() }),
    queryClient.invalidateQueries({ queryKey: queryKeys.jobCalendar.eventDetails() }),
    queryClient.invalidateQueries({ queryKey: queryKeys.jobCalendar.eventsRanges() }),
    queryClient.invalidateQueries({ queryKey: queryKeys.jobCalendar.unscheduledLists() }),
    queryClient.invalidateQueries({ queryKey: queryKeys.jobCalendar.installerLists() }),
    queryClient.invalidateQueries({ queryKey: queryKeys.jobCalendar.kanbanRanges() }),
    queryClient.invalidateQueries({ queryKey: queryKeys.jobCalendar.timelineRanges() }),
    queryClient.invalidateQueries({ queryKey: queryKeys.jobCalendar.timelineStatsAll() }),
  ]);
}

async function invalidateJobAssignmentViewFamilies(queryClient: QueryClient) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.jobs.lists() }),
    queryClient.invalidateQueries({ queryKey: queryKeys.jobs.active() }),
    queryClient.invalidateQueries({ queryKey: queryKeys.jobs.activeProjectsAll() }),
    queryClient.invalidateQueries({ queryKey: queryKeys.jobAssignments.lists() }),
    queryClient.invalidateQueries({ queryKey: queryKeys.jobAssignments.kanbanSelectors() }),
    invalidateJobCalendarViewFamilies(queryClient),
  ]);
}

async function invalidateJobTaskViewFamilies(queryClient: QueryClient) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.jobTasks.lists() }),
    queryClient.invalidateQueries({ queryKey: queryKeys.jobTasks.kanban.all }),
    queryClient.invalidateQueries({ queryKey: queryKeys.jobTasks.myTasks.all }),
  ]);
}

/**
 * Hook for handling job data mutations with cross-view synchronization
 * Automatically invalidates relevant queries when job data changes
 */
export function useJobDataMutationSync() {
  const queryClient = useQueryClient();

  return {
    // Call this after any job data mutation to ensure all views are updated
    onJobDataChanged: () => {
      // Small delay to ensure server-side changes are processed
      setTimeout(() => {
        void invalidateJobAssignmentViewFamilies(queryClient);
        void invalidateJobTaskViewFamilies(queryClient);
      }, 100);
    },

    // Optimistic update helper for immediate UI feedback
    createOptimisticUpdate: <T>(
      queryKey: readonly unknown[],
      updater: (oldData: T | undefined) => T | undefined
    ) => {
      queryClient.setQueryData(queryKey, updater);
    },

    // Rollback helper for failed mutations
    rollbackOptimisticUpdate: (queryKey: readonly unknown[], oldData: unknown) => {
      queryClient.setQueryData(queryKey, oldData);
    },
  };
}

/**
 * Hook for real-time job updates (polling-based for now)
 * Can be extended with WebSocket support later
 */
export function useRealtimeJobUpdates(pollInterval = 30000) {
  const queryClient = useQueryClient();

  useQuery({
    queryKey: queryKeys.jobs.viewSync(pollInterval),
    queryFn: async () => {
      await invalidateJobAssignmentViewFamilies(queryClient);
      return true;
    },
    refetchInterval: pollInterval,
    refetchIntervalInBackground: true,
    staleTime: pollInterval,
  });

  return {
    // Force immediate refresh
    refresh: () => {
      void invalidateJobAssignmentViewFamilies(queryClient);
    },
  };
}
