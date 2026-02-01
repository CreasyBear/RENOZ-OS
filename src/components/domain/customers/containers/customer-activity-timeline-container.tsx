/**
 * Customer Activity Timeline Container
 *
 * Fetches unified activities (audit trail + planned) for a customer
 * and delegates rendering to UnifiedActivityTimeline.
 *
 * @source activities from useUnifiedActivities hook
 */

import { UnifiedActivityTimeline } from '@/components/shared/activity';
import { useUnifiedActivities } from '@/hooks/activities';

// ============================================================================
// TYPES
// ============================================================================

export interface CustomerActivityTimelineContainerProps {
  customerId: string;
  className?: string;
  maxItems?: number;
  showFilters?: boolean;
  groupByDate?: boolean;
  asCard?: boolean;
  title?: string;
  description?: string;
}

// ============================================================================
// CONTAINER COMPONENT
// ============================================================================

export function CustomerActivityTimelineContainer({
  customerId,
  className,
  maxItems,
  showFilters = true,
  groupByDate = false,
  asCard = true,
  title = 'Activity Timeline',
  description,
}: CustomerActivityTimelineContainerProps) {
  const { activities, isLoading, error, hasError } = useUnifiedActivities({
    entityType: 'customer',
    entityId: customerId,
    enabled: !!customerId,
  });

  return (
    <UnifiedActivityTimeline
      activities={activities}
      isLoading={isLoading}
      hasError={hasError}
      error={error as Error | null}
      title={title}
      description={description ?? `${activities.length} ${activities.length === 1 ? 'activity' : 'activities'}`}
      showFilters={showFilters}
      maxItems={maxItems}
      groupByDate={groupByDate}
      asCard={asCard}
      className={className}
      emptyMessage="No activities yet"
      emptyDescription="Activities will appear here as you interact with this customer."
    />
  );
}

export default CustomerActivityTimelineContainer;
