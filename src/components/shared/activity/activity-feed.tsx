/**
 * Activity Feed Component
 *
 * Organization-wide activity feed with date grouping, filtering,
 * infinite scroll, and virtualization for large lists.
 *
 * ARCHITECTURE: Container/Presenter Pattern
 * - Container handles data fetching (useActivityFeed hook)
 * - Presenter renders UI and receives data via props
 *
 * @see ACTIVITY-TIMELINE-STANDARDS.md
 * @see STANDARDS.md for container/presenter pattern
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
  type UseActivityFeedOptions,
} from "@/hooks";
import { useInfiniteScrollObserver } from "@/hooks/activities/use-infinite-scroll-observer";
import { format, isToday, isYesterday, isSameDay } from "date-fns";
import { RefreshCw, Inbox, Plus, Filter } from "lucide-react";
import type {
  ActivityWithUser,
  ActivityEntityType,
  ActivityDateGroup,
} from "@/lib/schemas/activities";
import { EmptyState, EmptyStateContainer } from "@/components/shared/empty-state";
import { useCurrentUser } from "@/hooks/auth/use-current-user";

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
  /** Show compact activity items */
  compact?: boolean;
  /** Use pagination instead of infinite scroll */
  pagination?: boolean;
  className?: string;
}

export interface ActivityFeedPresenterProps {
  /** @source groups from groupActivitiesByDate() in ActivityFeed container */
  groups: ActivityDateGroup[];
  /** @source filters from useState(filters) in ActivityFeed container */
  filters: ActivityFiltersValue;
  /** @source isLoading from useActivityFeed hook in ActivityFeed container */
  isLoading: boolean;
  /** @source isError from useActivityFeed hook in ActivityFeed container */
  isError: boolean;
  /** @source error from useActivityFeed hook in ActivityFeed container */
  error?: Error | null;
  /** @source isEmpty from activities.length === 0 in ActivityFeed container */
  isEmpty: boolean;
  /** @source hasActiveFilters from Object.values(filters).some(Boolean) in ActivityFeed container */
  hasActiveFilters: boolean;
  /** @source isFetching from useActivityFeed hook in ActivityFeed container */
  isFetching: boolean;
  /** @source isFetchingNextPage from useActivityFeed hook in ActivityFeed container */
  isFetchingNextPage: boolean;
  /** @source hasNextPage from useActivityFeed hook in ActivityFeed container */
  hasNextPage: boolean;
  /** @source totalActivities from groups calculation in ActivityFeed container */
  totalActivities: number;
  /** @source useVirtualization from totalActivities > virtualizationThreshold in ActivityFeed container */
  useVirtualization: boolean;
  /** @source showFilters prop passed to ActivityFeed container */
  showFilters: boolean;
  /** @source compact prop passed to ActivityFeed container */
  compact: boolean;
  /** @source getEntityLink prop passed to ActivityFeed container */
  getEntityLink?: (entityType: ActivityEntityType, entityId: string) => string;
  /** @source currentUserId from useCurrentUser hook in ActivityFeed container */
  currentUserId?: string;
  className?: string;
  /** @source handleFiltersChange from useCallback in ActivityFeed container */
  onFiltersChange: (filters: ActivityFiltersValue) => void;
  /** @source handleRetry from useCallback in ActivityFeed container */
  onRetry: () => void;
  /** @source handleClearFilters from useCallback in ActivityFeed container */
  onClearFilters?: () => void;
  /** Ref for infinite scroll trigger element */
  loadMoreRef: React.RefObject<HTMLDivElement | null>;
  /** Ref for scroll container (for virtualization and infinite scroll observer) */
  scrollParentRef: React.RefObject<HTMLDivElement | null>;
}

// ============================================================================
// UTILITIES
// ============================================================================

/**
 * Get a human-readable label for a date.
 * Follows ACTIVITY-TIMELINE-STANDARDS.md pattern.
 */
function getDateLabel(date: Date): string {
  if (isToday(date)) return "Today";
  if (isYesterday(date)) return "Yesterday";
  return format(date, "EEEE, MMMM d, yyyy");
}

/**
 * Get entity label from entity type.
 */
