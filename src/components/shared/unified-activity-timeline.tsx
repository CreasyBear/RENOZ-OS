/**
 * Unified Activity Timeline Component
 *
 * Displays a combined timeline of audit trail activities and planned activities.
 * Used in customer 360, opportunity detail, and other entity pages.
 */

import * as React from 'react';
import {
  Plus,
  Pencil,
  Trash,
  Eye,
  Download,
  UserPlus,
  Mail,
  MailOpen,
  MousePointer,
  Phone,
  FileText,
  MessageSquare,
  Calendar,
  ShoppingCart,
  AlertCircle,
  ThumbsUp,
  Globe,
  Share2,
  Clock,
  CheckCircle2,
  Circle,
  Activity,
  ArrowDownLeft,
  ArrowUpRight,
  Filter,
  AlertTriangle,
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
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import type { UnifiedActivity } from '@/lib/schemas/unified-activity';
import { getActivityTypeConfig } from '@/lib/schemas/unified-activity';

// ============================================================================
// ICON MAP
// ============================================================================

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Plus,
  Pencil,
  Trash,
  Eye,
  Download,
  UserPlus,
  Mail,
  MailOpen,
  MousePointer,
  Phone,
  FileText,
  MessageSquare,
  Calendar,
  ShoppingCart,
  AlertCircle,
  ThumbsUp,
  Globe,
  Share2,
  Clock,
  Activity,
};

// ============================================================================
// TYPES
// ============================================================================

interface UnifiedActivityTimelineProps {
  activities: UnifiedActivity[];
  isLoading?: boolean;
  hasError?: boolean;
  error?: Error | null;
  emptyMessage?: string;
  emptyDescription?: string;
  title?: string;
  description?: string;
  showFilters?: boolean;
  maxItems?: number;
  onActivityClick?: (activity: UnifiedActivity) => void;
  className?: string;
}

