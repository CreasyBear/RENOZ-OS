/**
 * Activity Hooks
 *
 * TanStack Query hooks for activity data fetching with infinite scroll support.
 *
 * @see src/server/functions/activities.ts for server functions
 * @see src/lib/schemas/activities.ts for types
 */

import * as React from "react";
import { useInfiniteQuery, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getActivityFeed,
  getEntityActivities,
  getUserActivities,
  getActivityStats,
  getActivityLeaderboard,
  getActivity,
} from "@/server/functions/activities";
import type {
  ActivityStatsQuery,
  ActivityAction,
  ActivityEntityType,
  ActivityWithUser,
  Activity,
  ActivityStatsResult,
  ActivityLeaderboardItem,
} from "@/lib/schemas/activities";

// ============================================================================
// TYPES
// ============================================================================

/** Standard cursor pagination response from server functions */
interface CursorPaginationResponse<T> {
  items: T[];
  nextCursor: string | null;
  hasMore: boolean;
}

/** Filters for activity feed queries */
interface ActivityFeedFilters {
  entityType?: ActivityEntityType;
  entityId?: string;
  action?: ActivityAction;
  userId?: string;
  dateFrom?: Date;
  dateTo?: Date;
}

// ============================================================================
// QUERY KEYS
// ============================================================================

export const activityKeys = {
  all: ["activities"] as const,
  feeds: () => [...activityKeys.all, "feed"] as const,
  feed: (filters: ActivityFeedFilters) =>
    [...activityKeys.feeds(), filters] as const,
  entity: (entityType: ActivityEntityType, entityId: string) =>
    [...activityKeys.all, "entity", entityType, entityId] as const,
  user: (userId: string) => [...activityKeys.all, "user", userId] as const,
  detail: (id: string) => [...activityKeys.all, "detail", id] as const,
  stats: (query: ActivityStatsQuery) =>
    [...activityKeys.all, "stats", query] as const,
  leaderboard: (dateRange?: { from?: Date; to?: Date }) =>
    [...activityKeys.all, "leaderboard", dateRange] as const,
};

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

  const filters: ActivityFeedFilters = {
    entityType,
    entityId,
    action,
    userId,
    dateFrom,
    dateTo,
  };

  return useInfiniteQuery({
    queryKey: activityKeys.feed(filters),
    queryFn: async ({
      pageParam,
    }): Promise<CursorPaginationResponse<ActivityWithUser>> => {
      const result = await getActivityFeed({
        data: {
          ...filters,
          cursor: pageParam as string | undefined,
          pageSize,
        },
      });
      return result as CursorPaginationResponse<ActivityWithUser>;
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) =>
      lastPage.hasMore ? lastPage.nextCursor : undefined,
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
    queryKey: activityKeys.entity(entityType, entityId),
    queryFn: async ({
      pageParam,
    }): Promise<CursorPaginationResponse<ActivityWithUser>> => {
      const result = await getEntityActivities({
        data: {
          entityType,
          entityId,
          cursor: pageParam as string | undefined,
          pageSize,
        },
      });
      return result as CursorPaginationResponse<ActivityWithUser>;
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) =>
      lastPage.hasMore ? lastPage.nextCursor : undefined,
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
    queryKey: activityKeys.user(userId),
    queryFn: async ({
      pageParam,
    }): Promise<CursorPaginationResponse<Activity>> => {
      const result = await getUserActivities({
        data: {
          userId,
          cursor: pageParam as string | undefined,
          pageSize,
        },
      });
      return result as CursorPaginationResponse<Activity>;
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) =>
      lastPage.hasMore ? lastPage.nextCursor : undefined,
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
    queryKey: activityKeys.detail(id),
    queryFn: async (): Promise<ActivityWithUser> => {
      const result = await getActivity({ data: { id } });
      return result as ActivityWithUser;
    },
    enabled: enabled && !!id,
    staleTime: 60 * 1000, // 1 minute
  });
}

// ============================================================================
// ACTIVITY STATS
// ============================================================================

export interface UseActivityStatsOptions {
  groupBy?: "action" | "entityType" | "userId" | "day" | "hour";
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
  const { groupBy = "action", dateFrom, dateTo, enabled = true } = options;

  const query: ActivityStatsQuery = { groupBy, dateFrom, dateTo };

  return useQuery({
    queryKey: activityKeys.stats(query),
    queryFn: async (): Promise<ActivityStatsResult> => {
      const result = await getActivityStats({ data: query });
      return result;
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
export function useActivityLeaderboard(
  options: UseActivityLeaderboardOptions = {}
) {
  const { dateFrom, dateTo, enabled = true } = options;

  return useQuery({
    queryKey: activityKeys.leaderboard({ from: dateFrom, to: dateTo }),
    queryFn: async (): Promise<ActivityLeaderboardItem[]> => {
      const result = await getActivityLeaderboard({
        data: { dateFrom, dateTo, groupBy: "userId" },
      });
      return result;
    },
    enabled,
    staleTime: 60 * 1000, // 1 minute
  });
}

// ============================================================================
// UTILITY HOOKS
// ============================================================================

type ActivityFeedResult = ReturnType<typeof useActivityFeed>;
type EntityActivitiesResult = ReturnType<typeof useEntityActivities>;

/**
 * Get flattened activities from infinite query result.
 * Memoized to prevent unnecessary recalculation.
 * Useful for virtualized lists.
 */
export function useFlattenedActivities(
  infiniteQueryResult: ActivityFeedResult | EntityActivitiesResult
) {
  const { data } = infiniteQueryResult;

  return React.useMemo(() => {
    return (
      data?.pages.flatMap(
        (page: CursorPaginationResponse<ActivityWithUser | Activity>) =>
          page.items
      ) ?? []
    );
  }, [data]); // data reference is stable from TanStack Query
}

/**
 * Hook to detect when to load more (for infinite scroll).
 * Returns true if there's more data and not currently fetching.
 */
export function useCanLoadMore(
  infiniteQueryResult: ActivityFeedResult | EntityActivitiesResult
) {
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
      queryClient.invalidateQueries({ queryKey: activityKeys.all });
    },

    /** Invalidate feed queries only */
    feeds: () => {
      queryClient.invalidateQueries({ queryKey: activityKeys.feeds() });
    },

    /** Invalidate queries for a specific entity */
    entity: (entityType: ActivityEntityType, entityId: string) => {
      queryClient.invalidateQueries({
        queryKey: activityKeys.entity(entityType, entityId),
      });
      // Also invalidate feeds since they include this entity
      queryClient.invalidateQueries({ queryKey: activityKeys.feeds() });
    },

    /** Invalidate stats and leaderboard */
    stats: () => {
      queryClient.invalidateQueries({
        predicate: (query) =>
          query.queryKey[0] === "activities" &&
          (query.queryKey[1] === "stats" || query.queryKey[1] === "leaderboard"),
      });
    },
  };
}

