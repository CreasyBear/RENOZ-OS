/**
 * Users Hooks
 *
 * TanStack Query hooks for user management operations.
 * Provides hooks for listing, fetching, and mutating users and invitations.
 *
 * @see src/server/functions/users/users.ts for server functions
 * @see src/server/functions/users/invitations.ts for invitation functions
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import { toast } from '../_shared/use-toast';
import {
  listUsers,
  getUser,
  updateUser,
  deactivateUser,
  reactivateUser,
  bulkUpdateUsers,
  getUserStats,
  exportUsers,
  transferOwnership,
} from '@/server/functions/users/users';
import { getUserActivity } from '@/server/functions/_shared/audit-logs';
import type { UpdateUser, UserListQuery } from '@/lib/schemas/auth';

// ============================================================================
// FILTER TYPES
// ============================================================================

/**
 * User list filters - matches userListQuerySchema from auth schemas.
 */
export type UserFilters = UserListQuery;

// ============================================================================
// USER QUERIES
// ============================================================================

/**
 * Hook to fetch paginated list of users with filtering.
 */
export function useUsers(filters?: UserFilters, enabled = true) {
  return useQuery({
    queryKey: queryKeys.users.list(filters),
    queryFn: async () => {
      const result = await listUsers({
        data: filters ?? { page: 1, pageSize: 20 } 
      });
      if (result == null) throw new Error('Query returned no data');
      return result;
    },
    enabled,
    staleTime: 30 * 1000,
  });
}

/**
 * Hook to fetch a single user by ID.
 */
export function useUser(userId: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.users.detail(userId),
    queryFn: async () => {
      const result = await getUser({
        data: { id: userId } 
      });
      if (result == null) throw new Error('Query returned no data');
      return result;
    },
    enabled: enabled && !!userId,
    staleTime: 30 * 1000,
  });
}

/**
 * Hook to fetch user statistics for dashboard.
 */
export function useUserStats(enabled = true) {
  return useQuery({
    queryKey: queryKeys.users.stats(),
    queryFn: async () => {
      const result = await getUserStats();
      if (result == null) throw new Error('User stats returned no data');
      return result;
    },
    enabled,
    staleTime: 60 * 1000,
  });
}

// ============================================================================
// USER MUTATIONS
// ============================================================================

/**
 * Hook to update a user.
 */
export function useUpdateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateUser & { id: string }) => updateUser({ data }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.users.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.users.stats() });
    },
  });
}

/**
 * Hook to deactivate (soft delete) a user.
 */
export function useDeactivateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId: string) => deactivateUser({ data: { id: userId } }),
    onSuccess: (_, userId) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.users.detail(userId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.users.stats() });
    },
  });
}

/**
 * Hook to reactivate a deactivated user.
 */
export function useReactivateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId: string) => reactivateUser({ data: { id: userId } }),
    onSuccess: (_, userId) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.users.detail(userId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.users.stats() });
    },
  });
}

/**
 * Bulk user update input - server only allows 'active' | 'suspended' for status
 */
interface BulkUpdateInput {
  userIds: string[];
  updates: {
    role?: 'admin' | 'manager' | 'sales' | 'operations' | 'support' | 'viewer';
    status?: 'active' | 'suspended';
  };
}

/**
 * Hook to bulk update multiple users.
 */
export function useBulkUpdateUsers() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: BulkUpdateInput) => bulkUpdateUsers({ data }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.users.stats() });
      // Invalidate each affected user's detail cache
      variables.userIds.forEach((id) => {
        queryClient.invalidateQueries({ queryKey: queryKeys.users.detail(id) });
      });
    },
  });
}

/**
 * Hook to export users.
 */
export function useExportUsers() {
  return useMutation({
    mutationFn: (data: { format: 'csv' | 'json'; userIds?: string[] }) =>
      exportUsers({ data }),
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to export users');
    },
  });
}

/**
 * Hook to transfer organization ownership to another user.
 */
export function useTransferOwnership() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (newOwnerId: string) => transferOwnership({ data: { newOwnerId } }),
    onSuccess: (_, newOwnerId) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.users.stats() });
      // Invalidate new owner's detail cache (role changed to owner)
      queryClient.invalidateQueries({ queryKey: queryKeys.users.detail(newOwnerId) });
      // Also invalidate current user since their role may have changed
      queryClient.invalidateQueries({ queryKey: queryKeys.currentUser.all });
    },
  });
}

/**
 * Hook to fetch user activity/audit logs.
 */
export function useUserActivity(userId: string, page = 1, pageSize = 10, enabled = true) {
  return useQuery({
    queryKey: queryKeys.users.activity(userId, { page, pageSize }),
    queryFn: async () => {
      const result = await getUserActivity({
        data: { userId, page, pageSize } 
      });
      if (result == null) throw new Error('Query returned no data');
      return result;
    },
    enabled: enabled && !!userId,
    staleTime: 30 * 1000,
  });
}

