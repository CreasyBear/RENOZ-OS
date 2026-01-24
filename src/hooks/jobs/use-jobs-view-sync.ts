/**
 * Jobs View Synchronization Hook
 *
 * Ensures all job views (calendar, timeline, kanban) stay synchronized
 * when data changes occur. Handles real-time updates and cross-view consistency.
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';

// Note: useJobsViewSync is imported from jobs-view-context

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
        queryClient.invalidateQueries({ queryKey: queryKeys.jobs.all });
        queryClient.invalidateQueries({ queryKey: queryKeys.jobAssignments.all });
        queryClient.invalidateQueries({ queryKey: queryKeys.jobTasks.all });
        queryClient.invalidateQueries({ queryKey: queryKeys.jobCalendar.all });
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
      await queryClient.invalidateQueries({ queryKey: queryKeys.jobs.all });
      await queryClient.invalidateQueries({ queryKey: queryKeys.jobAssignments.all });
      await queryClient.invalidateQueries({ queryKey: queryKeys.jobCalendar.all });
      return true;
    },
    refetchInterval: pollInterval,
    refetchIntervalInBackground: true,
    staleTime: pollInterval,
  });

  return {
    // Force immediate refresh
    refresh: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.jobs.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.jobAssignments.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.jobCalendar.all });
    },
  };
}
