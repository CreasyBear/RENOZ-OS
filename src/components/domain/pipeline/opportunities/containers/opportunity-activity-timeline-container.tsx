/**
 * Opportunity Activity Timeline Container
 *
 * Fetches and manages opportunity activities, delegates rendering to UnifiedActivityTimeline.
 * Handles activity completion mutations with proper cache invalidation.
 *
 * @source activities from useActivityTimeline hook
 * @source completion from useCompleteActivity hook
 */

import { useMemo } from 'react';
import { UnifiedActivityTimeline } from '@/components/shared/activity';
import type { UnifiedActivity } from '@/lib/schemas/unified-activity';
import { toastSuccess, toastError } from '@/hooks';
import { useActivityTimeline, useCompleteActivity } from '@/hooks/pipeline';

// ============================================================================
// TYPES
// ============================================================================

export interface OpportunityActivityTimelineContainerProps {
  opportunityId: string;
  className?: string;
  maxItems?: number;
  showFilters?: boolean;
  groupByDate?: boolean;
  asCard?: boolean;
  title?: string;
  description?: string;
  onActivityClick?: (activity: UnifiedActivity) => void;
}

interface RawActivity {
  id: string;
  type: 'call' | 'email' | 'meeting' | 'note' | 'follow_up';
  description: string;
  outcome: string | null;
  scheduledAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
}

// ============================================================================
// TRANSFORM HELPERS
// ============================================================================

function transformToUnifiedActivity(
  activity: RawActivity,
  opportunityId: string
): UnifiedActivity {
  return {
    id: activity.id,
    source: 'planned' as const,
    entityType: 'opportunity',
    entityId: opportunityId,
    type: activity.type,
    description: activity.description,
    userId: null, // Pipeline activities don't track user at item level
    createdAt: activity.createdAt instanceof Date
      ? activity.createdAt.toISOString()
      : String(activity.createdAt),
    isCompleted: !!activity.completedAt,
    isOverdue: !activity.completedAt &&
      !!activity.scheduledAt &&
      new Date(activity.scheduledAt) < new Date(),
    outcome: activity.outcome ?? undefined,
    scheduledAt: activity.scheduledAt
      ? (activity.scheduledAt instanceof Date
          ? activity.scheduledAt.toISOString()
          : String(activity.scheduledAt))
      : undefined,
    completedAt: activity.completedAt
      ? (activity.completedAt instanceof Date
          ? activity.completedAt.toISOString()
          : String(activity.completedAt))
      : undefined,
  };
}

// ============================================================================
// CONTAINER COMPONENT
// ============================================================================

export function OpportunityActivityTimelineContainer({
  opportunityId,
  className,
  maxItems,
  showFilters = true,
  groupByDate = false,
  asCard = true,
  title = 'Activity Timeline',
  description,
  onActivityClick,
}: OpportunityActivityTimelineContainerProps) {
  // Fetch activities using hook
  const {
    data,
    isLoading,
    error,
  } = useActivityTimeline({
    opportunityId,
    days: 90,
    enabled: !!opportunityId,
  });

  // Complete activity mutation using hook
  const completeMutation = useCompleteActivity();

  // Transform activities to unified format
  const rawActivities = data?.activities;
  const activities = useMemo((): UnifiedActivity[] => {
    if (!rawActivities) return [];
    return rawActivities.map((activity: RawActivity) =>
      transformToUnifiedActivity(activity, opportunityId)
    );
  }, [rawActivities, opportunityId]);

  // Handle completion
  const handleComplete = (activityId: string) => {
    completeMutation.mutate(
      { activityId, opportunityId },
      {
        onSuccess: () => {
          toastSuccess('Activity marked as complete.');
        },
        onError: () => {
          toastError('Failed to complete activity. Please try again.');
        },
      }
    );
  };

  return (
    <UnifiedActivityTimeline
      activities={activities}
      isLoading={isLoading}
      hasError={!!error}
      error={error instanceof Error ? error : null}
      title={title}
      description={description ?? `${activities.length} ${activities.length === 1 ? 'activity' : 'activities'}`}
      showFilters={showFilters}
      maxItems={maxItems}
      groupByDate={groupByDate}
      asCard={asCard}
      className={className}
      onActivityClick={onActivityClick}
      onComplete={handleComplete}
      isCompletePending={completeMutation.isPending}
      emptyMessage="No activities yet"
      emptyDescription="Log your first activity to track engagement with this opportunity."
    />
  );
}

export default OpportunityActivityTimelineContainer;
