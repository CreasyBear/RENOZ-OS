/**
 * Activity Feed Widget Component
 *
 * ARCHITECTURE: Presenter Component - Wraps ActivityFeed with dashboard styling.
 *
 * Displays recent organization activities in a dashboard widget format.
 * Integrates with dashboard date range context for filtering.
 *
 * Features:
 * - Card-wrapped layout for dashboard consistency
 * - Date range filtering from dashboard context
 * - Compact mode for space efficiency
 * - Loading and error states
 * - Optional "View All" navigation
 * - Configurable height
 *
 * @see DASH-ACTIVITY-FEED acceptance criteria
 * @see src/components/domain/activity/activity-feed.tsx (base component)
 */

import { memo, useCallback, useMemo } from 'react';
import { ExternalLink, Activity, AlertCircle, Inbox } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ActivityItem } from '@/components/shared/activity';
import type { ActivityWithUser, ActivityEntityType } from '@/lib/schemas/activities';
import { format, isToday, isYesterday, isSameDay } from 'date-fns';

// ============================================================================
// TYPES
// ============================================================================

export interface ActivityFeedWidgetProps {
  /** @source useActivityFeed() in dashboard container - activity items */
  activities: ActivityWithUser[];
  /** @source useActivityFeed() loading state in dashboard container */
  isLoading?: boolean;
  /** @source useActivityFeed() error state in dashboard container */
  error?: Error | null;
  /** @source useActivityFeed() hasNextPage in dashboard container */
  hasMore?: boolean;
  /** @source useActivityFeed() isFetchingNextPage in dashboard container */
  isFetchingMore?: boolean;
  /** @source useCallback handler in dashboard container - load more activities */
  onLoadMore?: () => void;
  /** @source useCallback handler in dashboard container - view all activities navigation */
  onViewAll?: () => void;
  /** @source useCallback handler in dashboard container - retry on error */
  onRetry?: () => void;
  /** @source Custom link generator for entity navigation */
  getEntityLink?: (entityType: ActivityEntityType, entityId: string) => string;
  /** Widget title */
  title?: string;
  /** Widget description */
  description?: string;
  /** Height of the scrollable area */
  height?: number;
  /** Maximum number of activities to show (for preview mode) */
  maxItems?: number;
  /** Show compact activity items */
  compact?: boolean;
  /** Additional class name */
  className?: string;
}

interface DateGroup {
  date: Date;
  label: string;
  activities: ActivityWithUser[];
}

// ============================================================================
// UTILITIES
// ============================================================================

/**
 * Get a human-readable label for a date.
 */
function getDateLabel(date: Date): string {
  if (isToday(date)) return 'Today';
  if (isYesterday(date)) return 'Yesterday';
  return format(date, 'EEE, MMM d');
}

/**
 * Group activities by date.
 */
