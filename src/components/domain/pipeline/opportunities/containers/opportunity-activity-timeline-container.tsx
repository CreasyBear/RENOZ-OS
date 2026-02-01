/**
 * Opportunity Activity Timeline Container
 *
 * Fetches and manages opportunity activities, delegates rendering to UnifiedActivityTimeline.
 * Handles activity completion mutations with proper cache invalidation.
 *
 * @source activities from getActivityTimeline server function
 * @source completion from completeActivity mutation
 */

import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import { UnifiedActivityTimeline } from '@/components/shared/activity';
import type { UnifiedActivity } from '@/lib/schemas/unified-activity';
import { toastSuccess, toastError } from '@/hooks';
import {
  getActivityTimeline,
  completeActivity,
} from '@/server/functions/pipeline/pipeline';

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
  const queryClient = useQueryClient();

  // Fetch activities
  const {
    data,
    isLoading,
    error,
  } = useQuery({
    queryKey: queryKeys.pipeline.activityTimeline(opportunityId),
    queryFn: async () => {
      const result = await getActivityTimeline({
        data: {
          opportunityId,
          days: 90,
        },
      });
      return result;
    },
    enabled: !!opportunityId,
  });

  // Complete activity mutation
  const completeMutation = useMutation({
    mutationFn: async (activityId: string) => {
      return completeActivity({
        data: { id: activityId },
      });
    },
    onSuccess: () => {
      toastSuccess('Activity marked as complete.');
      // Invalidate related queries
      queryClient.invalidateQueries({
        queryKey: queryKeys.pipeline.activityTimeline(opportunityId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.opportunities.detail(opportunityId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.activities.all,
      });
    },
    onError: () => {
      toastError('Failed to complete activity. Please try again.');
    },
  });

  // Transform activities to unified format
  const activities = useMemo((): UnifiedActivity[] => {
    if (!data?.activities) return [];
    return data.activities.map((activity: RawActivity) =>
      transformToUnifiedActivity(activity, opportunityId)
    );
  }, [data?.activities, opportunityId]);

  // Handle completion
  const handleComplete = (activityId: string) => {
    completeMutation.mutate(activityId);
  };

  return (
    <UnifiedActivityTimeline
      activities={activities}
      isLoading={isLoading}
      hasError={!!error}
      error={error as Error | null}
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
