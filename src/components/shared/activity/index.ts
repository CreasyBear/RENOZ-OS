/**
 * Activity Components
 *
 * Single source of truth for all activity-related UI components.
 */

// Config
export {
  ACTION_ICONS,
  ACTION_COLORS,
  ACTION_LABELS,
  ENTITY_ICONS,
  ENTITY_LABELS,
  getActionIcon,
  getActionColor,
  getEntityIcon,
  getEntityLabel,
  formatActivityAction,
} from "./activity-config";

// Core Components
export { ActivityFeed, type ActivityFeedProps } from "./activity-feed";
export { ActivityItem, type ActivityItemProps } from "./activity-item";
export {
  ActivityFilters,
  type ActivityFiltersProps,
  type ActivityFiltersValue,
  useActivityFiltersFromUrl,
} from "./activity-filters";
export { ChangeDiff, InlineChangeDiff, formatValue } from "./change-diff";
export {
  UnifiedActivityTimeline,
  type UnifiedActivityTimelineProps,
} from "./unified-activity-timeline";
export {
  StatusTimeline,
  type StatusTimelineEvent,
  type StatusTimelineProps,
} from "./status-timeline";

// Dashboard Components
export { ActivityDashboard, type ActivityDashboardProps } from "./activity-dashboard";
export {
  ActivityTrendChart,
  ActionDistributionChart,
  EntityBreakdownChart,
  type ActivityTrendChartProps,
  type ActionDistributionChartProps,
  type EntityBreakdownChartProps,
} from "./activity-charts";
export { ActivityHeatmap, type ActivityHeatmapProps } from "./activity-heatmap";
export { ActivityLeaderboard, type ActivityLeaderboardProps } from "./activity-leaderboard";

// Activity Logging (Input)
export {
  EntityActivityLogger,
  type EntityActivityLoggerProps,
  type ActivityLogData,
  type ActivityType,
} from "./entity-activity-logger";
