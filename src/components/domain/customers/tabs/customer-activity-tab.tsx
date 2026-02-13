/**
 * Customer Activity Tab
 *
 * Displays the unified activity timeline for a customer.
 * Shows all interactions, system events, and communications.
 *
 * @see docs/design-system/DETAIL-VIEW-STANDARDS.md
 */

import { memo } from 'react';
import { Plus, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { UnifiedActivityTimeline } from '@/components/shared/activity';
import type { UnifiedActivity } from '@/lib/schemas/unified-activity';

// ============================================================================
// TYPES
// ============================================================================

export interface CustomerActivityTabProps {
  activities: UnifiedActivity[];
  isLoading?: boolean;
  error?: Error | null;
  /** Handler to open activity logging dialog */
  onLogActivity?: () => void;
  /** Handler to open follow-up scheduling dialog */
  onScheduleFollowUp?: () => void;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const CustomerActivityTab = memo(function CustomerActivityTab({
  activities,
  isLoading = false,
  error,
  onLogActivity,
  onScheduleFollowUp,
}: CustomerActivityTabProps) {
  return (
    <div className="pt-6 space-y-4">
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
        description="Complete history of customer interactions and system events"
        showFilters={true}
        viewAllHref="/activities?entityType=customer"
        emptyMessage="No activity recorded yet"
        emptyDescription="Customer activities will appear here when interactions occur."
      />
    </div>
  );
});

export default CustomerActivityTab;
