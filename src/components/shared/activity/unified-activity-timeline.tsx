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

export interface UnifiedActivityTimelineProps {
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
  /** Callback to mark an activity as complete. If provided, enables completion UI. */
  onComplete?: (activityId: string, outcome?: string) => void;
  /** Whether a completion is currently in progress */
  isCompletePending?: boolean;
  /** Show grouped by date with collapsible sections (for large timelines) */
  groupByDate?: boolean;
  /** Wrap in Card component (default true) */
  asCard?: boolean;
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

function formatEntityLabel(entityType: string): string {
  return entityType.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

// ============================================================================
// ACTIVITY ITEM COMPONENT
// ============================================================================

interface ActivityItemProps {
  activity: UnifiedActivity;
  onClick?: (activity: UnifiedActivity) => void;
  onComplete?: (activityId: string, outcome?: string) => void;
  isCompletePending?: boolean;
}

// Priority metadata keys to show in summary
const METADATA_PRIORITY_KEYS = [
  'productName', 'productNames', 'itemName', 'itemNames',
  'quantity', 'count', 'total', 'amount',
  'orderNumber', 'quoteNumber', 'invoiceNumber',
  'customerName', 'supplierName',
  'status', 'oldStatus', 'newStatus',
  'reason', 'assignedTo', 'installerName',
];

// Keys to hide from display
const METADATA_HIDDEN_KEYS = new Set([
  'requestId', 'activityKey', 'customerId', 'orderId', 'productId',
  'opportunityId', 'supplierId', 'organizationId',
]);

function formatMetadataLabel(key: string): string {
  return key
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatMetadataValue(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return value.toLocaleString();
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (Array.isArray(value)) {
    if (value.length === 0) return null;
    if (value.every((v) => typeof v === 'string' || typeof v === 'number')) {
      return value.join(', ');
    }
    return `${value.length} items`;
  }
  return null;
}

function getMetadataSummary(metadata: unknown): Array<{ label: string; value: string }> {
  if (!metadata || typeof metadata !== 'object') return [];
  const meta = metadata as Record<string, unknown>;

  const entries: Array<{ key: string; label: string; value: string }> = [];

  // First pass: priority keys
  for (const key of METADATA_PRIORITY_KEYS) {
    if (key in meta && !METADATA_HIDDEN_KEYS.has(key)) {
      const value = formatMetadataValue(meta[key]);
      if (value) {
        entries.push({ key, label: formatMetadataLabel(key), value });
      }
    }
  }

  // Second pass: other keys (up to 4 total)
  if (entries.length < 4) {
    for (const [key, val] of Object.entries(meta)) {
      if (entries.length >= 4) break;
      if (METADATA_HIDDEN_KEYS.has(key)) continue;
      if (entries.some((e) => e.key === key)) continue;

      const value = formatMetadataValue(val);
      if (value) {
        entries.push({ key, label: formatMetadataLabel(key), value });
      }
    }
  }

  return entries.slice(0, 4).map(({ label, value }) => ({ label, value }));
}

function ActivityItem({ activity, onClick, onComplete, isCompletePending }: ActivityItemProps) {
  const config = getActivityTypeConfig(activity.type);
  const Icon = iconMap[config.icon] || Activity;

  const isPlanned = activity.source === 'planned';
  const showCompletionToggle = isPlanned && !activity.isCompleted && onComplete;

  const metadataSummary = React.useMemo(
    () => getMetadataSummary(activity.metadata),
    [activity.metadata]
  );

  const handleComplete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onComplete?.(activity.id);
  };

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
            onClick={handleComplete}
            disabled={isCompletePending}
            className={cn(
              'flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-all',
              'bg-muted hover:bg-green-100 hover:scale-105',
              isCompletePending && 'opacity-50 cursor-not-allowed'
            )}
            title="Mark as complete"
          >
            <Circle className="h-5 w-5 text-muted-foreground hover:text-green-600" />
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

        {/* Metadata summary - shows rich context like product names, quantities */}
        {metadataSummary.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 mt-2">
            {metadataSummary.map((item) => (
              <Badge
                key={item.label}
                variant="secondary"
                className="text-[10px] font-normal h-5 bg-muted/60"
              >
                <span className="text-muted-foreground">{item.label}:</span>
                <span className="ml-1 font-medium">{item.value}</span>
              </Badge>
            ))}
          </div>
        )}

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
  onComplete,
  isCompletePending = false,
  groupByDate = false,
  asCard = true,
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

  const entityGroups = React.useMemo(() => {
    const hasMultipleEntities = new Set(filteredActivities.map((activity) => activity.entityType))
      .size;
    if (hasMultipleEntities <= 1) return null;
    const groups: Array<{ key: string; label: string; activities: UnifiedActivity[] }> = [];
    for (const activity of filteredActivities) {
      let group = groups.find((item) => item.key === activity.entityType);
      if (!group) {
        group = { key: activity.entityType, label: formatEntityLabel(activity.entityType), activities: [] };
        groups.push(group);
      }
      group.activities.push(activity);
    }
    return groups;
  }, [filteredActivities]);

  const hasActiveFilters =
    filters.source !== 'all' ||
    filters.type !== 'all' ||
    !!filters.dateFrom ||
    !!filters.dateTo;

  // Loading state
  if (isLoading) {
    if (!asCard) {
      return (
        <div className={className}>
          <div className="mb-4">
            <h3 className="text-lg font-semibold">{title}</h3>
            {description && <p className="text-sm text-muted-foreground">{description}</p>}
          </div>
          <TimelineSkeleton />
        </div>
      );
    }
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
    if (!asCard) {
      return (
        <div className={className}>
          <div className="mb-4">
            <h3 className="text-lg font-semibold">{title}</h3>
            {description && <p className="text-sm text-muted-foreground">{description}</p>}
          </div>
          <ErrorState error={error} />
        </div>
      );
    }
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

  // Group by date if requested
  const dateGroups = React.useMemo(() => {
    if (!groupByDate) return null;

    const groups: Record<string, UnifiedActivity[]> = {};
    for (const activity of filteredActivities) {
      const date = new Date(activity.createdAt).toISOString().split('T')[0];
      if (!groups[date]) groups[date] = [];
      groups[date].push(activity);
    }
    return groups;
  }, [filteredActivities, groupByDate]);

  const formatGroupDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return date.toLocaleDateString('en-AU', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined,
    });
  };

