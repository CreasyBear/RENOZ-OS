/**
 * Groups Hooks
 *
 * TanStack Query hooks for user group management operations.
 * Provides hooks for listing, fetching, and mutating groups and group members.
 *
 * @see src/server/functions/users/user-groups.ts for server functions
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import {
  listGroups,
  getGroup,
  createGroup,
  updateGroup,
  deleteGroup,
  listGroupMembers,
  addGroupMember,
  updateGroupMemberRole,
  removeGroupMember,
  getUserGroups,
} from '@/server/functions/users/user-groups';
import type {
  CreateGroup,
  UpdateGroup,
  AddGroupMember,
  UpdateGroupMemberRole,
} from '@/lib/schemas/users';

// ============================================================================
// FILTER TYPES
// ============================================================================

/**
 * Group list filters
 */
export interface GroupFilters {
  page?: number;
  pageSize?: number;
  includeInactive?: boolean;
}

/**
 * Group member list filters
 */
export interface GroupMemberFilters {
  page?: number;
  pageSize?: number;
}

// ============================================================================
// GROUP QUERIES
// ============================================================================

/**
 * Hook to fetch paginated list of groups with filtering.
 */
export function useGroups(filters?: GroupFilters, enabled = true) {
  return useQuery({
    queryKey: queryKeys.users.groups.list(filters),
    queryFn: async () => {
      const result = await listGroups({
        data: {
          page: filters?.page ?? 1,
          pageSize: filters?.pageSize ?? 24,
          includeInactive: filters?.includeInactive ?? false,
        },
      });
      if (result == null) throw new Error('Groups list returned no data');
      return result;
    },
    enabled,
    staleTime: 30 * 1000,
  });
}

/**
 * Hook to fetch a single group by ID.
 */
export function useGroup(groupId: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.users.groups.detail(groupId),
    queryFn: async () => {
      const result = await getGroup({ data: { id: groupId } });
      if (result == null) throw new Error('Group not found');
      return result;
    },
    enabled: enabled && !!groupId,
    staleTime: 30 * 1000,
  });
}

/**
 * Hook to fetch members of a group.
 */
export function useGroupMembers(
  groupId: string,
  filters?: GroupMemberFilters,
  enabled = true
) {
  return useQuery({
    queryKey: queryKeys.users.groups.members(groupId, filters),
    queryFn: async () => {
      const result = await listGroupMembers({
        data: {
          groupId,
          page: filters?.page ?? 1,
          pageSize: filters?.pageSize ?? 100,
        },
      });
      if (result == null) throw new Error('Group members returned no data');
      return result;
    },
    enabled: enabled && !!groupId,
    staleTime: 30 * 1000,
  });
}

/**
 * Hook to fetch all groups a user belongs to.
 */
export function useUserGroups(userId: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.users.groups.userGroups(userId),
    queryFn: async () => {
      const result = await getUserGroups({ data: { id: userId } });
      if (result == null) throw new Error('User groups returned no data');
      return result;
    },
    enabled: enabled && !!userId,
    staleTime: 30 * 1000,
  });
}

// ============================================================================
// GROUP MUTATIONS
// ============================================================================

/**
 * Hook to create a new group.
 */
export function useCreateGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateGroup) => createGroup({ data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.groups.lists() });
    },
  });
}

/**
 * Hook to update a group.
 */
export function useUpdateGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { id: string; updates: UpdateGroup }) => updateGroup({ data }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.groups.lists() });
      queryClient.invalidateQueries({
        queryKey: queryKeys.users.groups.detail(variables.id),
      });
    },
  });
}

/**
 * Hook to delete a group.
 */
export function useDeleteGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (groupId: string) => deleteGroup({ data: { id: groupId } }),
    onSuccess: (_, groupId) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.groups.lists() });
      queryClient.invalidateQueries({
        queryKey: queryKeys.users.groups.detail(groupId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.users.groups.members(groupId),
      });
    },
  });
}

// ============================================================================
// GROUP MEMBER MUTATIONS
// ============================================================================

/**
 * Hook to add a member to a group.
 */
export function useAddGroupMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: AddGroupMember) => addGroupMember({ data }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.users.groups.members(variables.groupId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.users.groups.detail(variables.groupId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.users.groups.userGroups(variables.userId),
      });
    },
  });
}

/**
 * Hook to update a member's role in a group.
 */
export function useUpdateGroupMemberRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateGroupMemberRole) => updateGroupMemberRole({ data }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.users.groups.members(variables.groupId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.users.groups.detail(variables.groupId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.users.groups.userGroups(variables.userId),
      });
    },
  });
}

/**
 * Hook to remove a member from a group.
 */
export function useRemoveGroupMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { groupId: string; userId: string }) =>
      removeGroupMember({ data }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.users.groups.members(variables.groupId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.users.groups.detail(variables.groupId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.users.groups.userGroups(variables.userId),
      });
    },
  });
}
