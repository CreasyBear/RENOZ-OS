/**
 * Delegations Hooks
 *
 * TanStack Query hooks for user delegation management.
 * Provides hooks for creating, listing, and canceling delegations.
 *
 * @see src/server/functions/users/user-delegations.ts for server functions
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import { normalizeReadQueryError } from '@/lib/read-path-policy';
import {
  createDelegation,
  listMyDelegations,
  listDelegationsToMe,
  listAllDelegations,
  updateDelegation,
  cancelDelegation,
  getActiveDelegate,
} from '@/server/functions/users/user-delegations';
import type { CreateDelegation, UpdateDelegation } from '@/lib/schemas/users';

// ============================================================================
// FILTER TYPES
// ============================================================================

export interface DelegationFilters {
  page?: number;
  pageSize?: number;
}

export interface AllDelegationsFilters extends DelegationFilters {
  activeOnly?: boolean;
}

// ============================================================================
// DELEGATION QUERIES
// ============================================================================

/**
 * Hook to fetch delegations created by the current user.
 */
export function useMyDelegations(filters?: DelegationFilters, enabled = true) {
  return useQuery({
    queryKey: queryKeys.users.delegations.myDelegations(filters),
    queryFn: async () => {
      try {
        return await listMyDelegations({
          data: filters ?? { page: 1, pageSize: 50 }
        });
      } catch (error) {
        throw normalizeReadQueryError(error, {
          contractType: 'always-shaped',
          fallbackMessage: 'Delegations are temporarily unavailable. Please refresh and try again.',
        });
      }
    },
    enabled,
    staleTime: 30 * 1000,
  });
}

/**
 * Hook to fetch delegations assigned to the current user.
 */
export function useDelegationsToMe(filters?: DelegationFilters, enabled = true) {
  return useQuery({
    queryKey: queryKeys.users.delegations.delegationsToMe(filters),
    queryFn: async () => {
      try {
        return await listDelegationsToMe({
          data: filters ?? { page: 1, pageSize: 50 }
        });
      } catch (error) {
        throw normalizeReadQueryError(error, {
          contractType: 'always-shaped',
          fallbackMessage: 'Delegations are temporarily unavailable. Please refresh and try again.',
        });
      }
    },
    enabled,
    staleTime: 30 * 1000,
  });
}

/**
 * Hook to fetch all delegations in the organization (admin only).
 */
export function useAllDelegations(filters?: AllDelegationsFilters, enabled = true) {
  return useQuery({
    queryKey: queryKeys.users.delegations.allDelegations(filters),
    queryFn: async () => {
      try {
        return await listAllDelegations({
          data: filters ?? { page: 1, pageSize: 50, activeOnly: true }
        });
      } catch (error) {
        throw normalizeReadQueryError(error, {
          contractType: 'always-shaped',
          fallbackMessage: 'Delegations are temporarily unavailable. Please refresh and try again.',
        });
      }
    },
    enabled,
    staleTime: 30 * 1000,
  });
}

/**
 * Hook to get the active delegate for a specific user.
 */
export function useActiveDelegate(userId: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.users.delegations.activeDelegate(userId),
    queryFn: async () => {
      try {
        return await getActiveDelegate({
          data: { id: userId }
        });
      } catch (error) {
        throw normalizeReadQueryError(error, {
          contractType: 'nullable-by-design',
          fallbackMessage: 'Active delegation details are temporarily unavailable. Please refresh and try again.',
          notFoundMessage: 'The requested user could not be found.',
        });
      }
    },
    enabled: enabled && !!userId,
    staleTime: 60 * 1000,
  });
}

// ============================================================================
// DELEGATION MUTATIONS
// ============================================================================

/**
 * Hook to create a new delegation.
 */
export function useCreateDelegation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateDelegation) => createDelegation({ data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.delegations.all() });
    },
  });
}

/**
 * Hook to update a delegation.
 */
export function useUpdateDelegation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { id: string; updates: UpdateDelegation }) =>
      updateDelegation({ data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.delegations.all() });
    },
  });
}

/**
 * Hook to cancel a delegation.
 */
export function useCancelDelegation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (delegationId: string) => cancelDelegation({ data: { id: delegationId } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.delegations.all() });
    },
  });
}