function groupActivitiesByDate(activities: ActivityWithUser[]): DateGroup[] {
  const groups: DateGroup[] = [];
  let currentGroup: DateGroup | null = null;

  for (const activity of activities) {
    const activityDate = new Date(activity.createdAt);

    if (!currentGroup || !isSameDay(currentGroup.date, activityDate)) {
      currentGroup = {
        date: activityDate,
        label: getDateLabel(activityDate),
        activities: [],
      };
      groups.push(currentGroup);
    }

    currentGroup.activities.push(activity);
  }

  return groups;
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

function DateGroupHeader({ label }: { label: string }) {
  return (
    <div className="sticky top-0 z-10 bg-card px-3 py-1.5 border-b">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
    </div>
  );
}

function ActivityFeedWidgetSkeleton({ className }: { className?: string }) {
  return (
    <Card className={cn('relative overflow-hidden', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-5" />
            <Skeleton className="h-5 w-28" />
          </div>
          <Skeleton className="h-8 w-16" />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-start gap-3">
            <Skeleton className="h-8 w-8 flex-shrink-0 rounded-full" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-56" />
            </div>
            <Skeleton className="h-3 w-14 flex-shrink-0" />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

interface ActivityFeedWidgetErrorProps {
  error: Error;
  onRetry?: () => void;
  className?: string;
}

function ActivityFeedWidgetError({
  error,
  onRetry,
  className,
}: ActivityFeedWidgetErrorProps) {
  return (
    <Card className={cn('relative overflow-hidden', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
          <CardTitle className="text-base">Recent Activity</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col items-center justify-center py-8 text-center">
        <AlertCircle
          className="h-8 w-8 text-destructive mb-2"
          aria-hidden="true"
        />
        <p className="text-sm text-muted-foreground mb-2">
          {error.message || 'Failed to load activities'}
        </p>
        {onRetry && (
          <Button variant="outline" size="sm" onClick={onRetry}>
            Try again
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

function ActivityFeedWidgetEmpty({ className }: { className?: string }) {
  return (
    <Card className={cn('relative overflow-hidden', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
          <CardTitle className="text-base">Recent Activity</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col items-center justify-center py-8 text-center">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted mb-3">
          <Inbox className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
        </div>
        <p className="text-sm font-medium mb-1">No recent activity</p>
        <p className="text-xs text-muted-foreground">
          Activities will appear here as your team takes actions.
        </p>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

/**
 * Displays recent activities in a dashboard widget card.
 *
 * ARCHITECTURE: Presenter Component - receives all data via props from container.
 * NO data hooks (useQuery, useMutation) - only local UI state allowed.
 *
 * @example
 * ```tsx
 * // In dashboard container route:
 * const { data, isLoading, error, hasNextPage, fetchNextPage } = useActivityFeed({
 *   dateFrom,
 *   dateTo,
 *   pageSize: 10,
 * });
 *
 * <ActivityFeedWidget
 *   activities={data?.pages.flatMap(p => p.activities) ?? []}
 *   isLoading={isLoading}
 *   error={error}
 *   hasMore={hasNextPage}
 *   onLoadMore={fetchNextPage}
 *   onViewAll={() => navigate({ to: '/activities' })}
 *   height={350}
 *   compact
 * />
 * ```
 */
export const ActivityFeedWidget = memo(function ActivityFeedWidget({
  activities,
  isLoading = false,
  error = null,
  hasMore = false,
  isFetchingMore = false,
  onLoadMore,
  onViewAll,
  onRetry,
  getEntityLink,
  title = 'Recent Activity',
  description,
  height = 350,
  maxItems,
  compact = true,
  className,
}: ActivityFeedWidgetProps) {
  // Limit activities if maxItems is specified
  const displayActivities = useMemo(() => {
    if (maxItems && activities.length > maxItems) {
      return activities.slice(0, maxItems);
    }
    return activities;
  }, [activities, maxItems]);

  // Group activities by date
  const groups = useMemo(
    () => groupActivitiesByDate(displayActivities),
    [displayActivities]
  );

  // Handle keyboard interaction for view all
  const handleViewAllKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (onViewAll && (event.key === 'Enter' || event.key === ' ')) {
        event.preventDefault();
        onViewAll();
      }
    },
    [onViewAll]
  );

  // Loading state
  if (isLoading && activities.length === 0) {
    return <ActivityFeedWidgetSkeleton className={className} />;
  }

  // Error state
  if (error && activities.length === 0) {
    return (
      <ActivityFeedWidgetError
        error={error}
        onRetry={onRetry}
        className={className}
      />
    );
  }

  // Empty state
  if (activities.length === 0) {
    return <ActivityFeedWidgetEmpty className={className} />;
  }

  return (
    <Card className={cn('relative overflow-hidden', className)}>
      {/* Header */}
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity
              className="h-5 w-5 text-muted-foreground"
              aria-hidden="true"
            />
            <div>
              <CardTitle className="text-base">{title}</CardTitle>
              {description && (
                <CardDescription className="text-xs">
                  {description}
                </CardDescription>
              )}
            </div>
          </div>
          {onViewAll && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onViewAll}
              onKeyDown={handleViewAllKeyDown}
              className="text-xs gap-1"
            >
              View All
              <ExternalLink className="h-3 w-3" aria-hidden="true" />
            </Button>
          )}
        </div>
      </CardHeader>

      {/* Activity List */}
      <CardContent className="p-0">
        <ScrollArea
          style={{ height: typeof height === 'number' ? `${height}px` : height }}
        >
          <div role="feed" aria-label="Recent activity feed" aria-busy={isLoading}>
            {groups.map((group) => (
              <div
                key={group.label}
                role="group"
                aria-label={`Activities from ${group.label}`}
              >
                <DateGroupHeader label={group.label} />
                <div className="divide-y">
                  {group.activities.map((activity) => (
                    <ActivityItem
                      key={activity.id}
                      activity={activity}
                      compact={compact}
                      getEntityLink={getEntityLink}
                    />
                  ))}
                </div>
              </div>
            ))}

            {/* Load More */}
            {hasMore && onLoadMore && (
              <div className="flex justify-center py-3 border-t">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onLoadMore}
                  disabled={isFetchingMore}
                  className="text-xs"
                >
                  {isFetchingMore ? 'Loading...' : 'Load More'}
                </Button>
              </div>
            )}

            {/* Truncation indicator when maxItems is used */}
            {maxItems && activities.length > maxItems && (
              <div className="text-center py-2 text-xs text-muted-foreground border-t">
                Showing {maxItems} of {activities.length} activities
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
});
