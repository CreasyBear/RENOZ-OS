/**
 * Opportunity Activities Tab
 *
 * Full activity management for the opportunity detail view.
 * This is a FULL FEATURE tab - not a preview.
 *
 * Features:
 * - Complete activity timeline (calls, emails, meetings, notes)
 * - Unified activity log integration
 * - Activity filtering and search
 * - Log new activities inline
 *
 * @see docs/design-system/DETAIL-VIEW-STANDARDS.md (Tabs Philosophy)
 */

import { memo, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import {
  MessageSquare,
  Phone,
  Mail,
  Users,
  FileText,
  Filter,
  Plus,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { UnifiedActivityTimeline } from '@/components/shared/activity';
import type { UnifiedActivity } from '@/lib/schemas/unified-activity';

// ============================================================================
// TYPES
// ============================================================================

interface ActivityData {
  id: string;
  type: string;
  description: string;
  outcome: string | null;
  scheduledAt: Date | string | null;
  completedAt: Date | string | null;
  createdAt: Date | string;
  createdByName?: string | null;
}

export interface OpportunityActivitiesTabProps {
  /** Opportunity-specific activities (immutable log) */
  activities: ActivityData[];
  /** Unified activities from all sources */
  unifiedActivities?: UnifiedActivity[];
  unifiedActivitiesLoading?: boolean;
  unifiedActivitiesError?: Error | null;
  /** Handler to open activity logging dialog */
  onLogActivity?: () => void;
  className?: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const ACTIVITY_TYPE_CONFIG: Record<string, { icon: typeof MessageSquare; label: string; color: string }> = {
  call: { icon: Phone, label: 'Call', color: 'bg-blue-100 text-blue-600' },
  email: { icon: Mail, label: 'Email', color: 'bg-green-100 text-green-600' },
  meeting: { icon: Users, label: 'Meeting', color: 'bg-purple-100 text-purple-600' },
  note: { icon: FileText, label: 'Note', color: 'bg-amber-100 text-amber-600' },
  task: { icon: MessageSquare, label: 'Task', color: 'bg-gray-100 text-gray-600' },
};

// ============================================================================
// ACTIVITY LIST (Opportunity-specific)
// ============================================================================

interface ActivityListProps {
  activities: ActivityData[];
  typeFilter: string[];
  onLogActivity?: () => void;
}

function ActivityList({ activities, typeFilter, onLogActivity }: ActivityListProps) {
  const filteredActivities = typeFilter.length > 0
    ? activities.filter((a) => typeFilter.includes(a.type))
    : activities;

  if (filteredActivities.length === 0) {
    return (
      <div className="text-center py-12 border border-dashed rounded-lg">
        <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <p className="text-muted-foreground font-medium">No activities logged yet</p>
        <p className="text-sm text-muted-foreground mt-1 mb-4">
          Log calls, emails, meetings, and notes here
        </p>
        {onLogActivity && (
          <Button onClick={onLogActivity}>
            <Plus className="h-4 w-4 mr-2" />
            Log Activity
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {filteredActivities.map((activity, index) => {
        const config = ACTIVITY_TYPE_CONFIG[activity.type] ?? ACTIVITY_TYPE_CONFIG.note;
        const Icon = config.icon;
        const isCompleted = !!activity.completedAt;

        return (
          <div
            key={activity.id}
            className={cn('flex gap-4 pb-4', index < filteredActivities.length - 1 && 'border-b')}
          >
            <div
              className={cn(
                'flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center',
                isCompleted ? config.color : 'bg-muted'
              )}
            >
              <Icon
                className={cn('h-5 w-5', !isCompleted && 'text-muted-foreground')}
              />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{config.label}</p>
                    {isCompleted && (
                      <Badge variant="secondary" className="text-xs">
                        Completed
                      </Badge>
                    )}
                    {activity.scheduledAt && !isCompleted && (
                      <Badge variant="outline" className="text-xs">
                        Scheduled
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{activity.description}</p>
                  {activity.outcome && (
                    <p className="text-sm mt-2">
                      <span className="font-medium">Outcome:</span> {activity.outcome}
                    </p>
                  )}
                </div>
                <div className="text-right text-sm text-muted-foreground whitespace-nowrap">
                  {formatDistanceToNow(
                    typeof activity.createdAt === 'string'
                      ? new Date(activity.createdAt)
                      : activity.createdAt,
                    { addSuffix: true }
                  )}
                </div>
              </div>
              {activity.createdByName && (
                <p className="text-xs text-muted-foreground mt-2">
                  Logged by {activity.createdByName}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ============================================================================
// TYPE FILTER
// ============================================================================

interface TypeFilterProps {
  selected: string[];
  onChange: (types: string[]) => void;
}

function TypeFilter({ selected, onChange }: TypeFilterProps) {
  const types = Object.entries(ACTIVITY_TYPE_CONFIG);

  const toggleType = (type: string) => {
    if (selected.includes(type)) {
      onChange(selected.filter((t) => t !== type));
    } else {
      onChange([...selected, type]);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          <Filter className="h-4 w-4 mr-2" />
          Filter
          {selected.length > 0 && (
            <Badge variant="secondary" className="ml-2 text-xs">
              {selected.length}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {types.map(([type, config]) => (
          <DropdownMenuCheckboxItem
            key={type}
            checked={selected.includes(type)}
            onCheckedChange={() => toggleType(type)}
          >
            <config.icon className="h-4 w-4 mr-2" />
            {config.label}
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const OpportunityActivitiesTab = memo(function OpportunityActivitiesTab({
  activities,
  unifiedActivities = [],
  unifiedActivitiesLoading = false,
  unifiedActivitiesError,
  onLogActivity,
  className,
}: OpportunityActivitiesTabProps) {
  const [typeFilter, setTypeFilter] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<'activities' | 'unified'>('activities');

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header with actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant={viewMode === 'activities' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('activities')}
          >
            Opportunity Activities ({activities.length})
          </Button>
          <Button
            variant={viewMode === 'unified' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('unified')}
          >
            All Activity ({unifiedActivities.length})
          </Button>
        </div>
        <div className="flex gap-2">
          {viewMode === 'activities' && <TypeFilter selected={typeFilter} onChange={setTypeFilter} />}
          {onLogActivity && (
            <Button size="sm" onClick={onLogActivity}>
              <Plus className="h-4 w-4 mr-2" />
              Log Activity
            </Button>
          )}
        </div>
      </div>

      {/* Content based on view mode */}
      {viewMode === 'activities' ? (
        <ActivityList
          activities={activities}
          typeFilter={typeFilter}
          onLogActivity={onLogActivity}
        />
      ) : (
        <UnifiedActivityTimeline
          activities={unifiedActivities}
          isLoading={unifiedActivitiesLoading}
          hasError={!!unifiedActivitiesError}
          error={unifiedActivitiesError ?? undefined}
          title="Activity Timeline"
          description="Complete history of opportunity changes, status updates, and system events"
          showFilters={true}
          emptyMessage="No activity recorded yet"
          emptyDescription="Opportunity activities will appear here when changes are made."
        />
      )}
    </div>
  );
});

export default OpportunityActivitiesTab;
