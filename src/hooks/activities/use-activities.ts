/**
 * Activity Hooks
 *
 * TanStack Query hooks for activity data fetching with infinite scroll support.
 *
 * @see src/server/functions/activities/activities.ts for server functions
 * @see src/lib/schemas/activities.ts for types
 */

import * as React from 'react';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import {
  isReadQueryError,
  normalizeReadQueryError,
  requireReadResult,
} from '@/lib/read-path-policy';
import {
  getActivityFeed,
  getEntityActivities,
  getUserActivities,
  getActivityStats,
  getActivityLeaderboard,
  getActivity,
  logEntityActivity,
  requestActivityExport,
} from '@/server/functions/activities/activities';
import type {
  ActivityStatsQuery,
  ActivityAction,
  ActivityEntityType,
  ActivityWithUser,
  Activity,
  ActivityStatsResult,
  ActivityLeaderboardItem,
  ActivityFeedResult,
  EntityActivitiesResult,
  ActivityFilter,
  ActivityExportRequest,
  ActivityExportResponse,
} from '@/lib/schemas/activities';
import type { CursorPaginatedResponse } from '@/lib/db/pagination';

// ============================================================================
// TYPES
// ============================================================================

// Note: Use ActivityFilter from schemas for consistency
// ActivityFeedFilters was an alias that has been removed

// ============================================================================
// QUERY KEYS
// ============================================================================

// Query keys are now centralized in @/lib/query-keys.ts

// ============================================================================
// ACTIVITY FEED (Infinite Scroll)
// ============================================================================

export interface UseActivityFeedOptions {
  entityType?: ActivityEntityType;
  entityId?: string;
  action?: ActivityAction;
  userId?: string;
  dateFrom?: Date;
  dateTo?: Date;
  pageSize?: number;
  enabled?: boolean;
}

/**
 * Fetch organization-wide activity feed with infinite scroll.
 *
 * @example
 * ```tsx
 * const { data, fetchNextPage, hasNextPage, isFetching } = useActivityFeed({
 *   entityType: "customer",
 *   action: "created",
 * });
 *
 * // Flatten pages for rendering
 * const activities = data?.pages.flatMap(page => page.items) ?? [];
 * ```
 */
