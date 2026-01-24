/**
 * Pipeline Activity Mutation Hooks
 *
 * TanStack Query mutation hooks for activity operations:
 * - Log activity (call, email, meeting, note, follow-up)
 * - Complete activity
 * - Update activity
 * - Delete activity
 *
 * @see src/lib/query-keys.ts for centralized query keys
 * @see src/server/functions/pipeline/pipeline.ts for server functions
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import {
  logActivity,
  updateActivity,
  completeActivity,
  deleteActivity,
} from '@/server/functions/pipeline/pipeline';
import type { OpportunityActivityType } from '@/lib/schemas/pipeline';

// ============================================================================
// LOG ACTIVITY MUTATION
// ============================================================================

export interface LogActivityInput {
  opportunityId: string;
  type: OpportunityActivityType;
  description: string;
  outcome?: string;
  scheduledAt?: Date;
  completedAt?: Date;
}

/**
 * Log a new activity for an opportunity
 */
export function useLogActivity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ opportunityId, type, description, outcome, scheduledAt, completedAt }: LogActivityInput) =>
      logActivity({
        data: {
          opportunityId,
          type,
          description,
          outcome,
          scheduledAt,
          completedAt,
        },
      }),
    onSuccess: (_, { opportunityId }) => {
      // Invalidate activities and follow-ups
      queryClient.invalidateQueries({ queryKey: queryKeys.pipeline.activities(opportunityId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.pipeline.followUps(opportunityId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.pipeline.opportunity(opportunityId) });
    },
  });
}

// ============================================================================
// UPDATE ACTIVITY MUTATION
// ============================================================================

export interface UpdateActivityInput {
  activityId: string;
  opportunityId: string;
  description?: string;
  outcome?: string;
  scheduledAt?: Date;
  completedAt?: Date;
}

/**
 * Update an existing activity
 */
export function useUpdateActivity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ activityId, description, outcome, scheduledAt, completedAt }: UpdateActivityInput) =>
      updateActivity({
        data: {
          id: activityId,
          description,
          outcome,
          scheduledAt,
          completedAt,
        },
      }),
    onSuccess: (_, { opportunityId }) => {
      // Invalidate activities and follow-ups
      queryClient.invalidateQueries({ queryKey: queryKeys.pipeline.activities(opportunityId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.pipeline.followUps(opportunityId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.pipeline.opportunity(opportunityId) });
    },
  });
}

// ============================================================================
// COMPLETE ACTIVITY MUTATION
// ============================================================================

export interface CompleteActivityInput {
  activityId: string;
  opportunityId: string;
  outcome?: string;
}

/**
 * Mark an activity as completed
 */
export function useCompleteActivity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ activityId, outcome }: CompleteActivityInput) =>
      completeActivity({ data: { id: activityId, outcome } }),
    onSuccess: (_, { opportunityId }) => {
      // Invalidate activities and follow-ups
      queryClient.invalidateQueries({ queryKey: queryKeys.pipeline.activities(opportunityId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.pipeline.followUps(opportunityId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.pipeline.opportunity(opportunityId) });
    },
  });
}

// ============================================================================
// DELETE ACTIVITY MUTATION
// ============================================================================

export interface DeleteActivityInput {
  activityId: string;
  opportunityId: string;
}

/**
 * Delete an activity
 */
export function useDeleteActivity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ activityId }: DeleteActivityInput) =>
      deleteActivity({ data: { id: activityId } }),
    onSuccess: (_, { opportunityId }) => {
      // Invalidate activities and follow-ups
      queryClient.invalidateQueries({ queryKey: queryKeys.pipeline.activities(opportunityId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.pipeline.followUps(opportunityId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.pipeline.opportunity(opportunityId) });
    },
  });
}

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type { OpportunityActivityType };
