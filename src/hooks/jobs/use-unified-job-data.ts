/**
 * Unified Job Data Hook
 *
 * Ensures all job views use the same data source and mutations.
 * Provides consistent data fetching, caching, and synchronization across views.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  useUnifiedJobs,
  useUnifiedJobData,
  type JobViewType,
} from '@/components/domain/jobs/jobs-unified-context';
import { useCrossViewJobSync } from '@/components/domain/jobs/jobs-unified-context';
import { listCalendarTasksForKanban } from '@/server/functions/jobs/job-calendar';
import {
  listJobAssignments,
  getJobAssignment,
  deleteJobAssignment,
} from '@/server/functions/jobs/job-assignments';
import { updateJobAssignment } from '@/server/functions/jobs/job-assignments';
import type { UpdateJobAssignmentInput } from '@/lib/schemas/jobs/job-assignments';
import { listTimelineJobs, getTimelineStats } from '@/server/functions/jobs/job-timeline';
import { queryKeys } from '@/lib/query-keys';
import { useCurrentOrg } from '@/hooks/auth';

// ============================================================================
// SHARED DATA FETCHING
// ============================================================================

type JobAssignmentStatus = Exclude<UpdateJobAssignmentInput['status'], undefined>;

/**
 * Unified job data fetching hook that adapts to different view requirements.
 */
export function useUnifiedJobList(viewType: JobViewType = 'kanban') {
  const { queryKey, queryOptions } = useUnifiedJobData(viewType);
  const { state } = useUnifiedJobs();
  const { currentOrg } = useCurrentOrg();
  const organizationId = currentOrg?.id;

  const formatDate = (date: Date) => date.toISOString().split('T')[0];
  const weekStartDate = formatDate(state.currentWeekStart);
  const weekEndDate = formatDate(
    new Date(state.currentWeekStart.getTime() + 6 * 24 * 60 * 60 * 1000)
  );

  const statusFilters =
    state.filters.statuses.length > 0
      ? state.filters.statuses.filter(
          (status): status is JobAssignmentStatus => status !== undefined
        )
      : undefined;

  const assignmentFilters = {
    installerIds: state.filters.installerIds,
    statuses: statusFilters,
    dateFrom: state.filters.dateRange?.start,
    dateTo: state.filters.dateRange?.end,
    search: state.filters.searchQuery,
  };

  // View-specific query logic
  const queryFn = async () => {
    switch (viewType) {
      case 'kanban':
        if (!organizationId) return [];
        const kanbanData = await listJobAssignments({
          data: {
            organizationId,
            filters: { ...assignmentFilters, limit: 1000, offset: 0 },
          },
        });
        return kanbanData.jobs;

      case 'weekly': {
        const calendarData = await listCalendarTasksForKanban({
          data: {
            startDate: weekStartDate,
            endDate: weekEndDate,
            installerIds: state.filters.installerIds,
            statuses: statusFilters,
          },
        });
        return calendarData.tasks;
      }

      case 'traditional':
        if (!organizationId) return [];
        const calendarData = await listJobAssignments({
          data: {
            organizationId,
            filters: { ...assignmentFilters, limit: 1000, offset: 0 },
          },
        });
        return calendarData.jobs;

      case 'timeline': {
        const timelineData = await listTimelineJobs({
          data: {
            startDate: weekStartDate,
            endDate: weekEndDate,
            installerIds: state.filters.installerIds,
            statuses: statusFilters,
          },
        });
        return timelineData.items;
      }

      default:
        throw new Error(`Unsupported view type: ${viewType}`);
    }
  };

  return useQuery({
    queryKey,
    queryFn,
    ...queryOptions,
    select: (data) => ({
      items: data,
      totalCount: data.length,
      viewType,
    }),
  });
}

/**
 * Unified single job fetching hook.
 */
export function useUnifiedJob(jobId: string) {
  const { queryOptions } = useUnifiedJobData('kanban'); // Use kanban as base
  const { currentOrg } = useCurrentOrg();
  const organizationId = currentOrg?.id;

  return useQuery({
    queryKey: queryKeys.jobs.detail(jobId),
    queryFn: () =>
      getJobAssignment({
        data: { id: jobId, organizationId: organizationId! },
      }),
    ...queryOptions,
    enabled: !!jobId && !!organizationId,
  });
}