export function useActivityFeed(options: UseActivityFeedOptions = {}) {
  const {
    entityType,
    entityId,
    action,
    userId,
    dateFrom,
    dateTo,
    pageSize = 20,
    enabled = true,
  } = options;

  const filters: Partial<ActivityFilter> = {
    entityType,
    entityId,
    action,
    dateFrom,
    dateTo,
    ...(userId ? { createdBy: userId } : {}), // Map userId to createdBy for ActivityFilter
  };

  return useInfiniteQuery({
    queryKey: queryKeys.activities.feed(filters),
    queryFn: async ({ pageParam }): Promise<CursorPaginatedResponse<ActivityWithUser>> => {
      try {
        const result = await getActivityFeed({
          data: {
            ...filters,
            cursor: typeof pageParam === 'string' ? pageParam : undefined,
            pageSize,
          },
        });
        return requireReadResult(result, {
          message: 'Activity feed returned no data',
          contractType: 'always-shaped',
          fallbackMessage:
            'Activity feed is temporarily unavailable. Please refresh and try again.',
        });
      } catch (error) {
        if (isReadQueryError(error)) throw error;
        throw normalizeReadQueryError(error, {
          contractType: 'always-shaped',
          fallbackMessage:
            'Activity feed is temporarily unavailable. Please refresh and try again.',
        });
      }
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => (lastPage.hasNextPage ? lastPage.nextCursor : undefined),
    enabled,
    staleTime: 30 * 1000, // 30 seconds
  });
}

// ============================================================================
// ENTITY ACTIVITIES (Infinite Scroll)
// ============================================================================

export interface UseEntityActivitiesOptions {
  entityType: ActivityEntityType;
  entityId: string;
  pageSize?: number;
  enabled?: boolean;
}

/**
 * Fetch activity history for a specific entity (infinite scroll).
 *
 * @example
 * ```tsx
 * const { data, fetchNextPage, hasNextPage } = useEntityActivities({
 *   entityType: "customer",
 *   entityId: customerId,
 * });
 * ```
 */
export function useEntityActivities(options: UseEntityActivitiesOptions) {
  const { entityType, entityId, pageSize = 20, enabled = true } = options;

  return useInfiniteQuery({
    queryKey: queryKeys.activities.entity(entityType, entityId),
    queryFn: async ({ pageParam }): Promise<CursorPaginatedResponse<ActivityWithUser>> => {
      try {
        const result = await getEntityActivities({
          data: {
            entityType,
            entityId,
            cursor: typeof pageParam === 'string' ? pageParam : undefined,
            pageSize,
          },
        });
        return requireReadResult(result, {
          message: 'Entity activities returned no data',
          contractType: 'always-shaped',
          fallbackMessage:
            'Activity history is temporarily unavailable. Please refresh and try again.',
        });
      } catch (error) {
        if (isReadQueryError(error)) throw error;
        throw normalizeReadQueryError(error, {
          contractType: 'always-shaped',
          fallbackMessage:
            'Activity history is temporarily unavailable. Please refresh and try again.',
        });
      }
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => (lastPage.hasNextPage ? lastPage.nextCursor : undefined),
    enabled: enabled && !!entityId,
    staleTime: 30 * 1000,
  });
}

// ============================================================================
// USER ACTIVITIES (Infinite Scroll)
// ============================================================================

export interface UseUserActivitiesOptions {
  userId: string;
  pageSize?: number;
  enabled?: boolean;
}

/**
 * Fetch activities performed by a specific user (infinite scroll).
 *
 * @example
 * ```tsx
 * const { data, fetchNextPage } = useUserActivities({ userId });
 * ```
 */
export function useUserActivities(options: UseUserActivitiesOptions) {
  const { userId, pageSize = 20, enabled = true } = options;

  return useInfiniteQuery({
    queryKey: queryKeys.activities.user(userId),
    queryFn: async ({ pageParam }): Promise<CursorPaginatedResponse<Activity>> => {
      try {
        const result = await getUserActivities({
          data: {
            userId,
            cursor: typeof pageParam === 'string' ? pageParam : undefined,
            pageSize,
          },
        });
        return requireReadResult(result, {
          message: 'User activities returned no data',
          contractType: 'always-shaped',
          fallbackMessage:
            'User activity is temporarily unavailable. Please refresh and try again.',
        });
      } catch (error) {
        if (isReadQueryError(error)) throw error;
        throw normalizeReadQueryError(error, {
          contractType: 'always-shaped',
          fallbackMessage:
            'User activity is temporarily unavailable. Please refresh and try again.',
        });
      }
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => (lastPage.hasNextPage ? lastPage.nextCursor : undefined),
    enabled: enabled && !!userId,
    staleTime: 30 * 1000,
  });
}

// ============================================================================
// SINGLE ACTIVITY
// ============================================================================

/**
 * Fetch a single activity by ID.
 */
export function useActivity(id: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.activities.detail(id),
    queryFn: async (): Promise<ActivityWithUser> => {
      try {
        const result = await getActivity({ data: { id } });
        return requireReadResult(result, {
          message: 'Activity not found',
          contractType: 'detail-not-found',
          fallbackMessage:
            'Activity details are temporarily unavailable. Please refresh and try again.',
          notFoundMessage: 'The requested activity could not be found.',
        });
      } catch (error) {
        if (isReadQueryError(error)) throw error;
        throw normalizeReadQueryError(error, {
          contractType: 'detail-not-found',
          fallbackMessage:
            'Activity details are temporarily unavailable. Please refresh and try again.',
          notFoundMessage: 'The requested activity could not be found.',
        });
      }
    },
    enabled: enabled && !!id,
    staleTime: 60 * 1000, // 1 minute
  });
}

// ============================================================================
// ACTIVITY STATS
// ============================================================================

export interface UseActivityStatsOptions {
  groupBy?: 'action' | 'entityType' | 'userId' | 'day' | 'hour';
  dateFrom?: Date;
  dateTo?: Date;
  enabled?: boolean;
}

/**
 * Fetch activity statistics for charts and dashboards.
 *
 * @example
 * ```tsx
 * // Get action distribution
 * const { data: actionStats } = useActivityStats({ groupBy: "action" });
 *
 * // Get daily activity counts for trend chart
 * const { data: dailyStats } = useActivityStats({
 *   groupBy: "day",
 *   dateFrom: startOfMonth(new Date()),
 *   dateTo: endOfMonth(new Date()),
 * });
 * ```
 */
export function useActivityStats(options: UseActivityStatsOptions = {}) {
  const { groupBy = 'action', dateFrom, dateTo, enabled = true } = options;

  const query: ActivityStatsQuery = { groupBy, dateFrom, dateTo };

  return useQuery({
    queryKey: queryKeys.activities.stats(query),
    queryFn: async (): Promise<ActivityStatsResult> => {
      try {
        const result = await getActivityStats({ data: query });
        return requireReadResult(result, {
          message: 'Activity stats returned no data',
          contractType: 'always-shaped',
          fallbackMessage:
            'Activity statistics are temporarily unavailable. Please refresh and try again.',
        });
      } catch (error) {
        if (isReadQueryError(error)) throw error;
        throw normalizeReadQueryError(error, {
          contractType: 'always-shaped',
          fallbackMessage:
            'Activity statistics are temporarily unavailable. Please refresh and try again.',
        });
      }
    },
    enabled,
    staleTime: 60 * 1000, // 1 minute - stats change less frequently
  });
}

// ============================================================================
// ACTIVITY LEADERBOARD
// ============================================================================

export interface UseActivityLeaderboardOptions {
  dateFrom?: Date;
  dateTo?: Date;
  enabled?: boolean;
}

/**
 * Fetch top users leaderboard by activity count.
 *
 * @example
 * ```tsx
 * const { data: leaderboard } = useActivityLeaderboard({
 *   dateFrom: startOfWeek(new Date()),
 * });
 *
 * leaderboard?.forEach(entry => {
 *   console.log(`#${entry.rank}: ${entry.userName} - ${entry.activityCount} activities`);
 * });
 * ```
 */
export function useActivityLeaderboard(options: UseActivityLeaderboardOptions = {}) {
  const { dateFrom, dateTo, enabled = true } = options;

  return useQuery({
    queryKey: queryKeys.activities.leaderboard({ from: dateFrom, to: dateTo }),
    queryFn: async (): Promise<ActivityLeaderboardItem[]> => {
      try {
        const result = await getActivityLeaderboard({
          data: { dateFrom, dateTo, groupBy: 'userId' },
        });
        return requireReadResult(result, {
          message: 'Activity leaderboard returned no data',
          contractType: 'always-shaped',
          fallbackMessage:
            'Activity leaderboard is temporarily unavailable. Please refresh and try again.',
        });
      } catch (error) {
        if (isReadQueryError(error)) throw error;
        throw normalizeReadQueryError(error, {
          contractType: 'always-shaped',
          fallbackMessage:
            'Activity leaderboard is temporarily unavailable. Please refresh and try again.',
        });
      }
    },
    enabled,
    staleTime: 60 * 1000, // 1 minute
  });
}

// ============================================================================
// UTILITY HOOKS
// ============================================================================

/**
 * Get flattened activities from infinite query result.
 * Works with ActivityFeedResult or EntityActivitiesResult (both return ActivityWithUser[]).
 * Memoized to prevent unnecessary recalculation.
 * Useful for virtualized lists.
 */
export function useFlattenedActivities(
  infiniteQueryResult: ActivityFeedResult | EntityActivitiesResult
): ActivityWithUser[] {
  const { data } = infiniteQueryResult;
  
  return React.useMemo(() => {
    if (!data) return [];
    // Guard against malformed/partial page payloads so feeds fail soft instead of crashing.
    const pages = Array.isArray(data.pages) ? data.pages : [];
    return pages.flatMap((page) => (Array.isArray(page?.items) ? page.items : []));
  }, [data]); // data reference is stable from TanStack Query
}

/**
 * Hook to detect when to load more (for infinite scroll).
 * Returns true if there's more data and not currently fetching.
 */
export function useCanLoadMore(infiniteQueryResult: ActivityFeedResult | EntityActivitiesResult) {
  const { hasNextPage, isFetchingNextPage } = infiniteQueryResult;
  return hasNextPage && !isFetchingNextPage;
}

// ============================================================================
// CACHE INVALIDATION
// ============================================================================

/**
 * Hook to invalidate activity queries after mutations.
 * Use when creating/updating entities that should trigger activity refresh.
 *
 * @example
 * ```tsx
 * const invalidateActivities = useInvalidateActivities();
 *
 * // After creating a customer:
 * await createCustomer(data);
 * invalidateActivities.all(); // Refresh all activity queries
 *
 * // After updating a specific entity:
 * invalidateActivities.entity("customer", customerId);
 * ```
 */
export function useInvalidateActivities() {
  const queryClient = useQueryClient();

  return {
    /** Invalidate all activity queries */
    all: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.activities.all });
    },

    /** Invalidate feed queries only */
    feeds: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.activities.feeds() });
    },

    /** Invalidate queries for a specific entity */
    entity: (entityType: ActivityEntityType, entityId: string) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.activities.entity(entityType, entityId),
      });
      // Also invalidate feeds since they include this entity
      queryClient.invalidateQueries({ queryKey: queryKeys.activities.feeds() });
    },

    /** Invalidate stats and leaderboard */
    stats: () => {
      queryClient.invalidateQueries({
        predicate: (query) =>
          query.queryKey[0] === 'activities' &&
          (query.queryKey[1] === 'stats' || query.queryKey[1] === 'leaderboard'),
      });
    },
  };
}