  // Render activity item with all props
  const renderActivityItem = (activity: UnifiedActivity) => (
    <ActivityItem
      key={activity.id}
      activity={activity}
      onClick={onActivityClick}
      onComplete={onComplete}
      isCompletePending={isCompletePending}
    />
  );

  // Content
  const content =
    filteredActivities.length === 0 ? (
      <EmptyState
        message={emptyMessage}
        description={emptyDescription}
        hasFilters={hasActiveFilters}
      />
    ) : dateGroups ? (
      // Date-grouped view
      <div className="space-y-4">
        {Object.keys(dateGroups)
          .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())
          .map((date) => (
            <div key={date} className="space-y-0">
              <div className="text-muted-foreground flex items-center gap-2 px-1 py-2 text-xs font-medium uppercase tracking-wide">
                <span>{formatGroupDate(date)}</span>
                <Badge variant="secondary" className="text-xs">
                  {dateGroups[date].length}
                </Badge>
              </div>
              <div className="ml-2 border-l-2 border-muted pl-4">
                {dateGroups[date].map(renderActivityItem)}
              </div>
            </div>
          ))}
      </div>
    ) : entityGroups ? (
      // Entity-grouped view
      <div className="space-y-4">
        {entityGroups.map((group) => (
          <div key={group.key} className="space-y-0">
            <div className="text-muted-foreground flex items-center gap-2 px-1 py-2 text-xs font-medium uppercase tracking-wide">
              <span>{group.label}</span>
              <span className="text-muted-foreground/70">- {group.activities.length}</span>
            </div>
            <div className="space-y-0">
              {group.activities.map(renderActivityItem)}
            </div>
          </div>
        ))}
      </div>
    ) : (
      // Flat list
      <div className="space-y-0">
        {filteredActivities.map(renderActivityItem)}
      </div>
    );

  // Header content
  const headerContent = (
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
  );

  // Non-card variant
  if (!asCard) {
    return (
      <div className={className}>
        <div className="mb-4">{headerContent}</div>
        {content}
      </div>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>{headerContent}</CardHeader>
      <CardContent>{content}</CardContent>
    </Card>
  );
}

export default UnifiedActivityTimeline;
