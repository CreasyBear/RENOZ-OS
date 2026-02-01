/**
 * Activity Hooks
 *
 * Provides hooks for activity feeds, entity activities, and activity analytics.
 */

// --- Activity Feed Queries ---
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

// --- Unified Activities (Audit Trail + Planned) ---
export {
  useUnifiedActivities,
  useMockUnifiedActivities,
} from './use-unified-activities';

// --- Re-export Types ---
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
export type { UseUnifiedActivitiesOptions } from './use-unified-activities';
