/**
 * Shared ActivityTimeline Component
 *
 * @deprecated Use UnifiedActivityTimeline from '@/components/shared/activity' instead.
 * This component is being phased out in favor of the consolidated activity system.
 *
 * Migration:
 * ```tsx
 * // Before
 * import { ActivityTimeline } from '@/components/shared';
 * <ActivityTimeline activities={activities} />
 *
 * // After
 * import { UnifiedActivityTimeline } from '@/components/shared/activity';
 * <UnifiedActivityTimeline activities={unifiedActivities} />
 * ```
 *
 * Note: You'll need to transform your activities to the UnifiedActivity format.
 * See transformAuditActivity and transformPlannedActivity in '@/lib/schemas/unified-activity'.
 */
import * as React from 'react';
import {
  Phone,
  Mail,
  Calendar,
  MessageSquare,
  FileText,
  ShoppingCart,
  AlertCircle,
  ThumbsUp,
  Globe,
  Share2,
  ArrowDownLeft,
  ArrowUpRight,
  Clock,
  CheckCircle2,
  Circle,
  Filter,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
// Collapsible imports reserved for future grouped timeline feature
// import {
//   Collapsible,
//   CollapsibleContent,
//   CollapsibleTrigger,
// } from "@/components/ui/collapsible";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Base activity structure - minimum fields required
 */
export interface BaseActivity {
  id: string;
  description: string;
  createdAt: string | Date;
  entityType?: string;
}

/**
 * Extended activity with optional fields for richer display
 */
export interface Activity extends BaseActivity {
  activityType?: string;
  type?: string; // Alternative name for activityType
  direction?: string | null;
  subject?: string | null;
  outcome?: string | null;
  completedAt?: string | Date | null;
  scheduledAt?: string | Date | null;
  duration?: number | null;
}

/**
 * Props for the ActivityTimeline component
 */
export interface ActivityTimelineProps<T extends BaseActivity = Activity> {
  /** Pre-fetched activities to display */
  activities?: T[];
  /** Custom render function for activity items */
  renderItem?: (activity: T, index: number) => React.ReactNode;
  /** Whether to show as a card with header */
  asCard?: boolean;
  /** Card title (only used if asCard=true) */
  title?: string;
  /** Card description (only used if asCard=true) */
  cardDescription?: string;
  /** Show filter controls */
  showFilters?: boolean;
  /** Activity types available for filtering */
  filterTypes?: Array<{ value: string; label: string }>;
  /** Maximum number of items to display */
  maxItems?: number;
  /** Group items by entity type when available */
  groupByEntity?: boolean;
  /** Show completion toggle for activities */
  showCompletion?: boolean;
  /** Callback when an activity is marked complete */
  onComplete?: (activityId: string, outcome?: string) => void;
  /** Whether completion is in progress */
  isCompleting?: boolean;
  /** Custom empty state message */
  emptyMessage?: string;
  /** Custom empty state description */
  emptyDescription?: string;
  /** Additional class name */
  className?: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const ACTIVITY_TYPE_CONFIG: Record<
  string,
  { icon: typeof Phone; color: string; bgColor: string; label: string }
> = {
  call: {
    icon: Phone,
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
    label: 'Call',
  },
  email: {
    icon: Mail,
    color: 'text-green-600',
    bgColor: 'bg-green-100',
    label: 'Email',
  },
  meeting: {
    icon: Calendar,
    color: 'text-purple-600',
    bgColor: 'bg-purple-100',
    label: 'Meeting',
  },
  note: {
    icon: MessageSquare,
    color: 'text-gray-600',
    bgColor: 'bg-gray-100',
    label: 'Note',
  },
  quote: {
    icon: FileText,
    color: 'text-amber-600',
    bgColor: 'bg-amber-100',
    label: 'Quote',
  },
  order: {
    icon: ShoppingCart,
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-100',
    label: 'Order',
  },
  complaint: {
    icon: AlertCircle,
    color: 'text-red-600',
    bgColor: 'bg-red-100',
    label: 'Complaint',
  },
  feedback: {
    icon: ThumbsUp,
    color: 'text-teal-600',
    bgColor: 'bg-teal-100',
    label: 'Feedback',
  },
  website_visit: {
    icon: Globe,
    color: 'text-cyan-600',
    bgColor: 'bg-cyan-100',
    label: 'Website Visit',
  },
  social_interaction: {
    icon: Share2,
    color: 'text-pink-600',
    bgColor: 'bg-pink-100',
    label: 'Social',
  },
  follow_up: {
    icon: Clock,
    color: 'text-orange-600',
    bgColor: 'bg-orange-100',
    label: 'Follow-up',
  },
};

const DEFAULT_CONFIG = {
  icon: MessageSquare,
  color: 'text-gray-600',
  bgColor: 'bg-gray-100',
  label: 'Activity',
};

interface Filters {
  type: string;
  status: 'all' | 'completed' | 'pending';
  dateFrom: string;
  dateTo: string;
}

const DEFAULT_FILTERS: Filters = {
  type: 'all',
  status: 'all',
  dateFrom: '',
  dateTo: '',
};

function formatEntityLabel(entityType: string): string {
  return entityType.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

// ============================================================================
// HELPERS
// ============================================================================

function formatRelativeTime(date: string | Date): string {
  const now = new Date();
  const then = typeof date === 'string' ? new Date(date) : date;
  const diffMs = now.getTime() - then.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);
  const diffWeek = Math.floor(diffDay / 7);
  const diffMonth = Math.floor(diffDay / 30);

  if (diffSec < 60) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  if (diffWeek < 4) return `${diffWeek}w ago`;
  if (diffMonth < 12) return `${diffMonth}mo ago`;
  return then.toLocaleDateString('en-AU', { month: 'short', year: 'numeric' });
}

function formatDateTime(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleString('en-AU', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

function getActivityType(activity: Activity): string {
  return activity.activityType || activity.type || 'note';
}

function getConfig(activityType: string) {
  return ACTIVITY_TYPE_CONFIG[activityType] || DEFAULT_CONFIG;
}

// ============================================================================
// DEFAULT ACTIVITY ITEM
// ============================================================================

interface DefaultActivityItemProps {
  activity: Activity;
  showCompletion?: boolean;
  onComplete?: (activityId: string) => void;
  isCompleting?: boolean;
}

function DefaultActivityItem({
  activity,
  showCompletion,
  onComplete,
  isCompleting,
}: DefaultActivityItemProps) {
  const activityType = getActivityType(activity);
  const config = getConfig(activityType);
  const Icon = config.icon;
  const isComplete = !!activity.completedAt;
  const isOverdue =
    activity.scheduledAt && !isComplete && new Date(activity.scheduledAt) < new Date();

  return (
    <div
      className={cn(
        'relative flex gap-4 pb-6 last:pb-0',
        isOverdue && '-mx-2 rounded bg-red-50 px-2'
      )}
    >
      {/* Timeline line */}
      <div className="bg-border absolute top-10 bottom-0 left-5 w-px last:hidden" />

      {/* Icon or completion toggle */}
      <div className="relative z-10 flex flex-col items-center">
        {showCompletion ? (
          <button
            onClick={() => !isComplete && onComplete?.(activity.id)}
            disabled={isCompleting || isComplete}
            className={cn(
              'flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-transform',
              isComplete ? 'bg-green-100' : 'bg-muted cursor-pointer hover:scale-110'
            )}
            title={isComplete ? 'Completed' : 'Mark as complete'}
          >
            {isComplete ? (
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            ) : (
              <Circle className="text-muted-foreground h-5 w-5 hover:text-green-600" />
            )}
          </button>
        ) : (
          <div
            className={cn(
              'flex h-10 w-10 shrink-0 items-center justify-center rounded-full',
              config.bgColor
            )}
          >
            <Icon className={cn('h-5 w-5', config.color)} />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium">{config.label}</span>
          {activity.direction && (
            <span className="text-muted-foreground flex items-center gap-1 text-xs">
              {activity.direction === 'inbound' ? (
                <ArrowDownLeft className="h-3 w-3" />
              ) : activity.direction === 'outbound' ? (
                <ArrowUpRight className="h-3 w-3" />
              ) : null}
              {activity.direction}
            </span>
          )}
          {activity.duration && (
            <span className="text-muted-foreground flex items-center gap-1 text-xs">
              <Clock className="h-3 w-3" />
              {formatDuration(activity.duration)}
            </span>
          )}
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

        {activity.subject && (
          <p className="text-foreground mt-1 text-sm font-medium">{activity.subject}</p>
        )}

        <p className="text-muted-foreground mt-1 line-clamp-2 text-sm">{activity.description}</p>

        {activity.outcome && (
          <p className="text-muted-foreground mt-1 text-sm">
            <span className="font-medium">Outcome:</span> {activity.outcome}
          </p>
        )}

        <div className="text-muted-foreground mt-2 flex items-center gap-4 text-xs">
          <span title={formatDateTime(activity.createdAt)}>
            {formatRelativeTime(activity.createdAt)}
          </span>
          {activity.completedAt && (
            <span className="text-green-600">
              Completed {formatRelativeTime(activity.completedAt)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// FILTER CONTROLS
// ============================================================================

interface FilterControlsProps {
  filters: Filters;
  setFilters: React.Dispatch<React.SetStateAction<Filters>>;
  filterTypes?: Array<{ value: string; label: string }>;
  hasActiveFilters: boolean;
  clearFilters: () => void;
}

function FilterControls({
  filters,
  setFilters,
  filterTypes,
  hasActiveFilters,
  clearFilters,
}: FilterControlsProps) {
  const defaultTypes = [
    { value: 'call', label: 'Calls' },
    { value: 'email', label: 'Emails' },
    { value: 'meeting', label: 'Meetings' },
    { value: 'note', label: 'Notes' },
    { value: 'follow_up', label: 'Follow-ups' },
  ];

  const types = filterTypes || defaultTypes;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm">
          <Filter className="mr-2 h-4 w-4" />
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
              onValueChange={(value) => setFilters((f) => ({ ...f, type: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="All types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                {types.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Status</Label>
            <Select
              value={filters.status}
              onValueChange={(value) =>
                setFilters((f) => ({
                  ...f,
                  status: value as Filters['status'],
                }))
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
                onChange={(e) => setFilters((f) => ({ ...f, dateFrom: e.target.value }))}
                placeholder="From"
              />
              <Input
                type="date"
                value={filters.dateTo}
                onChange={(e) => setFilters((f) => ({ ...f, dateTo: e.target.value }))}
                placeholder="To"
              />
            </div>
          </div>

          {hasActiveFilters && (
            <Button variant="ghost" size="sm" className="w-full" onClick={clearFilters}>
              Clear Filters
            </Button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

// ============================================================================
// EMPTY STATE
// ============================================================================

interface EmptyStateProps {
  message?: string;
  description?: string;
  hasFilters?: boolean;
}

function EmptyState({ message, description, hasFilters }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="bg-muted mb-4 rounded-full p-3">
        <MessageSquare className="text-muted-foreground h-6 w-6" />
      </div>
      <h3 className="mb-1 font-medium">
        {message || (hasFilters ? 'No matching activities' : 'No activities yet')}
      </h3>
      <p className="text-muted-foreground text-sm">
        {description ||
          (hasFilters ? 'Try adjusting your filters' : 'Activities will appear here as they occur')}
      </p>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function ActivityTimeline<T extends BaseActivity = Activity>({
  activities = [],
  renderItem,
  asCard = false,
  title = 'Activity Timeline',
  cardDescription,
  showFilters = false,
  filterTypes,
  maxItems,
  groupByEntity = true,
  showCompletion = false,
  onComplete,
  isCompleting = false,
  emptyMessage,
  emptyDescription,
  className,
}: ActivityTimelineProps<T>) {
  const [filters, setFilters] = React.useState<Filters>(DEFAULT_FILTERS);

  // Apply filters
  const filteredActivities = React.useMemo(() => {
    let result = [...activities] as Activity[];

    if (filters.type !== 'all') {
      result = result.filter((a) => getActivityType(a) === filters.type);
    }

    if (filters.status === 'completed') {
      result = result.filter((a) => !!a.completedAt);
    } else if (filters.status === 'pending') {
      result = result.filter((a) => !a.completedAt);
    }

    if (filters.dateFrom) {
      const from = new Date(filters.dateFrom);
      result = result.filter((a) => new Date(a.createdAt) >= from);
    }

    if (filters.dateTo) {
      const to = new Date(filters.dateTo);
      to.setHours(23, 59, 59, 999);
      result = result.filter((a) => new Date(a.createdAt) <= to);
    }

    if (maxItems) {
      result = result.slice(0, maxItems);
    }

    return result as T[];
  }, [activities, filters, maxItems]);

  const entityGroups = React.useMemo(() => {
    if (!groupByEntity) return null;
    const hasEntity = filteredActivities.some(
      (activity) => typeof activity.entityType === 'string' && activity.entityType.length > 0
    );
    if (!hasEntity) return null;
    const groups: Array<{ key: string; label: string; activities: T[] }> = [];
    for (const activity of filteredActivities) {
      const key = activity.entityType;
      if (!key) continue;
      let group = groups.find((item) => item.key === key);
      if (!group) {
        group = { key, label: formatEntityLabel(key), activities: [] };
        groups.push(group);
      }
      group.activities.push(activity);
    }
    return groups;
  }, [filteredActivities, groupByEntity]);

  const hasActiveFilters =
    filters.type !== 'all' ||
    filters.status !== 'all' ||
    filters.dateFrom !== '' ||
    filters.dateTo !== '';

  const clearFilters = () => setFilters(DEFAULT_FILTERS);

  // Timeline content
  const timelineContent =
    filteredActivities.length === 0 ? (
      <EmptyState
        message={emptyMessage}
        description={emptyDescription}
        hasFilters={hasActiveFilters}
      />
    ) : entityGroups ? (
      <div className="space-y-4">
        {entityGroups.map((group) => (
          <div key={group.key} className="space-y-0">
            <div className="text-muted-foreground flex items-center gap-2 px-1 py-2 text-xs font-medium uppercase tracking-wide">
              <span>{group.label}</span>
              <span className="text-muted-foreground/70">· {group.activities.length}</span>
            </div>
            <div className="space-y-0">
              {group.activities.map((activity, index) =>
                renderItem ? (
                  <React.Fragment key={activity.id}>{renderItem(activity, index)}</React.Fragment>
                ) : (
                  <DefaultActivityItem
                    key={activity.id}
                    activity={activity as Activity}
                    showCompletion={showCompletion}
                    onComplete={onComplete}
                    isCompleting={isCompleting}
                  />
                )
              )}
            </div>
          </div>
        ))}
      </div>
    ) : (
      <div className="space-y-0">
        {filteredActivities.map((activity, index) =>
          renderItem ? (
            <React.Fragment key={activity.id}>{renderItem(activity, index)}</React.Fragment>
          ) : (
            <DefaultActivityItem
              key={activity.id}
              activity={activity as Activity}
              showCompletion={showCompletion}
              onComplete={onComplete}
              isCompleting={isCompleting}
            />
          )
        )}
      </div>
    );

  // Card wrapper or plain
  if (asCard) {
    return (
      <Card className={className}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{title}</CardTitle>
              {cardDescription && (
                <CardDescription>
                  {cardDescription}
                  {hasActiveFilters && ' (filtered)'}
                </CardDescription>
              )}
            </div>
            {showFilters && (
              <FilterControls
                filters={filters}
                setFilters={setFilters}
                filterTypes={filterTypes}
                hasActiveFilters={hasActiveFilters}
                clearFilters={clearFilters}
              />
            )}
          </div>
        </CardHeader>
        <CardContent>{timelineContent}</CardContent>
      </Card>
    );
  }

  return (
    <div className={className}>
      {showFilters && (
        <div className="mb-4 flex justify-end">
          <FilterControls
            filters={filters}
            setFilters={setFilters}
            filterTypes={filterTypes}
            hasActiveFilters={hasActiveFilters}
            clearFilters={clearFilters}
          />
        </div>
      )}
      {timelineContent}
    </div>
  );
}

export default ActivityTimeline;