// ============================================================================
// MUTATIONS
// ============================================================================

/** Input for logging an activity on any entity */
export interface LogEntityActivityInput {
  entityType: ActivityEntityType;
  entityId: string;
  activityType: 'call' | 'email' | 'meeting' | 'note' | 'follow_up';
  description: string;
  title?: string;
  body?: string;
  category?: string;
  importance?: string;
  outcome?: string;
  scheduledAt?: Date;
  isFollowUp?: boolean;
}

/**
 * Hook to log an activity (call, email, meeting, note, follow-up) on any entity.
 *
 * @example
 * ```tsx
 * const logActivity = useLogEntityActivity();
 *
 * const handleLogCall = async () => {
 *   await logActivity.mutateAsync({
 *     entityType: 'order',
 *     entityId: orderId,
 *     activityType: 'call',
 *     description: 'Discussed delivery timeline',
 *     outcome: 'positive',
 *   });
 * };
 * ```
 */
export function useLogEntityActivity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: LogEntityActivityInput) =>
      logEntityActivity({ data }),
    onSuccess: (_result, variables) => {
      // Invalidate entity-specific activities
      queryClient.invalidateQueries({
        queryKey: queryKeys.activities.entity(variables.entityType, variables.entityId),
      });
      // Invalidate unified activities for this entity (customer detail timeline)
      queryClient.invalidateQueries({
        queryKey: queryKeys.unifiedActivities.entity(variables.entityType, variables.entityId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.unifiedActivities.entityAuditWithRelated(
          variables.entityType,
          variables.entityId,
          null
        ),
      });
      // Invalidate general activity feeds
      queryClient.invalidateQueries({
        queryKey: queryKeys.activities.feeds(),
      });
    },
  });
}

/**
 * Request an activity export artifact for the supplied filters.
 */
export function useRequestActivityExport() {
  return useMutation({
    mutationFn: (data: ActivityExportRequest): Promise<ActivityExportResponse> =>
      requestActivityExport({ data }),
  });
}