/**
 * Timeline-specific statistics hook.
 */
export function useUnifiedTimelineStats() {
  const { queryOptions } = useUnifiedJobData('timeline');
  const { state } = useUnifiedJobs();
  const weekStart = state.currentWeekStart.toISOString().split('T')[0];
  const weekEnd = new Date(state.currentWeekStart.getTime() + 6 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split('T')[0];
  const statusFilters =
    state.filters.statuses.length > 0
      ? state.filters.statuses.filter(
          (status): status is JobAssignmentStatus => status !== undefined
        )
      : undefined;

  return useQuery({
    queryKey: queryKeys.jobCalendar.timelineStats(weekStart, weekEnd),
    queryFn: () =>
      getTimelineStats({
        data: {
          startDate: weekStart,
          endDate: weekEnd,
          installerIds: state.filters.installerIds,
          statuses: statusFilters,
        },
      }),
    ...queryOptions,
  });
}

// ============================================================================
// SHARED MUTATIONS
// ============================================================================

/**
 * Unified job rescheduling mutation with calendar/timeline sync.
 */
export function useUnifiedRescheduleJob() {
  const queryClient = useQueryClient();
  const { handleJobMutation } = useCrossViewJobSync();
  const { actions } = useUnifiedJobs();
  const { currentOrg } = useCurrentOrg();
  const organizationId = currentOrg?.id;

  return useMutation({
    mutationFn: async (input: { jobId: string; scheduledDate: string; scheduledTime?: string }) => {
      actions.setLoading(true);
      try {
        if (!organizationId) {
          throw new Error('Organization context is required to reschedule jobs');
        }
        // Use the new job assignment update operation
        const updateData: UpdateJobAssignmentInput = {
          scheduledDate: input.scheduledDate,
          scheduledTime: input.scheduledTime,
        };

        const result = await updateJobAssignment({
          data: {
            id: input.jobId,
            organizationId,
            data: updateData,
          },
        });

        if (!result.success) {
          throw new Error(result.error || 'Failed to update job assignment');
        }

        return result.job;
      } finally {
        actions.setLoading(false);
      }
    },
    onSuccess: async (data, variables) => {
      handleJobMutation(() => Promise.resolve(data), {
        onSuccess: async () => {
          // Sync job changes to OAuth calendar if configured
          try {
            const { syncJobToCalendar } = await import('@/lib/jobs/oauth-bridge');
            const organizationId = data?.organizationId || 'default-org'; // Get from context

            await syncJobToCalendar(organizationId, {
              id: variables.jobId,
              title: data?.title || 'Job Rescheduled',
              description: `Job rescheduled to ${variables.scheduledDate}${variables.scheduledTime ? ` at ${variables.scheduledTime}` : ''}`,
              scheduledDate: new Date(variables.scheduledDate),
              scheduledTime: variables.scheduledTime,
            });
          } catch (calendarError) {
            // Calendar sync is non-blocking - log but don't fail the job update
            console.warn('Calendar sync failed after job reschedule:', calendarError);
          }

          // Invalidate all job queries - especially calendar and timeline
          queryClient.invalidateQueries({ queryKey: queryKeys.jobs.all });
          queryClient.invalidateQueries({ queryKey: queryKeys.jobCalendar.all });
          actions.notifyJobChange(variables.jobId, 'update');
        },
      });
    },
    onError: (error: Error) => {
      actions.setError(error.message);
    },
  });
}

// ============================================================================
// BATCH OPERATIONS INTEGRATION
// ============================================================================

/**
 * Unified batch operations hook.
 */
export function useUnifiedBatchOperations() {
  const queryClient = useQueryClient();
  const { handleJobMutation } = useCrossViewJobSync();
  const { actions } = useUnifiedJobs();
  const { currentOrg } = useCurrentOrg();
  const organizationId = currentOrg?.id;

  const bulkUpdate = useMutation({
    mutationFn: async (input: { jobIds: string[]; updates: Partial<UpdateJobAssignmentInput> }) => {
      // This would use the batch operations server function
      const { bulkUpdateJobStatuses } =
        await import('@/server/functions/jobs/job-batch-operations');

      actions.setLoading(true);
      try {
        // Convert to status update for now - would be more generic
        const result = await bulkUpdateJobStatuses({
          data: {
            jobIds: input.jobIds,
            status: input.updates.status || 'scheduled',
            internalNotes: 'Bulk updated',
          },
        });
        return result;
      } finally {
        actions.setLoading(false);
      }
    },
    onSuccess: () => {
      handleJobMutation(() => Promise.resolve({}), {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: queryKeys.jobs.all });
          actions.refreshData();
        },
      });
    },
    onError: (error: Error) => {
      actions.setError(error.message);
    },
  });

  const bulkDelete = useMutation({
    mutationFn: async (input: { jobIds: string[]; reason?: string }) => {
      actions.setLoading(true);
      try {
        // This is a simplified version - would need proper bulk delete
        const results = [];
        for (const jobId of input.jobIds) {
          if (!organizationId) {
            throw new Error('Organization context is required to delete jobs');
          }
          const result = await deleteJobAssignment({
            data: { id: jobId, organizationId },
          });
          results.push(result);
        }
        return { results, count: results.length };
      } finally {
        actions.setLoading(false);
      }
    },
    onSuccess: (data) => {
      handleJobMutation(() => Promise.resolve(data), {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: queryKeys.jobs.all });
          actions.refreshData();
        },
      });
    },
    onError: (error: Error) => {
      actions.setError(error.message);
    },
  });

  return {
    bulkUpdate,
    bulkDelete,
  };
}

