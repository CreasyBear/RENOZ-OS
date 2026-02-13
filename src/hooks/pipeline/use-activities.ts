/**
 * Pipeline Activity Hooks
 *
 * TanStack Query hooks for opportunity activity data fetching:
 * - Activity list/timeline
 * - Follow-up list (overdue and upcoming)
 * - Activity analytics
 *
 * @see src/lib/query-keys.ts for centralized query keys
 * @see src/server/functions/pipeline/pipeline.ts for server functions
 */
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import {
  listActivities,
  getActivityTimeline,
  getUpcomingFollowUps,
  getActivityAnalytics,
} from '@/server/functions/pipeline/pipeline';
import type { OpportunityActivity } from '@/lib/schemas/pipeline';

// ============================================================================
// TYPES
// ============================================================================

type ActivityListResult = Awaited<ReturnType<typeof listActivities>>;
type ActivityTimelineResult = Awaited<ReturnType<typeof getActivityTimeline>>;

export interface FollowUpItem {
  activity: {
    id: string;
    type: string;
    description: string;
    outcome: string | null;
    scheduledAt: Date | null;
    completedAt: Date | null;
    createdAt: Date;
  };
  opportunity: {
    id: string;
    title: string;
    stage: string;
    assignedTo: string | null;
  };
}

// ============================================================================
// ACTIVITY LIST HOOKS
// ============================================================================

export interface UseActivitiesOptions {
  opportunityId: string;
  types?: string[];
  page?: number;
  pageSize?: number;
  enabled?: boolean;
}

/**
 * Fetch activities for an opportunity
 */
export function useActivities({
  opportunityId,
  types,
  page = 1,
  pageSize = 50,
  enabled = true,
}: UseActivitiesOptions) {
  return useQuery({
    queryKey: queryKeys.pipeline.activities(opportunityId),
    queryFn: async () => {
      const result = await listActivities({
        data: {
          opportunityId,
          type: types?.[0] as 'call' | 'email' | 'meeting' | 'note' | 'follow_up' | undefined,
          page,
          pageSize,
        },
      });
      if (result == null) throw new Error('Activities list returned no data');
      return result;
    },
    enabled: enabled && !!opportunityId,
    staleTime: 30 * 1000, // 30 seconds
  });
}

// ============================================================================
// ACTIVITY TIMELINE HOOKS
// ============================================================================

export interface UseActivityTimelineOptions {
  opportunityId: string;
  days?: number;
  enabled?: boolean;
}

/**
 * Fetch activity timeline for an opportunity (chronological view)
 */
export function useActivityTimeline({
  opportunityId,
  days = 30,
  enabled = true,
}: UseActivityTimelineOptions) {
  return useQuery({
    queryKey: queryKeys.pipeline.activityTimeline(opportunityId, { days }),
    queryFn: async () => {
      const result = await getActivityTimeline({ data: { opportunityId, days } });
      if (result == null) throw new Error('Activity timeline returned no data');
      return result;
    },
    enabled: enabled && !!opportunityId,
    staleTime: 30 * 1000, // 30 seconds
  });
}

// ============================================================================
// FOLLOW-UP HOOKS
// ============================================================================

export interface UseFollowUpsOptions {
  opportunityId: string;
  days?: number;
  enabled?: boolean;
}

/**
 * Fetch upcoming and overdue follow-ups for an opportunity
 */
export function useFollowUps({ opportunityId, days = 14, enabled = true }: UseFollowUpsOptions) {
  return useQuery<{ overdue: FollowUpItem[]; upcoming: FollowUpItem[] }>({
    queryKey: queryKeys.pipeline.followUps(opportunityId),
    queryFn: async () => {
      const result = await getUpcomingFollowUps({ data: { opportunityId, days } });
      if (result == null) throw new Error('Upcoming follow-ups returned no data');
      return result;
    },
    enabled: enabled && !!opportunityId,
    staleTime: 30 * 1000, // 30 seconds
  });
}

// ============================================================================
// ACTIVITY ANALYTICS HOOKS
// ============================================================================

export interface UseActivityAnalyticsOptions {
  opportunityId?: string;
  dateFrom?: Date;
  dateTo?: Date;
  enabled?: boolean;
}

/**
 * Fetch activity analytics (counts by type, response times, etc.)
 */
export function useActivityAnalytics({
  opportunityId,
  dateFrom,
  dateTo,
  enabled = true,
}: UseActivityAnalyticsOptions) {
  return useQuery({
    queryKey: [
      ...queryKeys.pipeline.all,
      'activity-analytics',
      { opportunityId, dateFrom, dateTo },
    ] as const,
    queryFn: async () => {
      const result = await getActivityAnalytics({
        data: {
          opportunityId,
          dateFrom,
          dateTo,
        },
      });
      if (result == null) throw new Error('Activity analytics returned no data');
      return result;
    },
    enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type { OpportunityActivity, ActivityListResult, ActivityTimelineResult };
