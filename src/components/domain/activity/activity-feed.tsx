/**
 * Activity Feed Component
 *
 * Organization-wide activity feed with date grouping, filtering,
 * infinite scroll, and virtualization for large lists.
 *
 * @see ACTIVITY-FEED-UI acceptance criteria
 */

import * as React from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { cn } from '~/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { ActivityItem } from './activity-item';
import { ActivityFilters, type ActivityFiltersValue } from './activity-filters';
import {
  useActivityFeed,
  useFlattenedActivities,
  useCanLoadMore,
  type UseActivityFeedOptions,
} from '@/hooks';
import { format, isToday, isYesterday, isSameDay } from 'date-fns';
import { RefreshCw, Inbox } from 'lucide-react';
import type { ActivityWithUser, ActivityEntityType } from '@/lib/schemas/activities';

// ============================================================================
// TYPES
// ============================================================================

export interface ActivityFeedProps {
  /** Initial filters */
  filters?: UseActivityFeedOptions;
  /** Callback when filters change - use to sync with URL */
  onFiltersChange?: (filters: ActivityFiltersValue) => void;
  /** Show filter bar */
  showFilters?: boolean;
  /** Minimum items before enabling virtualization */
  virtualizationThreshold?: number;
  /** Custom link generator for entities */
  getEntityLink?: (entityType: ActivityEntityType, entityId: string) => string;
  /** Height of the feed container (for virtualization) */
  height?: number | string;
  /** Show compact activity items */
  compact?: boolean;
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
  return format(date, 'EEEE, MMMM d, yyyy');
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
    <div
      className="bg-background/95 supports-[backdrop-filter]:bg-background/60 sticky top-0 z-10 border-b px-4 py-2 backdrop-blur"
      role="heading"
      aria-level={2}
    >
      <span className="text-muted-foreground text-sm font-medium">{label}</span>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="space-y-4 p-4" aria-busy="true" aria-label="Loading activities">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-start gap-3">
          <Skeleton className="h-10 w-10 flex-shrink-0 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
          <Skeleton className="h-4 w-20 flex-shrink-0" />
        </div>
      ))}
    </div>
  );
}

function EmptyState({ hasFilters }: { hasFilters: boolean }) {
  return (
    <div
      className="flex flex-col items-center justify-center px-4 py-12 text-center"
      role="status"
      aria-label={hasFilters ? 'No matching activities' : 'No activities yet'}
    >
      <div className="bg-muted mb-4 flex h-12 w-12 items-center justify-center rounded-full">
        <Inbox className="text-muted-foreground h-6 w-6" aria-hidden="true" />
      </div>
      <h3 className="mb-1 text-lg font-medium">
        {hasFilters ? 'No matching activities' : 'No activities yet'}
      </h3>
      <p className="text-muted-foreground max-w-sm text-sm">
        {hasFilters
          ? 'Try adjusting your filters to see more results.'
          : 'Activities will appear here as your team takes actions.'}
      </p>
    </div>
  );
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center px-4 py-12 text-center" role="alert">
      <p className="text-destructive mb-4">Failed to load activities</p>
      <Button onClick={onRetry} variant="outline" size="sm">
        <RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" />
        Try again
      </Button>
    </div>
  );
}

// ============================================================================
// VIRTUALIZED LIST
// ============================================================================

interface VirtualizedFeedProps {
  groups: DateGroup[];
  parentRef: React.RefObject<HTMLDivElement | null>;
  compact?: boolean;
  getEntityLink?: (entityType: ActivityEntityType, entityId: string) => string;
}