interface Filters {
  type: string;
  source: 'all' | 'audit' | 'planned';
  dateFrom: string;
  dateTo: string;
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

// ============================================================================
// ACTIVITY ITEM COMPONENT
// ============================================================================

interface ActivityItemProps {
  activity: UnifiedActivity;
  onClick?: (activity: UnifiedActivity) => void;
}

function ActivityItem({ activity, onClick }: ActivityItemProps) {
  const config = getActivityTypeConfig(activity.type);
  const Icon = iconMap[config.icon] || Activity;

  const isPlanned = activity.source === 'planned';
  const showCompletionToggle = isPlanned && !activity.isCompleted;

  return (
    <div
      className={cn(
        'relative flex gap-4 pb-6 last:pb-0',
        onClick && 'cursor-pointer hover:bg-muted/50 -mx-4 px-4 rounded-lg transition-colors',
        activity.isOverdue && 'bg-red-50/50 -mx-4 px-4 rounded-lg'
      )}
      onClick={() => onClick?.(activity)}
    >
      {/* Timeline line */}
      <div className="absolute left-5 top-10 bottom-0 w-px bg-border last:hidden" />

      {/* Icon or completion toggle */}
      <div className="relative z-10 flex flex-col items-center">
        {showCompletionToggle ? (
          <button
            className={cn(
              'flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-colors',
              'bg-muted hover:bg-muted-foreground/20'
            )}
            title="Mark as complete"
          >
            <Circle className="h-5 w-5 text-muted-foreground" />
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
      <div className="flex-1 min-w-0">
        {/* Header */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium">{config.label}</span>

          {/* Source badge */}
          <Badge
            variant="outline"
            className={cn(
              'text-xs font-normal',
              activity.source === 'audit'
                ? 'border-blue-200 bg-blue-50 text-blue-700'
                : 'border-amber-200 bg-amber-50 text-amber-700'
            )}
          >
            {activity.source === 'audit' ? 'System' : 'Planned'}
          </Badge>

          {/* Direction indicator */}
          {activity.direction && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              {activity.direction === 'inbound' ? (
                <ArrowDownLeft className="h-3 w-3" />
              ) : activity.direction === 'outbound' ? (
                <ArrowUpRight className="h-3 w-3" />
              ) : null}
              {activity.direction}
            </span>
          )}

          {/* Duration */}
          {activity.duration && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              {formatDuration(activity.duration)}
            </span>
          )}

          {/* Status badges */}
          {activity.isCompleted && (
            <Badge variant="secondary" className="text-xs bg-green-100 text-green-700">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Done
            </Badge>
          )}
          {activity.isOverdue && (
            <Badge variant="destructive" className="text-xs">
              <AlertTriangle className="h-3 w-3 mr-1" />
              Overdue
            </Badge>
          )}
        </div>

        {/* Subject */}
        {activity.subject && (
          <p className="text-sm font-medium text-foreground mt-1">{activity.subject}</p>
        )}

        {/* Description */}
        <p className="text-sm text-muted-foreground mt-1">{activity.description}</p>

        {/* Outcome */}
        {activity.outcome && (
          <p className="text-sm text-muted-foreground mt-1">
            <span className="font-medium">Outcome:</span> {activity.outcome}
          </p>
        )}

        {/* Changes (for audit activities) */}
        {activity.changes?.fields && activity.changes.fields.length > 0 && (
          <div className="mt-2 text-xs text-muted-foreground bg-muted p-2 rounded">
            <span className="font-medium">Changed:</span>{' '}
            {activity.changes.fields.join(', ')}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
          <span title={formatDateTime(activity.createdAt)}>
            {formatRelativeTime(activity.createdAt)}
          </span>

          {activity.userName && (
            <span className="flex items-center gap-1">
              <span className="font-medium">by</span> {activity.userName}
            </span>
          )}

          {activity.scheduledAt && !activity.isCompleted && (
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              Scheduled {formatRelativeTime(activity.scheduledAt)}
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
  onFiltersChange: (filters: Filters) => void;
  hasActiveFilters: boolean;
}

function FilterControls({ filters, onFiltersChange, hasActiveFilters }: FilterControlsProps) {
  const clearFilters = () =>
    onFiltersChange({
      type: 'all',
      source: 'all',
      dateFrom: '',
      dateTo: '',
    });

  const activityTypes = [
    { value: 'created', label: 'Created' },
    { value: 'updated', label: 'Updated' },
    { value: 'deleted', label: 'Deleted' },
    { value: 'email_sent', label: 'Email Sent' },
    { value: 'email_opened', label: 'Email Opened' },
    { value: 'call_logged', label: 'Call' },
    { value: 'note_added', label: 'Note' },
    { value: 'call', label: 'Planned Call' },
    { value: 'meeting', label: 'Meeting' },
  ];

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
          {/* Source filter */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Source</label>
            <Select
              value={filters.source}
              onValueChange={(value) =>
                onFiltersChange({ ...filters, source: value as Filters['source'] })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="All sources" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All sources</SelectItem>
                <SelectItem value="audit">System (Audit)</SelectItem>
                <SelectItem value="planned">Planned Activities</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Type filter */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Activity Type</label>
            <Select
              value={filters.type}
              onValueChange={(value) => onFiltersChange({ ...filters, type: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="All types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                {activityTypes.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Clear filters */}
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
// SKELETON LOADING
// ============================================================================

function TimelineSkeleton() {
  return (
    <div className="space-y-6">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="flex gap-4">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-3 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      ))}
    </div>
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
      <div className="rounded-full bg-muted p-3 mb-4">
        <Activity className="h-6 w-6 text-muted-foreground" />
      </div>
      <h3 className="font-medium mb-1">
        {message || (hasFilters ? 'No matching activities' : 'No activities yet')}
      </h3>
      <p className="text-sm text-muted-foreground">
        {description ||
          (hasFilters ? 'Try adjusting your filters' : 'Activities will appear here as they occur')}
      </p>
    </div>
  );
}

// ============================================================================
// ERROR STATE
// ============================================================================

function ErrorState({ error }: { error: Error }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="rounded-full bg-red-100 p-3 mb-4">
        <AlertCircle className="h-6 w-6 text-red-600" />
      </div>
      <h3 className="font-medium mb-1">Failed to load activities</h3>
      <p className="text-sm text-muted-foreground">{error.message}</p>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function UnifiedActivityTimeline({
  activities,
  isLoading = false,
  hasError = false,
  error = null,
  emptyMessage,
  emptyDescription,
  title = 'Activity Timeline',
  description,
  showFilters = true,
  maxItems,
  onActivityClick,
  className,
}: UnifiedActivityTimelineProps) {
  const [filters, setFilters] = React.useState<Filters>({
    type: 'all',
    source: 'all',
    dateFrom: '',
    dateTo: '',
  });

  // Apply filters
  const filteredActivities = React.useMemo(() => {
    let result = [...activities];

    if (filters.source !== 'all') {
      result = result.filter((a) => a.source === filters.source);
    }

    if (filters.type !== 'all') {
      result = result.filter((a) => a.type === filters.type);
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

    return result;
  }, [activities, filters, maxItems]);

  const hasActiveFilters =
    filters.source !== 'all' ||
    filters.type !== 'all' ||
    !!filters.dateFrom ||
    !!filters.dateTo;

  // Loading state
  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
        <CardContent>
          <TimelineSkeleton />
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (hasError && error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
        <CardContent>
          <ErrorState error={error} />
        </CardContent>
      </Card>
    );
  }

  // Content
  const content =
    filteredActivities.length === 0 ? (
      <EmptyState
        message={emptyMessage}
        description={emptyDescription}
        hasFilters={hasActiveFilters}
      />
    ) : (
      <div className="space-y-0">
        {filteredActivities.map((activity) => (
          <ActivityItem key={activity.id} activity={activity} onClick={onActivityClick} />
        ))}
      </div>
    );

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{title}</CardTitle>
            {description && (
              <CardDescription>
                {description}
                {hasActiveFilters && ' (filtered)'}
              </CardDescription>
            )}
          </div>
          {showFilters && (
            <FilterControls
              filters={filters}
              onFiltersChange={setFilters}
              hasActiveFilters={hasActiveFilters}
            />
          )}
        </div>
      </CardHeader>
      <CardContent>{content}</CardContent>
    </Card>
  );
}

export default UnifiedActivityTimeline;
