/**
 * Activity Timeline Component
 *
 * Entity-specific vertical timeline with milestone markers,
 * expandable change details, and export capabilities.
 *
 * @see ACTIVITY-TIMELINE-UI acceptance criteria
 */

import * as React from "react";
import { cn, buildSafeCSV, downloadCSV } from "~/lib/utils";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  ChevronDown,
  ChevronRight,
  Download,
  FileText,
  RefreshCw,
  Inbox,
} from "lucide-react";
import { ChangeDiff } from "./change-diff";
import { ACTION_ICONS, ACTION_COLORS, ENTITY_LABELS } from "./activity-item";
import {
  useEntityActivities,
  useFlattenedActivities,
  useCanLoadMore,
} from "@/hooks";
import { formatDistanceToNow, format, isSameDay } from "date-fns";
import type {
  ActivityWithUser,
  ActivityEntityType,
} from "@/lib/schemas/activities";

// ============================================================================
// TYPES
// ============================================================================

export interface ActivityTimelineProps {
  /** Entity type to filter by */
  entityType: ActivityEntityType;
  /** Entity ID to filter by */
  entityId: string;
  /** Show export buttons */
  showExport?: boolean;
  /** Maximum height before scrolling */
  maxHeight?: number | string;
  /** Show loading skeleton while fetching */
  showSkeleton?: boolean;
  className?: string;
}

interface TimelineItemProps {
  activity: ActivityWithUser;
  isLast: boolean;
  showDateMarker: boolean;
}

// ============================================================================
// UTILITIES
// ============================================================================

function getInitials(name: string | null, email: string): string {
  if (name) {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }
  return email[0].toUpperCase();
}

function formatDateMarker(date: Date): string {
  const now = new Date();
  const isThisYear = date.getFullYear() === now.getFullYear();
  return isThisYear ? format(date, "MMMM d") : format(date, "MMMM d, yyyy");
}

/**
 * Check if this activity should show a date marker
 * (first item of a new day)
 */
function shouldShowDateMarker(
  activity: ActivityWithUser,
  prevActivity?: ActivityWithUser
): boolean {
  if (!prevActivity) return true;
  const current = new Date(activity.createdAt);
  const prev = new Date(prevActivity.createdAt);
  return !isSameDay(current, prev);
}

// ============================================================================
// EXPORT UTILITIES
// ============================================================================

function exportToCSV(activities: ActivityWithUser[], entityType: string) {
  const headers = ["Date", "Time", "Action", "User", "Description", "Changes"];
  const rows = activities.map((a) => {
    const date = new Date(a.createdAt);
    return [
      format(date, "yyyy-MM-dd"),
      format(date, "HH:mm:ss"),
      a.action,
      a.user?.name ?? a.user?.email ?? "System",
      a.description ?? "",
      a.changes?.fields?.join(", ") ?? "",
    ];
  });

  // Use safe CSV builder to prevent injection attacks
  const csv = buildSafeCSV(headers, rows);
  downloadCSV(csv, `${entityType}-activity-${format(new Date(), "yyyy-MM-dd")}`);
}

function exportToPDF(_activities: ActivityWithUser[], _entityType: string) {
  // PDF export would typically use a library like jsPDF or html2pdf
  // For now, trigger print dialog as a simple PDF alternative
  window.print();
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

function TimelineLoading() {
  return (
    <div className="space-y-6 p-4" aria-busy="true" aria-label="Loading timeline">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex gap-4">
          <div className="flex flex-col items-center">
            <Skeleton className="w-10 h-10 rounded-full" />
            <Skeleton className="w-0.5 h-20 mt-2" />
          </div>
          <div className="flex-1 space-y-2 pt-1">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-56" />
            <Skeleton className="h-4 w-24" />
          </div>
        </div>
      ))}
    </div>
  );
}

function TimelineEmpty({ entityType }: { entityType: ActivityEntityType }) {
  return (
    <div
      className="flex flex-col items-center justify-center py-12 px-4 text-center"
      role="status"
      aria-label="No activity history"
    >
      <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
        <Inbox className="w-6 h-6 text-muted-foreground" aria-hidden="true" />
      </div>
      <h3 className="font-medium text-lg mb-1">No activity yet</h3>
      <p className="text-sm text-muted-foreground max-w-sm">
        Activity will appear here as changes are made to this {ENTITY_LABELS[entityType].toLowerCase()}.
      </p>
    </div>
  );
}

function TimelineError({ onRetry }: { onRetry: () => void }) {
  return (
    <div
      className="flex flex-col items-center justify-center py-12 px-4 text-center"
      role="alert"
    >
      <p className="text-destructive mb-4">Failed to load activity history</p>
      <Button onClick={onRetry} variant="outline" size="sm">
        <RefreshCw className="w-4 h-4 mr-2" aria-hidden="true" />
        Try again
      </Button>
    </div>
  );
}

function DateMarker({ date }: { date: Date }) {
  return (
    <div className="flex items-center gap-2 py-2">
      <div className="h-px flex-1 bg-border" />
      <span className="text-xs font-medium text-muted-foreground px-2">
        {formatDateMarker(date)}
      </span>
      <div className="h-px flex-1 bg-border" />
    </div>
  );
}