// ============================================================================
// REAL-TIME SYNCHRONIZATION
// ============================================================================

/**
 * Hook for real-time synchronization across all job views.
 */
export function useUnifiedRealtimeSync() {
  const { state, actions } = useUnifiedJobs();
  const queryClient = useQueryClient();

  // WebSocket or polling-based real-time updates
  const syncWithServer = async () => {
    try {
      // Invalidate all job-related queries
      await queryClient.invalidateQueries({ queryKey: queryKeys.jobs.all });
      await queryClient.invalidateQueries({ queryKey: queryKeys.jobCalendar.all });

      actions.refreshData();
    } catch (error) {
      actions.setError('Failed to sync with server');
    }
  };

  return {
    syncWithServer,
    lastUpdated: state.lastUpdated,
    isLoading: state.isLoading,
  };
}

// ============================================================================
// PERFORMANCE OPTIMIZATIONS
// ============================================================================

/**
 * Hook for optimized data fetching based on view requirements.
 */
export function useOptimizedJobData(viewType: 'kanban' | 'calendar' | 'timeline') {
  const { state } = useUnifiedJobs();

  // Different views have different data requirements
  const getOptimizationHints = () => {
    switch (viewType) {
      case 'kanban':
        return {
          // Kanban needs full job details for cards
          fields: [
            'id',
            'jobNumber',
            'title',
            'status',
            'priority',
            'installer',
            'customer',
            'scheduledDate',
          ],
          sortBy: 'priority',
          limit: 1000, // Kanban boards can handle many items
        };

      case 'calendar':
        return {
          // Calendar needs scheduling info and minimal details
          fields: [
            'id',
            'jobNumber',
            'title',
            'scheduledDate',
            'scheduledTime',
            'estimatedDuration',
            'installer',
          ],
          sortBy: 'scheduledDate',
          limit: 500, // Calendar has date filtering
        };

      case 'timeline':
        return {
          // Timeline needs time-based data with positioning
          fields: [
            'id',
            'jobNumber',
            'title',
            'scheduledDate',
            'scheduledTime',
            'estimatedDuration',
            'installer',
            'status',
          ],
          sortBy: 'scheduledTime',
          limit: 200, // Timeline shows one week at a time
        };

      default:
        return {
          fields: ['id', 'jobNumber', 'title'],
          sortBy: 'createdAt',
          limit: 100,
        };
    }
  };

  return {
    optimizationHints: getOptimizationHints(),
    currentFilters: state.filters,
    weekStart: state.currentWeekStart,
  };
}
