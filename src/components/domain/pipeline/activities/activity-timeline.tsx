/**
 * ActivityTimeline Component
 *
 * @deprecated Use OpportunityActivityTimelineContainer from
 * '@/components/domain/pipeline/opportunities' instead.
 * This component violates the container/presenter pattern by having
 * query logic inside the component.
 *
 * Migration:
 * ```tsx
 * // Before
 * import { ActivityTimeline } from '@/components/domain/pipeline/activities';
 * <ActivityTimeline opportunityId={id} />
 *
 * // After
 * import { OpportunityActivityTimelineContainer } from '@/components/domain/pipeline/opportunities';
 * <OpportunityActivityTimelineContainer opportunityId={id} />
 * ```
 *
 * @see _Initiation/_prd/2-domains/pipeline/pipeline.prd.json (PIPE-ACTIVITIES-UI)
 */

import { memo, useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import {
  Phone,
  Mail,
  Calendar,
  MessageSquare,
  Clock,
  CheckCircle2,
  Circle,
  Filter,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { toastSuccess, toastError } from "@/hooks";
import {
  getActivityTimeline,
  completeActivity,
} from "@/server/functions/pipeline/pipeline";
import type { OpportunityActivityType } from "@/lib/schemas/pipeline";

// ============================================================================
// TYPES
// ============================================================================

export interface ActivityTimelineProps {
  opportunityId: string;
  className?: string;
  maxItems?: number;
  showFilters?: boolean;
}

interface Activity {
  id: string;
  type: OpportunityActivityType;
  description: string;
  outcome: string | null;
  scheduledAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
}

interface TimelineResponse {
  activities: Activity[];
  byDate: Record<string, Activity[]>;
  totalCount: number;
}

interface Filters extends Record<string, unknown> {
  type: OpportunityActivityType | "all";
  status: "all" | "completed" | "pending";
  dateFrom: string;
  dateTo: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const ACTIVITY_TYPE_CONFIG: Record<
  OpportunityActivityType,
  { label: string; icon: typeof Phone; color: string }
> = {
  call: { label: "Call", icon: Phone, color: "text-blue-600" },
  email: { label: "Email", icon: Mail, color: "text-purple-600" },
  meeting: { label: "Meeting", icon: Calendar, color: "text-green-600" },
  note: { label: "Note", icon: MessageSquare, color: "text-gray-600" },
  follow_up: { label: "Follow-up", icon: Clock, color: "text-orange-600" },
};

const DEFAULT_FILTERS: Filters = {
  type: "all",
  status: "all",
  dateFrom: "",
  dateTo: "",
};

// ============================================================================
// COMPONENT
// ============================================================================

export const ActivityTimeline = memo(function ActivityTimeline({
  opportunityId,
  className,
  maxItems,
  showFilters = true,
}: ActivityTimelineProps) {
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  // Deprecation warning
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.warn(
        '[DEPRECATED] ActivityTimeline from @/components/domain/pipeline/activities is deprecated. ' +
        'Use OpportunityActivityTimelineContainer from @/components/domain/pipeline/opportunities instead. ' +
        'This component violates the container/presenter pattern by having query logic inside.'
      );
    }
  }, []);

  // Fetch activities
  const { data, isLoading, error } = useQuery<TimelineResponse>({
    queryKey: queryKeys.pipeline.activityTimeline(opportunityId, filters),
    queryFn: async () => {
      const result = await getActivityTimeline({
        data: {
          opportunityId,
          days: 90, // Get last 90 days of activities
        },
      });
      return result as TimelineResponse;
    },
  });

  // Client-side filtering (API returns all, we filter here)
  const filteredByDate = data?.byDate
    ? Object.entries(data.byDate).reduce((acc, [date, activities]) => {
        const filtered = activities.filter((activity) => {
          // Type filter
          if (filters.type !== "all" && activity.type !== filters.type) return false;
          // Status filter
          if (filters.status === "completed" && !activity.completedAt) return false;
          if (filters.status === "pending" && activity.completedAt) return false;
          // Date range filters
          if (filters.dateFrom && new Date(date) < new Date(filters.dateFrom)) return false;
          if (filters.dateTo && new Date(date) > new Date(filters.dateTo)) return false;
          return true;
        });
        if (filtered.length > 0) {
          acc[date] = filtered;
        }
        return acc;
      }, {} as Record<string, Activity[]>)
    : {};

  // Complete activity mutation
  const completeMutation = useMutation({
    mutationFn: async ({ activityId, outcome }: { activityId: string; outcome?: string }) => {
      return completeActivity({
        data: { id: activityId, outcome },
      });
    },
    onSuccess: () => {
      toastSuccess("Activity marked as complete.");
      queryClient.invalidateQueries({ queryKey: queryKeys.pipeline.activityTimeline(opportunityId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.opportunities.detail(opportunityId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.activities.all });
    },
    onError: () => {
      toastError("Failed to complete activity. Please try again.");
    },
  });

  // Toggle group expansion
  const toggleGroup = (date: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(date)) {
        next.delete(date);
      } else {
        next.add(date);
      }
      return next;
    });
  };

  // Format date for display
  const formatGroupDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return "Today";
    }
    if (date.toDateString() === yesterday.toDateString()) {
      return "Yesterday";
    }
    return date.toLocaleDateString("en-AU", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: date.getFullYear() !== today.getFullYear() ? "numeric" : undefined,
    });
  };

  // Format time for display
  const formatTime = (date: Date | string) => {
    const d = typeof date === "string" ? new Date(date) : date;
    return d.toLocaleTimeString("en-AU", {
      hour: "numeric",
      minute: "2-digit",
    });
  };

  // Check if filters are active
  const hasActiveFilters =
    filters.type !== "all" ||
    filters.status !== "all" ||
    filters.dateFrom !== "" ||
    filters.dateTo !== "";

  // Clear all filters
  const clearFilters = () => setFilters(DEFAULT_FILTERS);

  // Get flattened activities for maxItems limit
  const getAllActivities = () => {
    const all: Activity[] = [];
    const sortedDates = Object.keys(filteredByDate).sort((a, b) =>
      new Date(b).getTime() - new Date(a).getTime()
    );
    for (const date of sortedDates) {
      for (const activity of filteredByDate[date]) {
        all.push(activity);
      }
    }
    return maxItems ? all.slice(0, maxItems) : all;
  };

  // Render activity item
  const renderActivity = (activity: Activity) => {
    const config = ACTIVITY_TYPE_CONFIG[activity.type];
    const Icon = config.icon;
    const isComplete = !!activity.completedAt;
    const isOverdue = activity.scheduledAt && !isComplete && new Date(activity.scheduledAt) < new Date();

    return (
      <div
        key={activity.id}
        className={cn(
          "flex gap-3 py-3 border-b last:border-b-0",
          isOverdue && "bg-red-50"
        )}
      >
        {/* Status indicator */}
        <div className="flex-shrink-0 mt-1">
          {isComplete ? (
            <CheckCircle2 className="h-5 w-5 text-green-600" />
          ) : (
            <button
              onClick={() => completeMutation.mutate({ activityId: activity.id })}
              disabled={completeMutation.isPending}
              className="hover:scale-110 transition-transform"
              title="Mark as complete"
            >
              <Circle className="h-5 w-5 text-muted-foreground hover:text-green-600" />
            </button>
          )}
        </div>

        {/* Activity content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Icon className={cn("h-4 w-4", config.color)} />
            <Badge variant="outline" className="text-xs">
              {config.label}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {formatTime(activity.createdAt)}
            </span>
            {isOverdue && (
              <Badge variant="destructive" className="text-xs">
                Overdue
              </Badge>
            )}
            {activity.scheduledAt && !isComplete && !isOverdue && (
              <Badge variant="secondary" className="text-xs">
                Scheduled
              </Badge>
            )}
          </div>

          <p className="text-sm">{activity.description}</p>

          {activity.outcome && (
            <p className="text-sm text-muted-foreground mt-1">
              <span className="font-medium">Outcome:</span> {activity.outcome}
            </p>
          )}

          {activity.scheduledAt && (
            <p className="text-xs text-muted-foreground mt-1">
              Scheduled: {(typeof activity.scheduledAt === "string" ? new Date(activity.scheduledAt) : activity.scheduledAt).toLocaleString("en-AU")}
            </p>
          )}
        </div>
      </div>
    );
  };

  // Loading state
  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Activity Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-4 bg-muted rounded w-1/4 mb-2" />
                <div className="h-20 bg-muted rounded" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Activity Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Failed to load activities. Please try again.
          </p>
        </CardContent>
      </Card>
    );
  }

  const activities = getAllActivities();

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Activity Timeline</CardTitle>
            <CardDescription>
              {activities.length} {activities.length === 1 ? "activity" : "activities"}
              {hasActiveFilters && " (filtered)"}
            </CardDescription>
          </div>

          {showFilters && (
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm">
                  <Filter className="h-4 w-4 mr-2" />
                  Filters
                  {hasActiveFilters && (
                    <Badge variant="secondary" className="ml-2">
                      Active
                    </Badge>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80" align="end">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Activity Type</Label>
                    <Select
                      value={filters.type}
                      onValueChange={(value) =>
                        setFilters((f) => ({ ...f, type: value as Filters["type"] }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="All types" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All types</SelectItem>
                        <SelectItem value="call">Calls</SelectItem>
                        <SelectItem value="email">Emails</SelectItem>
                        <SelectItem value="meeting">Meetings</SelectItem>
                        <SelectItem value="note">Notes</SelectItem>
                        <SelectItem value="follow_up">Follow-ups</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select
                      value={filters.status}
                      onValueChange={(value) =>
                        setFilters((f) => ({ ...f, status: value as Filters["status"] }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="All statuses" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All statuses</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Date Range</Label>
                    <div className="flex gap-2">
                      <Input
                        type="date"
                        value={filters.dateFrom}
                        onChange={(e) =>
                          setFilters((f) => ({ ...f, dateFrom: e.target.value }))
                        }
                        placeholder="From"
                      />
                      <Input
                        type="date"
                        value={filters.dateTo}
                        onChange={(e) =>
                          setFilters((f) => ({ ...f, dateTo: e.target.value }))
                        }
                        placeholder="To"
                      />
                    </div>
                  </div>

                  {hasActiveFilters && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full"
                      onClick={clearFilters}
                    >
                      Clear Filters
                    </Button>
                  )}
                </div>
              </PopoverContent>
            </Popover>
          )}
        </div>
      </CardHeader>

      <CardContent>
        {activities.length === 0 ? (
          <div className="text-center py-8">
            <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-sm text-muted-foreground">
              {hasActiveFilters
                ? "No activities match your filters."
                : "No activities yet. Log your first activity!"}
            </p>
          </div>
        ) : maxItems ? (
          // Flat list when maxItems is set
          <div className="space-y-0">
            {activities.map((activity) => renderActivity(activity))}
          </div>
        ) : (
          // Grouped timeline
          <div className="space-y-4">
            {Object.keys(filteredByDate)
              .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())
              .map((date) => (
                <Collapsible
                  key={date}
                  open={!expandedGroups.has(date)}
                  onOpenChange={() => toggleGroup(date)}
                >
                  <CollapsibleTrigger asChild>
                    <button className="flex items-center justify-between w-full py-2 text-left hover:bg-muted/50 rounded px-2 -mx-2">
                      <span className="font-medium text-sm">
                        {formatGroupDate(date)}
                      </span>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">
                          {filteredByDate[date].length}
                        </Badge>
                        <ChevronDown
                          className={cn(
                            "h-4 w-4 transition-transform",
                            expandedGroups.has(date) && "rotate-180"
                          )}
                        />
                      </div>
                    </button>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="ml-2 border-l-2 border-muted pl-4 mt-2">
                      {filteredByDate[date].map(renderActivity)}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
});

export default ActivityTimeline;