function TimelineItem({ activity, isLast, showDateMarker }: TimelineItemProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const hasChanges = activity.changes && activity.changes.fields?.length;
  const ActionIcon = ACTION_ICONS[activity.action];
  const actionColor = ACTION_COLORS[activity.action];

  const createdAt = new Date(activity.createdAt);
  const relativeTime = formatDistanceToNow(createdAt, { addSuffix: true });
  const absoluteTime = format(createdAt, "PPpp");

  return (
    <>
      {showDateMarker && <DateMarker date={createdAt} />}
      <li className="relative flex gap-4 pb-6 last:pb-0">
        {/* Timeline connector */}
        {!isLast && (
          <div
            className="absolute left-4 top-10 bottom-0 w-0.5 bg-border -translate-x-1/2"
            aria-hidden="true"
          />
        )}

        {/* Action icon */}
        <div
          className={cn(
            "relative z-10 flex items-center justify-center w-8 h-8 rounded-full shrink-0 ring-4 ring-background",
            actionColor
          )}
          aria-label={`${activity.action} action`}
        >
          <ActionIcon className="w-4 h-4" aria-hidden="true" />
        </div>

        {/* Content */}
        <Collapsible open={isOpen} onOpenChange={setIsOpen} className="flex-1 min-w-0">
          <div className="space-y-1">
            {/* Header */}
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                {/* User */}
                {activity.user ? (
                  <span className="text-sm flex items-center gap-1.5">
                    <Avatar className="w-5 h-5">
                      <AvatarFallback className="text-[10px]">
                        {getInitials(activity.user.name, activity.user.email)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="font-medium">{activity.user.name ?? activity.user.email}</span>
                  </span>
                ) : (
                  <span className="text-sm text-muted-foreground">System</span>
                )}

                {/* Action badge */}
                <Badge variant="outline" className="font-normal text-xs">
                  {activity.action}
                </Badge>
              </div>

              {/* Timestamp */}
              <time
                className="text-xs text-muted-foreground shrink-0"
                dateTime={createdAt.toISOString()}
                title={absoluteTime}
              >
                {relativeTime}
              </time>
            </div>

            {/* Description */}
            {activity.description && (
              <p className="text-sm text-muted-foreground">{activity.description}</p>
            )}

            {/* Changes toggle */}
            {hasChanges && (
              <CollapsibleTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto p-0 text-xs text-muted-foreground hover:text-foreground"
                  aria-expanded={isOpen}
                  aria-label={isOpen ? "Hide changes" : "Show changes"}
                >
                  {isOpen ? (
                    <ChevronDown className="w-3.5 h-3.5 mr-1" aria-hidden="true" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5 mr-1" aria-hidden="true" />
                  )}
                  {activity.changes!.fields!.length} field
                  {activity.changes!.fields!.length === 1 ? "" : "s"} changed
                </Button>
              </CollapsibleTrigger>
            )}

            {/* Expandable changes */}
            {hasChanges && (
              <CollapsibleContent className="mt-2">
                <div className="border rounded-lg p-3 bg-muted/30">
                  <ChangeDiff changes={activity.changes} compact />
                </div>
              </CollapsibleContent>
            )}
          </div>
        </Collapsible>
      </li>
    </>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

/**
 * Entity-specific activity timeline with milestone markers and export.
 *
 * @example
 * ```tsx
 * // Basic usage in a detail page sidebar
 * <ActivityTimeline
 *   entityType="customer"
 *   entityId={customer.id}
 *   showExport
 * />
 *
 * // In a tab panel
 * <ActivityTimeline
 *   entityType="order"
 *   entityId={order.id}
 *   maxHeight={400}
 * />
 * ```
 */
export function ActivityTimeline({
  entityType,
  entityId,
  showExport = false,
  maxHeight,
  showSkeleton = true,
  className,
}: ActivityTimelineProps) {
  const query = useEntityActivities({ entityType, entityId, pageSize: 50 });
  const activities = useFlattenedActivities(query) as ActivityWithUser[];
  const canLoadMore = useCanLoadMore(query);

  // Loading state
  if (query.isLoading && showSkeleton) {
    return <TimelineLoading />;
  }

  // Error state
  if (query.isError) {
    return <TimelineError onRetry={() => query.refetch()} />;
  }

  // Empty state
  if (activities.length === 0) {
    return <TimelineEmpty entityType={entityType} />;
  }

  return (
    <div className={cn("flex flex-col", className)}>
      {/* Export buttons */}
      {showExport && activities.length > 0 && (
        <div className="flex items-center justify-end gap-2 mb-4 print:hidden">
          <Button
            variant="outline"
            size="sm"
            onClick={() => exportToCSV(activities, entityType)}
            aria-label="Export to CSV"
          >
            <Download className="w-4 h-4 mr-2" aria-hidden="true" />
            CSV
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => exportToPDF(activities, entityType)}
            aria-label="Export to PDF"
          >
            <FileText className="w-4 h-4 mr-2" aria-hidden="true" />
            PDF
          </Button>
        </div>
      )}

      {/* Timeline */}
      <div
        className="overflow-y-auto"
        style={{ maxHeight: typeof maxHeight === "number" ? `${maxHeight}px` : maxHeight }}
      >
        <ol
          className="relative space-y-0"
          role="list"
          aria-label={`Activity history for ${ENTITY_LABELS[entityType]}`}
        >
          {activities.map((activity, index) => (
            <TimelineItem
              key={activity.id}
              activity={activity}
              isLast={index === activities.length - 1 && !canLoadMore}
              showDateMarker={shouldShowDateMarker(activity, activities[index - 1])}
            />
          ))}
        </ol>

        {/* Load more */}
        {canLoadMore && (
          <div className="flex justify-center py-4 print:hidden">
            <Button
              variant="outline"
              size="sm"
              onClick={() => query.fetchNextPage()}
              disabled={query.isFetchingNextPage}
            >
              {query.isFetchingNextPage ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" aria-hidden="true" />
                  Loading...
                </>
              ) : (
                "Load more"
              )}
            </Button>
          </div>
        )}

        {/* End marker */}
        {!canLoadMore && activities.length > 5 && (
          <div className="text-center py-4 text-sm text-muted-foreground print:hidden">
            Beginning of history
          </div>
        )}
      </div>
    </div>
  );
}
