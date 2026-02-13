/**
 * ActivityTimeline Component
 *
 * @deprecated Use OpportunityActivityTimelineContainer from
 * '@/components/domain/pipeline/opportunities' instead.
 * This component now delegates to the container to align with the
 * UnifiedActivityTimeline standard.
 */

import { memo } from "react";
import { OpportunityActivityTimelineContainer } from "@/components/domain/pipeline/opportunities";

// ============================================================================
// TYPES
// ============================================================================

export interface ActivityTimelineProps {
  opportunityId: string;
  className?: string;
  maxItems?: number;
  showFilters?: boolean;
}

export const ActivityTimeline = memo(function ActivityTimeline({
  opportunityId,
  className,
  maxItems,
  showFilters = true,
}: ActivityTimelineProps) {
  return (
    <OpportunityActivityTimelineContainer
      opportunityId={opportunityId}
      className={className}
      maxItems={maxItems}
      showFilters={showFilters}
    />
  );
});

export default ActivityTimeline;
