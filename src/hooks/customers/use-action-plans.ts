/**
 * Customer Action Plans Hooks
 *
 * TanStack Query hooks for managing customer health improvement action plans.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { queryKeys } from '@/lib/query-keys';
import type { CreateActionPlanInput, UpdateActionPlanInput } from '@/lib/schemas/customers/action-plans';
import {
  createActionPlan,
  updateActionPlan,
  listActionPlans,
  getActionPlan,
  deleteActionPlan,
  completeActionPlan,
} from '@/server/functions/customers/action-plans';
import type { CustomerActionPlan } from 'drizzle/schema/customers/customer-action-plans';

// Re-export type for convenience
export type { CustomerActionPlan };

// ============================================================================
// HOOKS
// ============================================================================

/**
 * Get action plans for a customer
 */
export function useCustomerActionPlans(
  customerId?: string,
  filters?: {
    isCompleted?: boolean;
    priority?: 'high' | 'medium' | 'low';
    category?: 'recency' | 'frequency' | 'monetary' | 'engagement' | 'general';
  }
) {
  return useQuery({
    queryKey: queryKeys.customers.actionPlans.list(customerId, filters),
    queryFn: async () => {
      if (!customerId) return { items: [], pagination: { page: 1, pageSize: 20, totalItems: 0, totalPages: 0 } };
      const result = await listActionPlans({
        data: {
          customerId,
          isCompleted: filters?.isCompleted,
          priority: filters?.priority,
          category: filters?.category,
        },
      });
      if (result == null) throw new Error('Action plans returned no data');
      return result;
    },
    enabled: !!customerId,
    staleTime: 30 * 1000, // 30 seconds
  });
}

/**
 * Get a single action plan by ID
 */
export function useActionPlan(id: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.customers.actionPlans.detail(id),
    queryFn: async () => {
      const result = await getActionPlan({ data: { id } });
      if (result == null) throw new Error('Action plan not found');
      return result;
    },
    enabled: enabled && !!id,
    staleTime: 30 * 1000,
  });
}

/**
 * Create a new action plan
 */
export function useCreateActionPlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateActionPlanInput) => {
      return await createActionPlan({ data: input });
    },
    onSuccess: (data) => {
      // Invalidate customer action plans queries
      queryClient.invalidateQueries({
        queryKey: queryKeys.customers.actionPlans.list(data.customerId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.customers.health.all(),
      });
      toast.success('Action plan created');
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to create action plan');
    },
  });
}

/**
 * Update an action plan
 */
export function useUpdateActionPlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateActionPlanInput) => {
      return await updateActionPlan({ data: input });
    },
    onSuccess: (data) => {
      // Invalidate queries
      queryClient.invalidateQueries({
        queryKey: queryKeys.customers.actionPlans.all(),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.customers.actionPlans.detail(data.id),
      });
      toast.success('Action plan updated');
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to update action plan');
    },
  });
}

/**
 * Delete an action plan
 */
export function useDeleteActionPlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await deleteActionPlan({ data: { id } });
    },
    onSuccess: () => {
      // Invalidate queries
      queryClient.invalidateQueries({
        queryKey: queryKeys.customers.actionPlans.all(),
      });
      toast.success('Action plan deleted');
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to delete action plan');
    },
  });
}

/**
 * Complete an action plan
 */
export function useCompleteActionPlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      return await completeActionPlan({ data: { id } });
    },
    onSuccess: (data) => {
      // Invalidate queries
      queryClient.invalidateQueries({
        queryKey: queryKeys.customers.actionPlans.all(),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.customers.actionPlans.detail(data.id),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.customers.health.all(),
      });
      toast.success('Action plan completed');
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to complete action plan');
    },
  });
}
