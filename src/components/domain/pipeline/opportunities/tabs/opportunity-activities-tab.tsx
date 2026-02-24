/**
 * Opportunity Activities Tab
 *
 * Displays the unified activity timeline for an opportunity.
 * Aligns with CustomerActivityTab pattern: single timeline, presenter receives data via props.
 *
 * Features:
 * - Complete activity timeline (calls, emails, meetings, notes, audit)
 * - Log new activities inline
 * - Mark scheduled follow-ups complete (when onComplete provided)
 *
 * @see docs/design-system/DETAIL-VIEW-STANDARDS.md (Tabs Philosophy)
 */

import { memo } from 'react';
import { Plus, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { getActivitiesFeedSearch } from '@/lib/activities';
import { UnifiedActivityTimeline } from '@/components/shared/activity';
import type { UnifiedActivity } from '@/lib/schemas/unified-activity';

// ============================================================================
// TYPES
// ============================================================================

export interface OpportunityActivitiesTabProps {
  activities: UnifiedActivity[];
  isLoading?: boolean;
  error?: Error | null;
  /** Handler to open activity logging dialog */
  onLogActivity?: () => void;
  /** Handler to open follow-up scheduling dialog */
  onScheduleFollowUp?: () => void;
  /** Handler to mark a scheduled activity as complete (opportunity only) */
  onComplete?: (activityId: string, outcome?: string) => void;
  /** Whether a completion is currently in progress */
  isCompletePending?: boolean;
  className?: string;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const OpportunityActivitiesTab = memo(function OpportunityActivitiesTab({
  activities,
  isLoading = false,
  error,
  onLogActivity,
  onScheduleFollowUp,
  onComplete,
  isCompletePending = false,
  className,
}: OpportunityActivitiesTabProps) {
  return (
    <div className={cn('pt-6 space-y-4', className)}>
      {/* Action buttons */}
      {(onLogActivity || onScheduleFollowUp) && (
        <div className="flex items-center justify-end gap-2">
          {onScheduleFollowUp && (
            <Button variant="outline" size="sm" onClick={onScheduleFollowUp}>
              <Clock className="h-4 w-4 mr-2" />
              Schedule Follow-up
            </Button>
          )}
          {onLogActivity && (
            <Button size="sm" onClick={onLogActivity}>
              <Plus className="h-4 w-4 mr-2" />
              Log Activity
            </Button>
          )}
        </div>
      )}

      <UnifiedActivityTimeline
        activities={activities}
        isLoading={isLoading}
        hasError={!!error}
        error={error || undefined}
        title="Activity Timeline"
        description="Complete history of opportunity changes, status updates, and system events"
        showFilters={true}
        viewAllSearch={getActivitiesFeedSearch('opportunity')}
        emptyMessage="No activity recorded yet"
        emptyDescription="Opportunity activities will appear here when changes are made."
        onComplete={onComplete}
        isCompletePending={isCompletePending}
      />
    </div>
  );
});

export default OpportunityActivitiesTab;
