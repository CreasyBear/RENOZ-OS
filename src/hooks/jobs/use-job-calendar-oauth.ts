/**
 * Job Calendar OAuth Integration Hooks
 *
 * Provides hooks for integrating job scheduling with OAuth calendar services.
 * Bridges the jobs system to the OAuth Integration Suite for calendar sync.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  syncJobToCalendar,
  updateJobCalendarEvent,
  removeJobFromCalendar,
  listAvailableCalendars,
  getCalendarOAuthConnection,
} from '@/lib/jobs/oauth-bridge';
import { queryKeys } from '@/lib/query-keys';
import { toast } from 'sonner';

// ============================================================================
// QUERY HOOKS
// ============================================================================

/**
 * Hook to get the current calendar OAuth connection for the organization
 */
export function useCalendarOAuthConnection(organizationId: string) {
  return useQuery({
    queryKey: queryKeys.jobCalendar.oauth.connection(organizationId),
    queryFn: () => getCalendarOAuthConnection(organizationId),
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
  });
}

/**
 * Hook to list available calendars for OAuth sync
 */
export function useAvailableCalendars(organizationId: string) {
  return useQuery({
    queryKey: queryKeys.jobCalendar.oauth.calendars(organizationId),
    queryFn: () => listAvailableCalendars(organizationId),
    staleTime: 10 * 60 * 1000, // 10 minutes
    enabled: !!organizationId,
  });
}

// ============================================================================
// MUTATION HOOKS
// ============================================================================

/**
 * Hook to sync a job to the connected calendar
 */
export function useSyncJobToCalendar(organizationId: string) {
  const queryClient = useQueryClient();

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
      const result = await syncJobToCalendar(organizationId, jobData);

      if (!result.success) {
        throw new Error(result.error || 'Failed to sync job to calendar');
      }

      return result;
    },
    onSuccess: (_result, _jobData) => {
      // Invalidate calendar queries to refresh the view
      queryClient.invalidateQueries({ queryKey: queryKeys.jobCalendar.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.jobCalendar.oauth.all() });

      toast.success('Job synced to calendar', {
        description: `Event created in your connected calendar`,
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
 * Hook to update an existing job calendar event
 */
export function useUpdateJobCalendarEvent(organizationId: string) {
  const queryClient = useQueryClient();

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
      const result = await updateJobCalendarEvent(organizationId, params.jobId, params.updates);

      if (!result.success) {
        throw new Error(result.error || 'Failed to update calendar event');
      }

      return result;
    },
    onSuccess: (_result, _params) => {
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
 * Hook to remove a job from the calendar
 */
export function useRemoveJobFromCalendar(organizationId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (jobId: string) => {
      const result = await removeJobFromCalendar(organizationId, jobId);

      if (!result.success) {
        throw new Error(result.error || 'Failed to remove job from calendar');
      }

      return result;
    },
    onSuccess: (_result, _jobId) => {
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
 * Hook to sync job changes with calendar (combined create/update/remove)
 */
export function useSyncJobWithCalendar(organizationId: string) {
  const syncMutation = useSyncJobToCalendar(organizationId);
  const updateMutation = useUpdateJobCalendarEvent(organizationId);
  const removeMutation = useRemoveJobFromCalendar(organizationId);

  return {
    sync: syncMutation,
    update: updateMutation,
    remove: removeMutation,
    isLoading: syncMutation.isPending || updateMutation.isPending || removeMutation.isPending,
  };
}

// ============================================================================
// UTILITY HOOKS
// ============================================================================

/**
 * Hook to check if calendar OAuth is configured and active
 */
export function useCalendarOAuthStatus(organizationId: string) {
  const { data: connection, isLoading } = useCalendarOAuthConnection(organizationId);

  return {
    isConfigured: !!connection && connection.isActive,
    connection,
    isLoading,
    provider: connection?.provider,
    calendarName: connection?.calendarName,
  };
}

/**
 * Hook to get calendar sync statistics
 */
export function useCalendarSyncStats(organizationId: string) {
  return useQuery({
    queryKey: queryKeys.jobCalendar.oauth.stats(organizationId),
    queryFn: async () => {
      // This would query the OAuth sync logs for calendar operations
      // For now, return placeholder stats
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
