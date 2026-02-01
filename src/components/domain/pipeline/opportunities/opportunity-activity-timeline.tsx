/**
 * OpportunityActivityTimeline Component
 *
 * @deprecated Use UnifiedActivityTimeline directly or OpportunityActivityTimelineContainer.
 * This component uses the old shared ActivityTimeline which is being phased out.
 *
 * Migration options:
 * ```tsx
 * // Option 1: Use container (handles data fetching)
 * import { OpportunityActivityTimelineContainer } from '@/components/domain/pipeline/opportunities';
 * <OpportunityActivityTimelineContainer opportunityId={id} />
 *
 * // Option 2: Use UnifiedActivityTimeline directly (if you have activities)
 * import { UnifiedActivityTimeline } from '@/components/shared/activity';
 * <UnifiedActivityTimeline activities={activities} onComplete={handleComplete} />
 * ```
 *
 * @see _Initiation/_prd/2-domains/pipeline/pipeline.prd.json (PIPE-ACTIVITIES-UI)
 */

import { memo, useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Filter, MessageSquare } from 'lucide-react';
import { ActivityTimeline, type Activity } from '@/components/shared';
import type { OpportunityActivityType } from '@/lib/schemas/pipeline';

// ============================================================================
// TYPES
// ============================================================================

export interface PipelineActivity {
  id: string;
  type: OpportunityActivityType;
  description: string;
  outcome: string | null;
  scheduledAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
}

export interface OpportunityActivityTimelineProps {
  /** From getActivityTimeline({ opportunityId }).activities */
  activities: PipelineActivity[];
  /** Loading state from parent query */
  isLoading?: boolean;
  /** Callback when user completes an activity - from useMutation in route */
  onComplete?: (activityId: string, outcome?: string) => void;
  /** Whether a complete action is in progress */
  isCompleting?: boolean;
  className?: string;
  maxItems?: number;
  showFilters?: boolean;
}

interface Filters {
  type: OpportunityActivityType | 'all';
  status: 'all' | 'completed' | 'pending';
  dateFrom: string;
  dateTo: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const ACTIVITY_TYPE_OPTIONS = [
  { value: 'call', label: 'Calls' },
  { value: 'email', label: 'Emails' },
  { value: 'meeting', label: 'Meetings' },
  { value: 'note', label: 'Notes' },
  { value: 'follow_up', label: 'Follow-ups' },
];

const DEFAULT_FILTERS: Filters = {
  type: 'all',
  status: 'all',
  dateFrom: '',
  dateTo: '',
};

// ============================================================================
// COMPONENT
// ============================================================================

export const OpportunityActivityTimeline = memo(function OpportunityActivityTimeline({
  activities: rawActivities,
  isLoading = false,
  onComplete,
  isCompleting = false,
  className,
  maxItems,
  showFilters = true,
}: OpportunityActivityTimelineProps) {
  // Deprecation warning
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.warn(
        '[DEPRECATED] OpportunityActivityTimeline is deprecated. ' +
        'Use OpportunityActivityTimelineContainer or UnifiedActivityTimeline directly.'
      );
    }
  }, []);

  // Local UI state only - no data hooks
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);

  // Transform and filter activities for shared component
  const activities = useMemo(() => {
    if (!rawActivities) return [];

    let result = rawActivities.map(
      (a): Activity => ({
        id: a.id,
        activityType: a.type,
        description: a.description,
        outcome: a.outcome,
        scheduledAt: a.scheduledAt?.toString() ?? null,
        completedAt: a.completedAt?.toString() ?? null,
        createdAt: a.createdAt.toString(),
      })
    );

    // Apply filters
    if (filters.type !== 'all') {
      result = result.filter((a) => a.activityType === filters.type);
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

    return maxItems ? result.slice(0, maxItems) : result;
  }, [rawActivities, filters, maxItems]);

  // Check if filters are active
  const hasActiveFilters =
    filters.type !== 'all' ||
    filters.status !== 'all' ||
    filters.dateFrom !== '' ||
    filters.dateTo !== '';

  const clearFilters = () => setFilters(DEFAULT_FILTERS);

  // Handle completion via callback
  const handleComplete = (activityId: string) => {
    onComplete?.(activityId);
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
                <div className="bg-muted mb-2 h-4 w-1/4 rounded" />
                <div className="bg-muted h-20 rounded" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Activity Timeline</CardTitle>
            <CardDescription>
              {activities.length} {activities.length === 1 ? 'activity' : 'activities'}
              {hasActiveFilters && ' (filtered)'}
            </CardDescription>
          </div>

          {showFilters && (
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
                      onValueChange={(value) =>
                        setFilters((f) => ({ ...f, type: value as Filters['type'] }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="All types" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All types</SelectItem>
                        {ACTIVITY_TYPE_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
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
                        setFilters((f) => ({ ...f, status: value as Filters['status'] }))
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
                      />
                      <Input
                        type="date"
                        value={filters.dateTo}
                        onChange={(e) => setFilters((f) => ({ ...f, dateTo: e.target.value }))}
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
          )}
        </div>
      </CardHeader>

      <CardContent>
        {activities.length === 0 ? (
          <div className="py-8 text-center">
            <MessageSquare className="text-muted-foreground mx-auto mb-4 h-12 w-12" />
            <p className="text-muted-foreground text-sm">
              {hasActiveFilters
                ? 'No activities match your filters.'
                : 'No activities yet. Log your first activity!'}
            </p>
          </div>
        ) : (
          <ActivityTimeline
            activities={activities}
            showCompletion
            onComplete={handleComplete}
            isCompleting={isCompleting}
          />
        )}
      </CardContent>
    </Card>
  );
});

export default OpportunityActivityTimeline;
