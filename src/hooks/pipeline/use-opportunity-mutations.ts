/**
 * Pipeline Opportunity Mutation Hooks
 *
 * TanStack Query mutation hooks for opportunity operations:
 * - Create opportunity
 * - Update opportunity
 * - Delete opportunity
 * - Stage change with win/loss tracking
 * - Convert to order
 *
 * @see src/lib/query-keys.ts for centralized query keys
 * @see src/server/functions/pipeline/pipeline.ts for server functions
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import {
  createOpportunity,
  updateOpportunity,
  updateOpportunityStage,
  deleteOpportunity,
  convertToOrder,
  listOpportunities,
} from '@/server/functions/pipeline/pipeline';
import type {
  CreateOpportunity,
  UpdateOpportunity,
  OpportunityStage,
} from '@/lib/schemas/pipeline';

// ============================================================================
// TYPES (inferred from server functions)
// ============================================================================

type OpportunityListResult = Awaited<ReturnType<typeof listOpportunities>>;
type OpportunityItem = OpportunityListResult['items'][number];

// ============================================================================
// CREATE MUTATION
// ============================================================================

/**
 * Create a new opportunity
 */
export function useCreateOpportunity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateOpportunity) => createOpportunity({ data: input }),
    onSuccess: (result) => {
      // Cache the new opportunity detail
      queryClient.setQueryData(queryKeys.pipeline.opportunity(result.opportunity.id), result);
      // Invalidate opportunity lists and metrics
      queryClient.invalidateQueries({ queryKey: queryKeys.opportunities.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.pipeline.metrics() });
    },
  });
}

// ============================================================================
// UPDATE MUTATION
// ============================================================================

/**
 * Update an existing opportunity
 */
export function useUpdateOpportunity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, ...data }: UpdateOpportunity & { id: string }) =>
      updateOpportunity({ data: { id, ...data } }),
    onSuccess: (_, variables) => {
      // Invalidate specific opportunity and lists
      queryClient.invalidateQueries({ queryKey: queryKeys.pipeline.opportunity(variables.id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.opportunities.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.pipeline.metrics() });
    },
  });
}

// ============================================================================
// DELETE MUTATION
// ============================================================================

/**
 * Delete (soft-delete) an opportunity
 */
export function useDeleteOpportunity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteOpportunity({ data: { id } }),
    onSuccess: (_, id) => {
      // Remove from cache and invalidate lists
      queryClient.removeQueries({ queryKey: queryKeys.pipeline.opportunity(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.opportunities.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.pipeline.metrics() });
    },
  });
}

// ============================================================================
// STAGE CHANGE MUTATION
// ============================================================================

export interface StageChangeInput {
  opportunityId: string;
  stage: OpportunityStage;
  reason?: {
    winLossReasonId?: string;
    lostNotes?: string;
    competitorName?: string;
  };
}

/**
 * Update opportunity stage with optimistic updates
 */
export function useUpdateOpportunityStage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ opportunityId, stage, reason }: StageChangeInput) =>
      updateOpportunityStage({
        data: {
          id: opportunityId,
          stage,
          ...(reason ?? {}),
        },
      }),
    onMutate: async ({ opportunityId, stage }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.opportunities.lists() });

      // Snapshot previous values
      const previousLists = queryClient.getQueriesData({ queryKey: queryKeys.opportunities.lists() });

      // Optimistically update all opportunity lists
      queryClient.setQueriesData<OpportunityListResult>(
        { queryKey: queryKeys.opportunities.lists() },
        (old) => {
          if (!old) return old;
          return {
            ...old,
            items: old.items.map((opp: OpportunityItem) =>
              opp.id === opportunityId ? { ...opp, stage } : opp
            ),
          };
        }
      );

      return { previousLists };
    },
    onError: (_err, _variables, context) => {
      // Rollback on error
      if (context?.previousLists) {
        context.previousLists.forEach(([key, data]) => {
          queryClient.setQueryData(key, data);
        });
      }
    },
    onSettled: (_, __, { opportunityId }) => {
      // Refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: queryKeys.opportunities.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.pipeline.opportunity(opportunityId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.pipeline.metrics() });
    },
  });
}

// ============================================================================
// CONVERT TO ORDER MUTATION
// ============================================================================

export interface ConvertToOrderInput {
  opportunityId: string;
  options?: {
    createJob?: boolean;
    depositPercentage?: number;
  };
}

/**
 * Convert won opportunity to order
 */
export function useConvertToOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ opportunityId, options }: ConvertToOrderInput) =>
      convertToOrder({ data: { id: opportunityId, ...options } }),
    onSuccess: (_, { opportunityId }) => {
      // Invalidate opportunity and order caches
      queryClient.invalidateQueries({ queryKey: queryKeys.pipeline.opportunity(opportunityId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.opportunities.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.pipeline.metrics() });
    },
  });
}

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type { CreateOpportunity, UpdateOpportunity, OpportunityStage };
