/**
 * Issue Activity Timeline Container
 *
 * Fetches unified activities (audit trail) for an issue
 * and delegates rendering to UnifiedActivityTimeline.
 * Planned activities are customer-only; issues show audit trail only.
 *
 * @source activities from useUnifiedActivities hook
 */

import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { UnifiedActivityTimeline } from '@/components/shared/activity';
import { useUnifiedActivities } from '@/hooks/activities';

// ============================================================================
// TYPES
// ============================================================================

export interface IssueActivityTimelineContainerProps {
  issueId: string;
  className?: string;
  maxItems?: number;
  showFilters?: boolean;
  groupByDate?: boolean;
  asCard?: boolean;
  title?: string;
  description?: string;
  /** Handler to open activity logging dialog */
  onLogActivity?: () => void;
}

// ============================================================================
// CONTAINER COMPONENT
// ============================================================================

export function IssueActivityTimelineContainer({
  issueId,
  className,
  maxItems,
  showFilters = true,
  groupByDate = false,
  asCard = true,
  title = 'Activity Timeline',
  description,
  onLogActivity,
}: IssueActivityTimelineContainerProps) {
  const { activities, isLoading, error, hasError } = useUnifiedActivities({
    entityType: 'issue',
    entityId: issueId,
    enabled: !!issueId,
  });

  return (
    <div className="space-y-4">
      {onLogActivity && (
        <div className="flex items-center justify-end">
          <Button size="sm" onClick={onLogActivity}>
            <Plus className="h-4 w-4 mr-2" />
            Log Activity
          </Button>
        </div>
      )}
      <UnifiedActivityTimeline
      activities={activities}
      isLoading={isLoading}
      hasError={hasError}
      error={error instanceof Error ? error : null}
      title={title}
      description={
        description ?? `${activities.length} ${activities.length === 1 ? 'activity' : 'activities'}`
      }
      showFilters={showFilters}
      maxItems={maxItems}
      groupByDate={groupByDate}
      asCard={asCard}
      className={className}
      emptyMessage="No activity yet"
      emptyDescription="Activities will appear here as you update this issue."
    />
    </div>
  );
}

export default IssueActivityTimelineContainer;
