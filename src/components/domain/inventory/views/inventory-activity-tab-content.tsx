import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { UnifiedActivityTimeline } from '@/components/shared/activity';
import { getActivitiesFeedSearch } from '@/lib/activities';
import type { UnifiedActivity } from '@/lib/schemas/unified-activity';

interface ActivityTabContentProps {
  activities?: UnifiedActivity[];
  activitiesLoading?: boolean;
  activitiesError?: Error | null;
  onLogActivity?: () => void;
}

export function ActivityTabContent({
  activities = [],
  activitiesLoading = false,
  activitiesError,
  onLogActivity,
}: ActivityTabContentProps) {
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
        isLoading={activitiesLoading}
        hasError={!!activitiesError}
        error={activitiesError || undefined}
        title="Activity Timeline"
        description="Complete history of inventory changes, stock movements, and system events"
        showFilters={true}
        viewAllSearch={getActivitiesFeedSearch('inventory')}
        emptyMessage="No activity recorded yet"
        emptyDescription="Inventory activities will appear here when changes are made."
      />
    </div>
  );
}
