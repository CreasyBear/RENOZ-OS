/**
 * Unified Activity Timeline Component
 *
 * Displays a combined timeline of audit trail activities and planned activities.
 * Used in customer 360, opportunity detail, and other entity pages.
 */

import * as React from 'react';
import { Link } from '@tanstack/react-router';
import { useVirtualizer } from '@tanstack/react-virtual';
import { format, isToday, isYesterday, isThisWeek, isThisYear } from 'date-fns';
import { formatDate } from '@/lib/formatters';
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
  Inbox,
  ChevronDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { buttonVariants } from '@/components/ui/button';
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
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import type { UnifiedActivity } from '@/lib/schemas/unified-activity';
import { getActivityTypeConfig } from '@/lib/schemas/unified-activity';
import { ENTITY_ICONS, ENTITY_LABELS } from './activity-config';
import type { ActivityEntityType } from '@/lib/schemas/activities';
import { isActivityEntityType } from '@/lib/schemas/activities';
import { presentActivity, type PresentedActivity } from '@/lib/activities/present-activity';

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

/**
 * Props for UnifiedActivityTimeline component
 *
 * @see ACTIVITY-TIMELINE-STANDARDS.md for design system patterns
 */
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
  /** Search params for Link to /activities (typed navigation) */
  viewAllSearch?: { entityType?: ActivityEntityType };
  /** Label for the view-all link (defaults to "View in Activity Feed") */
  viewAllLabel?: string;
  /** Wrap in Card component (default true) */
  asCard?: boolean;
  /**
   * Use compact item display (for sidebars, widgets, mobile)
   *
   * Compact mode reduces padding, hides metadata, and uses smaller avatars.
   * Ideal for constrained spaces like sidebars or mobile views.
   *
   * @example
   * ```tsx
   * <UnifiedActivityTimeline
   *   activities={activities}
   *   compact
   *   height={400}
   * />
   * ```
   */
  compact?: boolean;
  /**
   * Minimum items before enabling virtualization (default: 50)
   *
   * Virtualization improves performance for large lists by only rendering
   * visible items. Only activates when both `height` and threshold are met.
   *
   * @default 50
   */
  virtualizationThreshold?: number;
  /**
   * Height of the timeline container (required for virtualization)
   *
   * **When to use virtualization:**
   * - Fixed-height containers (sidebars, modals, constrained areas)
   * - Expected large activity lists (>50 items)
   * - Performance issues with rendering many items
   *
   * **When NOT to use virtualization:**
   * - Natural document flow (tabs, cards, unconstrained height)
   * - Small activity lists (<50 items)
   * - Height is unconstrained (component expands naturally)
   *
   * @example
   * ```tsx
   * // ✅ Fixed-height sidebar - use virtualization
   * <UnifiedActivityTimeline
   *   activities={activities}
   *   height={600}
   *   virtualizationThreshold={50}
   * />
   *
   * // ✅ Tab content with natural flow - no virtualization needed
   * <UnifiedActivityTimeline
   *   activities={activities}
   *   // height not provided - virtualization disabled
   * />
   * ```
   */
  height?: number | string;
  className?: string;
}

interface Filters {
  type: string;
  source: 'all' | 'audit' | 'planned';
  dateFrom: string;
  dateTo: string;
}

interface TimelineActivityEntry {
  activity: UnifiedActivity;
  presented: PresentedActivity;
}

// ============================================================================
// HELPERS
// ============================================================================

