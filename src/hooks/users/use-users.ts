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
import {
  sendInvitation,
  listInvitations,
  cancelInvitation,
  resendInvitation,
} from '@/server/functions/users/invitations';
import type { SendInvitation } from '@/lib/schemas/users';
import type { UpdateUser, UserListQuery } from '@/lib/schemas/auth';

// ============================================================================
// FILTER TYPES
// ============================================================================

/**
 * User list filters - matches userListQuerySchema from auth schemas.
 */
export type UserFilters = UserListQuery;

export interface InvitationFilters {
  page?: number;
  pageSize?: number;
  status?: 'pending' | 'accepted' | 'cancelled' | 'expired';
}

// ============================================================================
// USER QUERIES
// ============================================================================

/**
 * Hook to fetch paginated list of users with filtering.
 */
export function useUsers(filters?: UserFilters, enabled = true) {
  return useQuery({
    queryKey: queryKeys.users.list(filters),
    queryFn: () => listUsers({ data: filters ?? { page: 1, pageSize: 20 } }),
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
    queryFn: () => getUser({ data: { id: userId } }),
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
    queryFn: () => getUserStats(),
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.lists() });
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.lists() });
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.users.stats() });
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
  });
}

/**
 * Hook to transfer organization ownership to another user.
 */
export function useTransferOwnership() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (newOwnerId: string) => transferOwnership({ data: { newOwnerId } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.users.stats() });
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
    queryKey: [...queryKeys.users.detail(userId), 'activity', { page, pageSize }] as const,
    queryFn: () => getUserActivity({ data: { userId, page, pageSize } }),
    enabled: enabled && !!userId,
    staleTime: 30 * 1000,
  });
}

// ============================================================================
// INVITATION QUERIES
// ============================================================================

/**
 * Hook to fetch paginated list of invitations.
 */
export function useInvitations(filters?: InvitationFilters, enabled = true) {
  return useQuery({
    queryKey: queryKeys.users.invitations.list(filters),
    queryFn: () => listInvitations({ data: filters ?? { page: 1, pageSize: 20 } }),
    enabled,
    staleTime: 30 * 1000,
  });
}

// ============================================================================
// INVITATION MUTATIONS
// ============================================================================

/**
 * Hook to send a new invitation.
 */
export function useSendInvitation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: SendInvitation) => sendInvitation({ data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.invitations.all() });
      queryClient.invalidateQueries({ queryKey: queryKeys.users.stats() });
    },
  });
}

/**
 * Hook to cancel a pending invitation.
 */
export function useCancelInvitation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (invitationId: string) => cancelInvitation({ data: { id: invitationId } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.invitations.all() });
    },
  });
}

/**
 * Hook to resend an invitation.
 */
export function useResendInvitation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (invitationId: string) => resendInvitation({ data: { id: invitationId } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.invitations.all() });
    },
  });
}