function VirtualizedFeed({ groups, parentRef, compact, getEntityLink }: VirtualizedFeedProps) {
  // Build flat list with date headers
  const items = React.useMemo(() => {
    const result: Array<
      { type: 'header'; label: string } | { type: 'activity'; activity: ActivityWithUser }
    > = [];

    for (const group of groups) {
      result.push({ type: 'header', label: group.label });
      for (const activity of group.activities) {
        result.push({ type: 'activity', activity });
      }
    }

    return result;
  }, [groups]);

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: (index) => {
      // Headers are smaller than activity items
      return items[index].type === 'header' ? 40 : compact ? 60 : 80;
    },
    overscan: 10,
  });

  return (
    <div
      style={{
        height: `${virtualizer.getTotalSize()}px`,
        width: '100%',
        position: 'relative',
      }}
    >
      {virtualizer.getVirtualItems().map((virtualRow) => {
        const item = items[virtualRow.index];

        return (
          <div
            key={virtualRow.key}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: `${virtualRow.size}px`,
              transform: `translateY(${virtualRow.start}px)`,
            }}
          >
            {item.type === 'header' ? (
              <DateGroupHeader label={item.label} />
            ) : (
              <ActivityItem
                activity={item.activity}
                compact={compact}
                getEntityLink={getEntityLink}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ============================================================================
// NON-VIRTUALIZED LIST
// ============================================================================

interface StandardFeedProps {
  groups: DateGroup[];
  compact?: boolean;
  getEntityLink?: (entityType: ActivityEntityType, entityId: string) => string;
}

function StandardFeed({ groups, compact, getEntityLink }: StandardFeedProps) {
  return (
    <div className="space-y-1">
      {groups.map((group) => (
        <div key={group.label} role="group" aria-label={`Activities from ${group.label}`}>
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
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

/**
 * Activity feed with filtering, date grouping, infinite scroll, and virtualization.
 *
 * @example
 * ```tsx
 * // Basic usage
 * <ActivityFeed showFilters />
 *
 * // With initial filters
 * <ActivityFeed
 *   filters={{ entityType: "customer" }}
 *   height={600}
 * />
 *
 * // Compact mode for sidebars
 * <ActivityFeed compact height={400} />
 * ```
 */
export function ActivityFeed({
  filters: initialFilters = {},
  onFiltersChange,
  showFilters = true,
  virtualizationThreshold = 50,
  getEntityLink,
  height = 600,
  compact = false,
  className,
}: ActivityFeedProps) {
  const [filters, setFilters] = React.useState<ActivityFiltersValue>({
    entityType: initialFilters.entityType,
    action: initialFilters.action,
    userId: initialFilters.userId,
    dateFrom: initialFilters.dateFrom,
    dateTo: initialFilters.dateTo,
  });

  // Sync filters when prop changes (URL navigation)
  React.useEffect(() => {
    setFilters({
      entityType: initialFilters.entityType,
      action: initialFilters.action,
      userId: initialFilters.userId,
      dateFrom: initialFilters.dateFrom,
      dateTo: initialFilters.dateTo,
    });
  }, [
    initialFilters.entityType,
    initialFilters.action,
    initialFilters.userId,
    initialFilters.dateFrom?.getTime(),
    initialFilters.dateTo?.getTime(),
  ]);

  // Fetch activities with current filters
  const feedQuery = useActivityFeed({
    ...filters,
    pageSize: 20,
  });

  const activities = useFlattenedActivities(feedQuery);
  const canLoadMore = useCanLoadMore(feedQuery);

  // Intersection observer for infinite scroll
  const loadMoreRef = React.useRef<HTMLDivElement>(null);

  // Use ref for canLoadMore to avoid recreating observer on every change
  const canLoadMoreRef = React.useRef(canLoadMore);

  React.useEffect(() => {
    canLoadMoreRef.current = canLoadMore;
  }, [canLoadMore]);

  React.useEffect(() => {
    const element = loadMoreRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && canLoadMoreRef.current) {
          feedQuery.fetchNextPage();
        }
      },
      { threshold: 0, rootMargin: '100px' }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [feedQuery]); // feedQuery is stable from TanStack Query

  // Group activities by date
  const groups = React.useMemo(
    () => groupActivitiesByDate(activities as ActivityWithUser[]),
    [activities]
  );

  // Determine if virtualization should be used
  const useVirtualization = activities.length > virtualizationThreshold;
  const scrollParentRef = React.useRef<HTMLDivElement>(null);

  // Check if any filters are active
  const hasActiveFilters = Object.values(filters).some(Boolean);

  // Handle filter changes - notify parent for URL sync
  const handleFiltersChange = (newFilters: ActivityFiltersValue) => {
    setFilters(newFilters);
    onFiltersChange?.(newFilters);
  };

  // Render states
  if (feedQuery.isLoading && !feedQuery.data) {
    return (
      <div className={cn('flex flex-col', className)}>
        {showFilters && (
          <div className="border-b p-4">
            <ActivityFilters value={filters} onChange={handleFiltersChange} />
          </div>
        )}
        <LoadingState />
      </div>
    );
  }

  if (feedQuery.isError) {
    return (
      <div className={cn('flex flex-col', className)}>
        {showFilters && (
          <div className="border-b p-4">
            <ActivityFilters value={filters} onChange={handleFiltersChange} />
          </div>
        )}
        <ErrorState onRetry={() => feedQuery.refetch()} />
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className={cn('flex flex-col', className)}>
        {showFilters && (
          <div className="border-b p-4">
            <ActivityFilters value={filters} onChange={handleFiltersChange} />
          </div>
        )}
        <EmptyState hasFilters={hasActiveFilters} />
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col', className)}>
      {showFilters && (
        <div className="border-b p-4">
          <ActivityFilters value={filters} onChange={handleFiltersChange} />
        </div>
      )}

      <ScrollArea
        ref={scrollParentRef}
        style={{ height: typeof height === 'number' ? `${height}px` : height }}
        className="flex-1"
      >
        <div role="feed" aria-busy={feedQuery.isFetching} aria-label="Activity feed">
          {useVirtualization ? (
            <VirtualizedFeed
              groups={groups}
              parentRef={scrollParentRef}
              compact={compact}
              getEntityLink={getEntityLink}
            />
          ) : (
            <StandardFeed groups={groups} compact={compact} getEntityLink={getEntityLink} />
          )}

          {/* Infinite scroll trigger */}
          <div ref={loadMoreRef} className="h-1" />

          {/* Loading indicator for next page */}
          {feedQuery.isFetchingNextPage && (
            <div className="flex justify-center py-4">
              <RefreshCw
                className="text-muted-foreground h-5 w-5 animate-spin"
                aria-label="Loading more activities"
              />
            </div>
          )}

          {/* End of feed indicator */}
          {!feedQuery.hasNextPage && activities.length > 0 && (
            <div className="text-muted-foreground py-4 text-center text-sm">
              You&apos;ve reached the end
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
