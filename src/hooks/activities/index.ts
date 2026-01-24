/**
 * Activity Hooks
 *
 * Provides hooks for activity feeds, entity activities, and activity analytics.
 */

// Activity feed and queries
export {
  useActivityFeed,
  useEntityActivities,
  useUserActivities,
  useActivity,
  useActivityStats,
  useActivityLeaderboard,
  useFlattenedActivities,
  useCanLoadMore,
  useInvalidateActivities,
} from './use-activities';

// Re-export types
export type {
  Activity,
  ActivityWithUser,
  ActivityStatsResult,
  ActivityLeaderboardItem,
  ActivityFilter as ActivityFeedFilters,
  ActivityEntityType,
  ActivityStatsQuery,
} from '@/lib/schemas/activities';

export type { UseActivityFeedOptions } from './use-activities';
