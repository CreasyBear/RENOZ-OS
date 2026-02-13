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
  useLogEntityActivity,
} from './use-activities';

export { useEntityActivityLogging } from './use-entity-activity-logging';

// --- Unified Activities (Audit Trail + Planned) ---
export {
  useUnifiedActivities,
  useMockUnifiedActivities,
} from './use-unified-activities';

// --- Re-export Types ---
import type { ActivityFilter } from '@/lib/schemas/activities';
export type {
  Activity,
  ActivityWithUser,
  ActivityStatsResult,
  ActivityLeaderboardItem,
  ActivityFilter,
  ActivityEntityType,
  ActivityStatsQuery,
  LogEntityActivityInput,
} from '@/lib/schemas/activities';

export type { UseActivityFeedOptions } from './use-activities';

// Legacy alias for backward compatibility (deprecated)
/** @deprecated Use ActivityFilter instead */
export type ActivityFeedFilters = ActivityFilter;
export type { UseUnifiedActivitiesOptions } from './use-unified-activities';