function getEntityLabel(entityType: ActivityEntityType): string {
  return ENTITY_LABELS[entityType] ?? entityType.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Group activities by date and entity type.
 * Follows ACTIVITY-TIMELINE-STANDARDS.md grouping algorithm.
 */
function groupActivitiesByDate(activities: ActivityWithUser[]): ActivityDateGroup[] {
  const groups: ActivityDateGroup[] = [];
  let currentGroup: ActivityDateGroup | null = null;

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

function EmptyStateComponent({
  hasFilters,
  onClearFilters,
  onCreateActivity,
}: {
  hasFilters: boolean;
  onClearFilters?: () => void;
  onCreateActivity?: () => void;
}) {
  if (hasFilters) {
    return (
      <EmptyStateContainer variant="page">
        <EmptyState
          icon={Filter}
          title="No matching activities"
          message="Try adjusting your filters to see more results, or clear all filters to view all activities."
          primaryAction={
            onClearFilters
              ? {
                  label: "Clear filters",
                  onClick: onClearFilters,
                  icon: RefreshCw,
                }
              : undefined
          }
        />
      </EmptyStateContainer>
    );
  }

  return (
    <EmptyStateContainer variant="page">
      <EmptyState
        icon={Inbox}
        title="No activities yet"
        message="Activities will appear here as your team takes actions. Log your first activity to get started tracking your team's work."
        primaryAction={
          onCreateActivity
            ? {
                label: "Log Activity",
                onClick: onCreateActivity,
                icon: Plus,
              }
            : undefined
        }
        secondaryAction={
          onClearFilters
            ? {
                label: "View all activities",
                onClick: onClearFilters,
              }
            : undefined
        }
      />
    </EmptyStateContainer>
  );
}

function ErrorState({ error, onRetry }: { error?: Error | null; onRetry: () => void }) {
  return (
    <div
      className="flex flex-col items-center justify-center py-12 px-4 text-center"
      role="alert"
    >
      <p className="text-destructive mb-4">Failed to load activities</p>
      {error?.message && (
        <p className="text-sm text-muted-foreground mb-4">{error.message}</p>
      )}
      <Button onClick={onRetry} variant="outline" size="sm">
        <RefreshCw className="w-4 h-4 mr-2" aria-hidden="true" />
        Try again
      </Button>
    </div>
  );
}

function FilterBar({
  filters,
  onFiltersChange,
  currentUserId,
}: {
  filters: ActivityFiltersValue;
  onFiltersChange: (filters: ActivityFiltersValue) => void;
  currentUserId?: string;
}) {
  return (
    <div className="border-b p-4 shrink-0">
      <ActivityFilters
        value={filters}
        onChange={onFiltersChange}
        currentUserId={currentUserId}
      />
    </div>
  );
}

// ============================================================================
// VIRTUALIZED LIST
// ============================================================================

export interface VirtualizedFeedProps {
  groups: ActivityDateGroup[];
  parentRef: React.RefObject<HTMLDivElement | null>;
  compact?: boolean;
  getEntityLink?: (entityType: ActivityEntityType, entityId: string) => string;
}

export interface StandardFeedProps {
  groups: ActivityDateGroup[];
  compact?: boolean;
  getEntityLink?: (entityType: ActivityEntityType, entityId: string) => string;
}

/**
 * Virtualized feed component.
 * Follows ACTIVITY-TIMELINE-STANDARDS.md virtualization pattern.
 * Separate component ensures hooks only called when virtualization is enabled.
 */
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

  // eslint-disable-next-line react-hooks/incompatible-library -- useVirtualizer returns functions that cannot be memoized; known TanStack Virtual limitation
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
        if (!item) return null;

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
// PRESENTER
// ============================================================================

/**
 * Activity Feed Presenter
 *
 * Pure UI component - receives all data and callbacks via props.
 * No data fetching hooks, no state management.
 */
export const ActivityFeedPresenter = React.memo(function ActivityFeedPresenter({
  groups,
  filters,
  isLoading,
  isError,
  error,
  isEmpty,
  hasActiveFilters,
  isFetching,
  isFetchingNextPage,
  hasNextPage,
  totalActivities,
  useVirtualization,
  showFilters,
  compact,
  getEntityLink,
  currentUserId,
  className,
  onFiltersChange,
  onRetry,
  onClearFilters,
  loadMoreRef,
  scrollParentRef,
}: ActivityFeedPresenterProps) {
  // Render loading state
  if (isLoading) {
    return (
      <div className={cn("flex flex-col", className)}>
        {showFilters && (
          <FilterBar
            filters={filters}
            onFiltersChange={onFiltersChange}
            currentUserId={currentUserId}
          />
        )}
        <LoadingState />
      </div>
    );
  }

  // Render error state
  if (isError) {
    return (
      <div className={cn("flex flex-col", className)}>
        {showFilters && (
          <FilterBar
            filters={filters}
            onFiltersChange={onFiltersChange}
            currentUserId={currentUserId}
          />
        )}
        <ErrorState error={error} onRetry={onRetry} />
      </div>
    );
  }

  // Render empty state
  if (isEmpty) {
    return (
      <div className={cn("flex flex-col", className)}>
        {showFilters && (
          <FilterBar
            filters={filters}
            onFiltersChange={onFiltersChange}
            currentUserId={currentUserId}
          />
        )}
        <EmptyStateComponent
          hasFilters={hasActiveFilters}
          onClearFilters={onClearFilters}
        />
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col overflow-hidden", className)}>
      {showFilters && (
        <FilterBar
          filters={filters}
          onFiltersChange={onFiltersChange}
          currentUserId={currentUserId}
        />
      )}

      <ScrollArea ref={scrollParentRef} className="flex-1 min-h-0">
        <div
          role="feed"
          aria-busy={isFetching}
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
          {hasNextPage && (
            <div
              ref={loadMoreRef}
              className="h-16 w-full"
              aria-hidden="true"
              data-infinite-scroll-trigger
            />
          )}

          {/* Loading indicator for next page */}
          {isFetchingNextPage && (
            <div className="flex justify-center py-4">
              <RefreshCw
                className="w-5 h-5 animate-spin text-muted-foreground"
                aria-label="Loading more activities"
              />
            </div>
          )}

          {/* End of feed indicator */}
          {!hasNextPage && totalActivities > 0 && (
            <div
              className="text-center py-6 text-sm text-muted-foreground"
              role="status"
              aria-label="End of activity feed"
            >
              <span className="inline-flex items-center gap-2">
                <span className="h-px w-8 bg-border"></span>
                You&apos;ve reached the end
                <span className="h-px w-8 bg-border"></span>
              </span>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
});

// ============================================================================
// CONTAINER
// ============================================================================

/**
 * Activity Feed Container
 *
 * Container responsibilities:
 * - Fetches data via useActivityFeed hook
 * - Manages filter state
 * - Handles infinite scroll logic
 * - Groups activities by date and entity
 * - Passes data and callbacks to presenter
 *
 * @source activities from useActivityFeed hook
 * @source currentUser from useCurrentUser hook
 */
export function ActivityFeed({
  filters: initialFilters = {},
  onFiltersChange,
  showFilters = true,
  virtualizationThreshold = 50,
  getEntityLink,
  compact = false,
  className,
}: ActivityFeedProps) {
  // Use reducer for filter state to handle sync more cleanly
  const [filters, setFilters] = React.useReducer(
    (_prev: ActivityFiltersValue, next: ActivityFiltersValue) => next,
    {
      entityType: initialFilters.entityType,
      action: initialFilters.action,
      userId: initialFilters.userId,
      dateFrom: initialFilters.dateFrom,
      dateTo: initialFilters.dateTo,
    }
  );

  // Sync filters when prop changes (URL navigation) - use reducer dispatch
  const dateFromTime = initialFilters.dateFrom?.getTime();
  const dateToTime = initialFilters.dateTo?.getTime();
  
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
    initialFilters.dateFrom,
    initialFilters.dateTo,
    dateFromTime,
    dateToTime,
  ]);

  // Fetch activities with current filters
  const feedQuery = useActivityFeed({
    ...filters,
    pageSize: 20,
  });

  const activities = useFlattenedActivities(feedQuery);
  const { user: currentUser } = useCurrentUser();

  // Refs for scroll container and infinite scroll trigger
  const scrollParentRef = React.useRef<HTMLDivElement>(null);
  
  // Use custom hook for infinite scroll observer
  const loadMoreRef = useInfiniteScrollObserver({
    hasNextPage: feedQuery.hasNextPage ?? false,
    isFetchingNextPage: feedQuery.isFetchingNextPage,
    fetchNextPage: feedQuery.fetchNextPage,
    scrollContainerRef: scrollParentRef,
  });

  // Group activities by date
  const groups = React.useMemo(
    () => groupActivitiesByDate(activities),
    [activities]
  );

  // Calculate total activities and virtualization decision in container
  const totalActivities = React.useMemo(() => {
    return groups.reduce(
      (sum, group) =>
        sum + group.entities.reduce((entitySum, entity) => entitySum + entity.activities.length, 0),
      0
    );
  }, [groups]);

  const useVirtualization = totalActivities > virtualizationThreshold;

  // Check if any filters are active
  const hasActiveFilters = React.useMemo(
    () => Object.values(filters).some(Boolean),
    [filters]
  );

  // Handle filter changes - notify parent for URL sync
  const handleFiltersChange = React.useCallback((newFilters: ActivityFiltersValue) => {
    setFilters(newFilters);
    onFiltersChange?.(newFilters);
  }, [onFiltersChange]);

  // Handle retry - refetch is stable from TanStack Query
  const handleRetry = React.useCallback(() => {
    feedQuery.refetch();
  }, [feedQuery]);

  // Handle clear filters - wrap in useCallback for prop stability
  const handleClearFilters = React.useCallback(() => {
    handleFiltersChange({});
  }, [handleFiltersChange]);

  return (
    <ActivityFeedPresenter
      groups={groups}
      filters={filters}
      isLoading={feedQuery.isLoading && !feedQuery.data}
      isError={feedQuery.isError}
      error={feedQuery.error instanceof Error ? feedQuery.error : feedQuery.error ? new Error(String(feedQuery.error)) : null}
      isEmpty={activities.length === 0}
      hasActiveFilters={hasActiveFilters}
      isFetching={feedQuery.isFetching}
      isFetchingNextPage={feedQuery.isFetchingNextPage}
      hasNextPage={feedQuery.hasNextPage ?? false}
      totalActivities={totalActivities}
      useVirtualization={useVirtualization}
      showFilters={showFilters}
      compact={compact}
      getEntityLink={getEntityLink}
      currentUserId={currentUser?.id}
      className={className}
      onFiltersChange={handleFiltersChange}
      onRetry={handleRetry}
      onClearFilters={hasActiveFilters ? handleClearFilters : undefined}
      loadMoreRef={loadMoreRef}
      scrollParentRef={scrollParentRef}
    />
  );
}
