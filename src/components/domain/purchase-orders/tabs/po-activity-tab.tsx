/**
 * PO Activity Tab
 *
 * Displays the unified activity timeline for a purchase order.
 * Extracted for lazy loading per DETAIL-VIEW-STANDARDS.md.
 *
 * @see docs/design-system/DETAIL-VIEW-STANDARDS.md
 */

import { memo } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { UnifiedActivityTimeline } from '@/components/shared/activity';
import { getActivitiesFeedSearch } from '@/lib/activities';
import type { UnifiedActivity } from '@/lib/schemas/unified-activity';

// ============================================================================
// TYPES
// ============================================================================

export interface POActivityTabProps {
  activities: UnifiedActivity[];
  isLoading?: boolean;
  error?: Error | null;
  /** Handler to open activity logging dialog */
  onLogActivity?: () => void;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const POActivityTab = memo(function POActivityTab({
  activities,
  isLoading = false,
  error,
  onLogActivity,
}: POActivityTabProps) {
  return (
    <div className="pt-6 space-y-4">
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
        hasError={!!error}
        error={error || undefined}
        title="Activity Timeline"
        description="Complete history of purchase order changes, approvals, and receipts"
        showFilters={true}
        viewAllSearch={getActivitiesFeedSearch('purchase_order')}
        emptyMessage="No activity recorded yet"
        emptyDescription="Purchase order activities will appear here when changes are made."
      />
    </div>
  );
});
