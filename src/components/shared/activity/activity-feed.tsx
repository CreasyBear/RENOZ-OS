/**
 * Activity Feed Component
 *
 * Organization-wide activity feed with date grouping, filtering,
 * infinite scroll, and virtualization for large lists.
 *
 * @see ACTIVITY-FEED-UI acceptance criteria
 */

import * as React from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ActivityItem } from "./activity-item";
import { ActivityFilters, type ActivityFiltersValue } from "./activity-filters";
import { ENTITY_LABELS, ENTITY_ICONS } from "./activity-config";
import {
  useActivityFeed,
  useFlattenedActivities,
  useCanLoadMore,
  type UseActivityFeedOptions,
} from "@/hooks";
import { format, isToday, isYesterday, isSameDay } from "date-fns";
import { RefreshCw, Inbox } from "lucide-react";
import type { ActivityWithUser, ActivityEntityType } from "@/lib/schemas/activities";

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
  entities: EntityGroup[];
}

interface EntityGroup {
  entityType: ActivityEntityType;
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
  if (isToday(date)) return "Today";
  if (isYesterday(date)) return "Yesterday";
  return format(date, "EEEE, MMMM d, yyyy");
}

/**
 * Group activities by date.
 */
function getEntityLabel(entityType: ActivityEntityType): string {
  return ENTITY_LABELS[entityType] ?? entityType.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function groupActivitiesByDate(activities: ActivityWithUser[]): DateGroup[] {
  const groups: DateGroup[] = [];
  let currentGroup: DateGroup | null = null;

  for (const activity of activities) {
    const activityDate = new Date(activity.createdAt);

    if (!currentGroup || !isSameDay(currentGroup.date, activityDate)) {
      currentGroup = {
        date: activityDate,
        label: getDateLabel(activityDate),
        entities: [],
      };
      groups.push(currentGroup);
    }

    const entityLabel = getEntityLabel(activity.entityType);
    let entityGroup = currentGroup.entities.find((group) => group.entityType === activity.entityType);
    if (!entityGroup) {
      entityGroup = {
        entityType: activity.entityType,
        label: entityLabel,
        activities: [],
      };
      currentGroup.entities.push(entityGroup);
    }
    entityGroup.activities.push(activity);
  }

  return groups;
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

function DateGroupHeader({ label }: { label: string }) {
  return (
    <div
      className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 py-2.5 px-4 border-b border-border/40"
      role="heading"
      aria-level={2}
    >
      <span className="text-sm font-semibold text-foreground">{label}</span>
    </div>
  );
}

function EntityGroupHeader({
  entityType,
  label,
  count,
}: {
  entityType: ActivityEntityType;
  label: string;
  count: number;
}) {
  const Icon = ENTITY_ICONS[entityType] ?? Inbox;
  return (
    <div className="flex items-center gap-2 px-4 py-2 text-xs font-medium text-muted-foreground border-l-2 border-primary/20 ml-4 bg-muted/20">
      <Icon className="size-3.5 shrink-0" aria-hidden="true" />
      <span>{label}</span>
      <Badge variant="secondary" className="text-[10px] h-4 px-1.5 font-normal">
        {count}
      </Badge>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="space-y-4 p-4" aria-busy="true" aria-label="Loading activities">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-start gap-3">
          <Skeleton className="w-10 h-10 rounded-full flex-shrink-0" />
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
      className="flex flex-col items-center justify-center py-16 px-4 text-center"
      role="status"
      aria-label={hasFilters ? "No matching activities" : "No activities yet"}
    >
      <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
        <Inbox className="w-8 h-8 text-muted-foreground" aria-hidden="true" />
      </div>
      <h3 className="font-semibold text-lg mb-2 text-foreground">
        {hasFilters ? "No matching activities" : "No activities yet"}
      </h3>
      <p className="text-sm text-muted-foreground max-w-sm leading-relaxed">
        {hasFilters
          ? "Try adjusting your filters to see more results."
          : "Activities will appear here as your team takes actions."}
      </p>
    </div>
  );
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div
      className="flex flex-col items-center justify-center py-12 px-4 text-center"
      role="alert"
    >
      <p className="text-destructive mb-4">Failed to load activities</p>
      <Button onClick={onRetry} variant="outline" size="sm">
        <RefreshCw className="w-4 h-4 mr-2" aria-hidden="true" />
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

function VirtualizedFeed({
  groups,
  parentRef,
  compact,
  getEntityLink,
}: VirtualizedFeedProps) {
  // Build flat list with date headers
  const items = React.useMemo(() => {
    const result: Array<
      | { type: "header"; label: string }
      | { type: "entity-header"; label: string; entityType: ActivityEntityType; count: number }
      | { type: "activity"; activity: ActivityWithUser }
    > = [];

    for (const group of groups) {
      result.push({ type: "header", label: group.label });
      for (const entityGroup of group.entities) {
        result.push({
          type: "entity-header",
          label: entityGroup.label,
          entityType: entityGroup.entityType,
          count: entityGroup.activities.length,
        });
        for (const activity of entityGroup.activities) {
          result.push({ type: "activity", activity });
        }
      }
    }

    return result;
  }, [groups]);

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: (index) => {
      // Headers are smaller than activity items
      const item = items[index];
      if (item.type === "header") return 40;
      if (item.type === "entity-header") return 32;
      return compact ? 60 : 80;
    },
    overscan: 10,
  });

  return (
    <div
      style={{
        height: `${virtualizer.getTotalSize()}px`,
        width: "100%",
        position: "relative",
      }}
    >
      {virtualizer.getVirtualItems().map((virtualRow) => {
        const item = items[virtualRow.index];

        return (
          <div
            key={virtualRow.key}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: `${virtualRow.size}px`,
              transform: `translateY(${virtualRow.start}px)`,
            }}
          >
            {item.type === "header" ? (
              <DateGroupHeader label={item.label} />
            ) : item.type === "entity-header" ? (
              <EntityGroupHeader
                label={item.label}
                entityType={item.entityType}
                count={item.count}
              />
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
          <div className="space-y-1">
            {group.entities.map((entityGroup) => (
              <div key={entityGroup.entityType} className="divide-y">
                <EntityGroupHeader
                  label={entityGroup.label}
                  entityType={entityGroup.entityType}
                  count={entityGroup.activities.length}
                />
                {entityGroup.activities.map((activity) => (
                  <ActivityItem
                    key={activity.id}
                    activity={activity}
                    compact={compact}
                    getEntityLink={getEntityLink}
                  />
                ))}
              </div>
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
  height: _height = 600, // Height now controlled via className
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
  canLoadMoreRef.current = canLoadMore;

  // Set up intersection observer for infinite scroll
  React.useEffect(() => {
    const element = loadMoreRef.current;
    if (!element) return;

    // Find the ScrollArea viewport element (Radix UI wraps content in a Viewport)
    const scrollContainer = scrollParentRef.current;
    if (!scrollContainer) return;

    let observer: IntersectionObserver | null = null;

    // Use requestAnimationFrame to ensure DOM is ready
    const rafId = requestAnimationFrame(() => {
      const viewport = scrollContainer.querySelector(
        '[data-slot="scroll-area-viewport"]'
      ) as HTMLElement;

      if (!viewport && process.env.NODE_ENV === 'development') {
        console.warn('[ActivityFeed] ScrollArea viewport not found, using document viewport');
      }

      observer = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting && canLoadMoreRef.current) {
            feedQuery.fetchNextPage();
          }
        },
        {
          threshold: 0,
          rootMargin: "200px", // Increased margin for earlier trigger
          root: viewport || null, // Use ScrollArea viewport as root, fallback to document viewport
        }
      );

      observer.observe(element);
    });

    return () => {
      cancelAnimationFrame(rafId);
      if (observer) {
        observer.disconnect();
      }
    };
  }, [feedQuery, activities.length]); // Re-run when activities change or query updates

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
      <div className={cn("flex flex-col", className)}>
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
      <div className={cn("flex flex-col", className)}>
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
      <div className={cn("flex flex-col", className)}>
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
    <div className={cn("flex flex-col overflow-hidden", className)}>
      {showFilters && (
        <div className="border-b p-4 shrink-0">
          <ActivityFilters value={filters} onChange={handleFiltersChange} />
        </div>
      )}

      <ScrollArea
        ref={scrollParentRef}
        className="flex-1 min-h-0"
      >
        <div
          role="feed"
          aria-busy={feedQuery.isFetching}
          aria-label="Activity feed"
        >
          {useVirtualization ? (
            <VirtualizedFeed
              groups={groups}
              parentRef={scrollParentRef}
              compact={compact}
              getEntityLink={getEntityLink}
            />
          ) : (
            <StandardFeed
              groups={groups}
              compact={compact}
              getEntityLink={getEntityLink}
            />
          )}

          {/* Infinite scroll trigger - always render so observer can attach */}
          <div
            ref={loadMoreRef}
            className="h-4 w-full"
            aria-hidden="true"
            data-infinite-scroll-trigger
          />

          {/* Loading indicator for next page */}
          {feedQuery.isFetchingNextPage && (
            <div className="flex justify-center py-4">
              <RefreshCw
                className="w-5 h-5 animate-spin text-muted-foreground"
                aria-label="Loading more activities"
              />
            </div>
          )}

          {/* End of feed indicator */}
          {!feedQuery.hasNextPage && activities.length > 0 && (
            <div className="text-center py-6 text-sm text-muted-foreground" role="status" aria-label="End of activity feed">
              <span className="inline-flex items-center gap-2">
                <span className="h-px w-8 bg-border"></span>
                You've reached the end
                <span className="h-px w-8 bg-border"></span>
              </span>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