// Type guard imported from schema - no local definition needed

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
  presented: PresentedActivity;
  onClick?: (activity: UnifiedActivity) => void;
  onComplete?: (activityId: string, outcome?: string) => void;
  isCompletePending?: boolean;
  compact?: boolean;
}
const ActivityItem = React.memo(function ActivityItem({
  activity,
  presented,
  onClick,
  onComplete,
  isCompletePending,
  compact = false,
}: ActivityItemProps) {
  const config = getActivityTypeConfig(activity.type);
  const Icon = iconMap[presented.iconKey] || iconMap[config.icon] || Activity;

  const isPlanned = activity.source === 'planned';
  const showCompletionToggle = isPlanned && !activity.isCompleted && onComplete;
  const metaFacts = compact ? presented.factChips.slice(0, 2) : presented.factChips;
  const hasDetails = presented.detailSections.length > 0;

  const handleComplete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onComplete?.(activity.id);
  };

  return (
    <div
      className={cn(
        'relative flex gap-4 pb-6 last:pb-0',
        compact && 'pb-3 gap-3',
        onClick && 'cursor-pointer hover:bg-muted/50 -mx-4 px-4 rounded-lg transition-colors',
        activity.isOverdue && 'bg-red-50/40 -mx-4 px-4 rounded-lg'
      )}
      onClick={() => onClick?.(activity)}
    >
      {/* Timeline line */}
      <div className={cn('absolute left-5 bottom-0 w-px bg-border last:hidden', compact ? 'top-8' : 'top-10')} />

      {/* Icon or completion toggle */}
      <div className="relative z-10 flex flex-col items-center">
        {showCompletionToggle ? (
          <button
            onClick={handleComplete}
            disabled={isCompletePending}
            className={cn(
              'flex shrink-0 items-center justify-center rounded-full transition-all',
              compact ? 'h-8 w-8' : 'h-10 w-10',
              'bg-muted hover:bg-green-100 hover:scale-105',
              isCompletePending && 'opacity-50 cursor-not-allowed'
            )}
            title="Mark as complete"
          >
            <Circle className={cn('text-muted-foreground hover:text-green-600', compact ? 'h-4 w-4' : 'h-5 w-5')} />
          </button>
        ) : (
          <div
            className={cn(
              'flex shrink-0 items-center justify-center rounded-full',
              compact ? 'h-8 w-8' : 'h-10 w-10',
              config.bgColor
            )}
          >
            <Icon className={cn(config.color, compact ? 'h-4 w-4' : 'h-5 w-5')} />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-muted px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-foreground/75">
            {presented.kindLabel}
          </span>
          {presented.sourceLabel ? (
            <span className="text-[11px] font-medium text-muted-foreground">
              {presented.sourceLabel}
            </span>
          ) : null}
          {presented.status === 'done' ? (
            <Badge variant="secondary" className="border-transparent bg-green-100 text-[11px] text-green-700">
              <CheckCircle2 className="mr-1 h-3 w-3" />
              Done
            </Badge>
          ) : null}
          {presented.status === 'overdue' ? (
            <Badge variant="destructive" className="text-[11px]">
              <AlertTriangle className="mr-1 h-3 w-3" />
              Overdue
            </Badge>
          ) : null}
        </div>

        <div className="mt-2 space-y-1">
          <p className="text-sm font-semibold leading-5 text-foreground">
            {presented.title}
          </p>
          {presented.summary ? (
            <p className="text-sm leading-5 text-muted-foreground">
              {presented.summary}
            </p>
          ) : null}
        </div>

        {metaFacts.length > 0 ? (
          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            {metaFacts.map((chip) => (
              <span key={`${chip.label ?? 'value'}-${chip.value}`} className="flex items-center gap-1">
                {chip.label ? <span className="text-muted-foreground/70">{chip.label}</span> : null}
                <span className="font-medium text-foreground/75">{chip.value}</span>
              </span>
            ))}
          </div>
        ) : null}

        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span
            className="font-medium text-foreground/80"
            title={formatDate(activity.createdAt, { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' })}
          >
            {presented.timestampLabel}
          </span>

          {presented.actorLabel && (
            <span className="flex items-center gap-1">
              <span className="text-muted-foreground/70">by</span>
              <span className="font-medium text-foreground/80">{presented.actorLabel}</span>
            </span>
          )}

          {activity.direction && !compact ? (
            <span className="flex items-center gap-1">
              {activity.direction === 'inbound' ? (
                <ArrowDownLeft className="h-3 w-3" />
              ) : activity.direction === 'outbound' ? (
                <ArrowUpRight className="h-3 w-3" />
              ) : null}
              {activity.direction}
            </span>
          ) : null}

          {activity.duration && !compact ? (
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatDuration(activity.duration)}
            </span>
          ) : null}
        </div>

        {hasDetails ? (
          <Collapsible>
            <CollapsibleTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="mt-3 h-auto px-0 py-0 text-xs font-medium text-muted-foreground hover:bg-transparent hover:text-foreground"
                onClick={(event) => event.stopPropagation()}
              >
                View details
                <ChevronDown className="ml-1 h-3.5 w-3.5" />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-3 space-y-3" onClick={(event) => event.stopPropagation()}>
              {presented.detailSections.map((section) => {
                if (section.type === 'note') {
                  return (
                    <div key={`${activity.id}-${section.label}`} className="space-y-1">
                      <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                        {section.label}
                      </div>
                      <p className="whitespace-pre-wrap text-sm leading-6 text-foreground/90">
                        {section.body}
                      </p>
                    </div>
                  );
                }

                if (section.type === 'list') {
                  return (
                    <div key={`${activity.id}-${section.label}`} className="space-y-1.5">
                      <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                        {section.label}
                      </div>
                      <ul className="space-y-1 text-sm text-foreground/85">
                        {section.items.map((item) => (
                          <li key={item} className="leading-6">
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                }

                return (
                  <div key={`${activity.id}-${section.label}`} className="space-y-1.5">
                    <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                      {section.label}
                    </div>
                    <dl className="space-y-1.5 text-sm">
                      {section.items.map((item) => (
                        <div key={`${section.label}-${item.label}-${item.value}`} className="flex flex-wrap gap-x-2 gap-y-1">
                          <dt className="text-muted-foreground">{item.label}</dt>
                          <dd className="font-medium text-foreground/85">{item.value}</dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                );
              })}
            </CollapsibleContent>
          </Collapsible>
        ) : null}
      </div>
    </div>
  );
});

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
              onValueChange={(value) => {
                // Type guard: Select returns string, but we validate it's a valid source
                if (value === 'all' || value === 'audit' || value === 'planned') {
                  onFiltersChange({ ...filters, source: value });
                }
              }}
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
// VIRTUALIZED TIMELINE
// ============================================================================

interface VirtualizedTimelineProps {
  items: Array<
    | { type: 'date-header'; date: string; label: string; count: number }
    | { type: 'entity-header'; entityType: string; label: string; count: number }
    | { type: 'activity'; entry: TimelineActivityEntry }
  >;
  parentRef: React.RefObject<HTMLDivElement | null>;
  compact?: boolean;
  renderActivityItem: (entry: TimelineActivityEntry) => React.ReactNode;
}

function VirtualizedTimeline({
  items,
  parentRef,
  compact = false,
  renderActivityItem,
}: VirtualizedTimelineProps) {
  // eslint-disable-next-line react-hooks/incompatible-library -- useVirtualizer returns functions that cannot be memoized; known TanStack Virtual limitation
  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: (index) => {
      if (items.length === 0) return 0;
      const item = items[index];
      if (item.type === 'date-header') return 50;
      if (item.type === 'entity-header') return 40;
      return compact ? 60 : 80;
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
        if (!item) return null;

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
            {item.type === 'date-header' ? (
              <div
                className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 py-2.5 px-4 border-b border-border/50 text-muted-foreground flex items-center gap-2 text-xs font-medium uppercase tracking-wide"
                role="heading"
                aria-level={2}
              >
                <span className="text-sm font-semibold text-foreground">{item.label}</span>
                <Badge variant="secondary" className="text-xs">
                  {item.count}
                </Badge>
              </div>
            ) : item.type === 'entity-header' ? (
              <div className="flex items-center gap-2 px-4 py-2.5 text-xs font-medium text-muted-foreground bg-muted/30 border-b border-border/30">
                {(() => {
                  const Icon = isActivityEntityType(item.entityType) ? ENTITY_ICONS[item.entityType] ?? Inbox : Inbox;
                  return (
                    <>
                      <Icon className="h-3.5 w-3.5" />
                      <span>{item.label}</span>
                      <span className="text-muted-foreground/70">· {item.count}</span>
                    </>
                  );
                })()}
              </div>
            ) : (
              <div className="ml-2 border-l-2 border-muted pl-4">
                {renderActivityItem(item.entry)}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

/**
 * Unified Activity Timeline Component
 *
 * Displays a combined timeline of audit trail activities and planned activities.
 * Used in customer 360, opportunity detail, and other entity pages.
 *
 * **Performance:**
 * - Virtualization automatically enabled when `height` prop is provided and item count exceeds threshold
 * - Memoized ActivityItem components prevent unnecessary re-renders
 * - Compact mode reduces rendering overhead for sidebars/widgets
 *
 * **Usage Guidelines:**
 * - **Tab content / natural flow**: Don't provide `height` - component expands naturally
 * - **Fixed-height containers**: Provide `height` prop for virtualization (sidebars, modals)
 * - **Large lists**: Consider `groupByDate` for better organization
 * - **Constrained spaces**: Use `compact` mode for sidebars or mobile views
 *
 * @example
 * ```tsx
 * // Tab content - natural flow (no virtualization)
 * <UnifiedActivityTimeline
 *   activities={activities}
 *   isLoading={isLoading}
 *   title="Activity Timeline"
 * />
 *
 * // Fixed-height sidebar - use virtualization
 * <UnifiedActivityTimeline
 *   activities={activities}
 *   height={600}
 *   virtualizationThreshold={50}
 *   compact
 * />
 * ```
 *
 * @see ACTIVITY-TIMELINE-STANDARDS.md for design system patterns
 */
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
  viewAllSearch,
  viewAllLabel = 'View in Activity Feed',
  compact = false,
  virtualizationThreshold = 50,
  height,
  asCard = true,
  className,
}: UnifiedActivityTimelineProps) {
  const [filters, setFilters] = React.useState<Filters>({
    type: 'all',
    source: 'all',
    dateFrom: '',
    dateTo: '',
  });

  const timelineEntries = React.useMemo<TimelineActivityEntry[]>(
    () => activities.map((activity) => ({ activity, presented: presentActivity(activity) })),
    [activities]
  );

  // Apply filters
  const filteredActivities = React.useMemo(() => {
    let result = [...timelineEntries];

    if (filters.source !== 'all') {
      result = result.filter((entry) => entry.activity.source === filters.source);
    }

    if (filters.type !== 'all') {
      result = result.filter((entry) => entry.activity.type === filters.type);
    }

    if (filters.dateFrom) {
      const from = new Date(filters.dateFrom);
      result = result.filter((entry) => new Date(entry.activity.createdAt) >= from);
    }

    if (filters.dateTo) {
      const to = new Date(filters.dateTo);
      to.setHours(23, 59, 59, 999);
      result = result.filter((entry) => new Date(entry.activity.createdAt) <= to);
    }

    if (maxItems) {
      result = result.slice(0, maxItems);
    }

    return result;
  }, [timelineEntries, filters, maxItems]);

  const entityGroups = React.useMemo(() => {
    const hasMultipleEntities = new Set(filteredActivities.map((entry) => entry.activity.entityType))
      .size;
    if (hasMultipleEntities <= 1) return null;
    const groups: Array<{ key: string; label: string; activities: TimelineActivityEntry[] }> = [];
    for (const entry of filteredActivities) {
      let group = groups.find((item) => item.key === entry.activity.entityType);
      if (!group) {
        group = {
          key: entry.activity.entityType,
          label: formatEntityLabel(entry.activity.entityType),
          activities: [],
        };
        groups.push(group);
      }
      group.activities.push(entry);
    }
    return groups;
  }, [filteredActivities]);

  const hasActiveFilters =
    filters.source !== 'all' ||
    filters.type !== 'all' ||
    !!filters.dateFrom ||
    !!filters.dateTo;

  // Group by date if requested
  const dateGroups = React.useMemo(() => {
    if (!groupByDate) return null;

    const groups: Record<string, TimelineActivityEntry[]> = {};
    for (const entry of filteredActivities) {
      const date = new Date(entry.activity.createdAt).toISOString().split('T')[0];
      if (!groups[date]) groups[date] = [];
      groups[date].push(entry);
    }
    return groups;
  }, [filteredActivities, groupByDate]);

  // Date label formatting per ACTIVITY-TIMELINE-STANDARDS.md Section 4
  const getDateLabel = React.useCallback((date: Date): string => {
    if (isToday(date)) return 'Today';
    if (isYesterday(date)) return 'Yesterday';
    if (isThisWeek(date)) return format(date, 'EEEE'); // "Monday"
    if (isThisYear(date)) return format(date, 'MMMM d'); // "January 15"
    return format(date, 'MMMM d, yyyy'); // "January 15, 2024"
  }, []);

  // Render activity item with all props
  const renderActivityItem = React.useCallback(
    (entry: TimelineActivityEntry) => (
      <ActivityItem
        key={entry.activity.id}
        activity={entry.activity}
        presented={entry.presented}
        onClick={onActivityClick}
        onComplete={onComplete}
        isCompletePending={isCompletePending}
        compact={compact}
      />
    ),
    [onActivityClick, onComplete, isCompletePending, compact]
  );

  // Build flat list for virtualization (only when needed)
  const virtualItems = React.useMemo(() => {
    if (filteredActivities.length === 0) return [];
    
    const items: Array<
      | { type: 'date-header'; date: string; label: string; count: number }
      | { type: 'entity-header'; entityType: string; label: string; count: number }
      | { type: 'activity'; entry: TimelineActivityEntry }
    > = [];

    if (dateGroups) {
      // Date-grouped view
      const sortedDates = Object.keys(dateGroups).sort(
        (a, b) => new Date(b).getTime() - new Date(a).getTime()
      );
      for (const date of sortedDates) {
        items.push({
          type: 'date-header',
          date,
          label: getDateLabel(new Date(date)),
          count: dateGroups[date].length,
        });
        for (const entry of dateGroups[date]) {
          items.push({ type: 'activity', entry });
        }
      }
    } else if (entityGroups) {
      // Entity-grouped view
      for (const group of entityGroups) {
        const entityLabel = isActivityEntityType(group.key) ? ENTITY_LABELS[group.key] ?? group.label : group.label;
        items.push({
          type: 'entity-header',
          entityType: group.key,
          label: entityLabel,
          count: group.activities.length,
        });
        for (const entry of group.activities) {
          items.push({ type: 'activity', entry });
        }
      }
    } else {
      // Flat list
      for (const entry of filteredActivities) {
        items.push({ type: 'activity', entry });
      }
    }

    return items;
  }, [filteredActivities, dateGroups, entityGroups, getDateLabel]);

  // Determine if virtualization should be used
  const useVirtualization = virtualItems.length > virtualizationThreshold && !!height;
  const scrollParentRef = React.useRef<HTMLDivElement>(null);

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

  // Content rendering
  const renderContent = () => {
    if (filteredActivities.length === 0) {
      return (
        <EmptyState
          message={emptyMessage}
          description={emptyDescription}
          hasFilters={hasActiveFilters}
        />
      );
    }

    if (useVirtualization && height) {
      // Virtualized view - hooks only called inside VirtualizedTimeline component
      return (
        <ScrollArea ref={scrollParentRef} style={{ height }} className="w-full">
          <VirtualizedTimeline
            items={virtualItems}
            parentRef={scrollParentRef}
            compact={compact}
            renderActivityItem={renderActivityItem}
          />
        </ScrollArea>
      );
    }

    // Non-virtualized view
    if (dateGroups) {
      // Date-grouped view
      return (
        <div className="space-y-4">
          {Object.keys(dateGroups)
            .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())
            .map((date) => (
              <div key={date} className="space-y-0">
                <div
                  className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 py-2.5 px-4 border-b border-border/50 text-muted-foreground flex items-center gap-2 text-xs font-medium uppercase tracking-wide"
                  role="heading"
                  aria-level={2}
                >
                  <span className="text-sm font-semibold text-foreground">{getDateLabel(new Date(date))}</span>
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
      );
    }

    if (entityGroups) {
      // Entity-grouped view
      return (
        <div className="space-y-4">
          {entityGroups.map((group) => {
            const Icon = isActivityEntityType(group.key) ? ENTITY_ICONS[group.key] ?? Inbox : Inbox;
            const entityLabel = isActivityEntityType(group.key) ? ENTITY_LABELS[group.key] ?? group.label : group.label;
            return (
              <div key={group.key} className="space-y-0">
                <div className="flex items-center gap-2 px-4 py-2.5 text-xs font-medium text-muted-foreground bg-muted/30 border-b border-border/30">
                  <Icon className="h-3.5 w-3.5" />
                  <span>{entityLabel}</span>
                  <span className="text-muted-foreground/70">· {group.activities.length}</span>
                </div>
                <div className="space-y-0">
                  {group.activities.map(renderActivityItem)}
                </div>
              </div>
            );
          })}
        </div>
      );
    }

    // Flat list
    return (
      <div className="space-y-0">
        {filteredActivities.map(renderActivityItem)}
      </div>
    );
  };

  const content = renderContent();

  // Header content
  const headerContent = (
    <div className="flex items-center justify-between gap-4">
      <div>
        <CardTitle>{title}</CardTitle>
        {description && (
          <CardDescription>
            {description}
            {hasActiveFilters && ' (filtered)'}
          </CardDescription>
        )}
      </div>
      <div className="flex items-center gap-2">
        {viewAllSearch && (
          <Link
            to="/activities"
            search={viewAllSearch}
            className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
          >
            {viewAllLabel}
          </Link>
        )}
        {showFilters && (
          <FilterControls
            filters={filters}
            onFiltersChange={setFilters}
            hasActiveFilters={hasActiveFilters}
          />
        )}
      </div>
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
