/**
 * User Lookup Hook
 *
 * Efficiently fetch multiple users by ID for displaying names/avatars
 * in lists (tasks, files, notes, etc.)
 */

import { useMemo } from 'react';
import { useUsers } from './use-users';

interface UserLookupOptions {
  enabled?: boolean;
}

/**
 * Hook to look up user details by IDs.
 * Fetches all users and creates a lookup map for efficient access.
 * 
 * @example
 * ```tsx
 * const { getUser, isLoading } = useUserLookup();
 * const assigneeName = getUser(task.assigneeId)?.name;
 * ```
 */
export function useUserLookup(options: UserLookupOptions = {}) {
  const { data: usersData, isLoading } = useUsers(
    { page: 1, pageSize: 1000, sortOrder: 'asc', sortBy: 'name' }, // Fetch all users
    options.enabled ?? true
  );

  const userMap = useMemo(() => {
    const map = new Map<string, { id: string; name: string | null; email: string }>();
    usersData?.items?.forEach((user) => {
      map.set(user.id, {
        id: user.id,
        name: user.name,
        email: user.email,
      });
    });
    return map;
  }, [usersData]);

  const getUser = (userId: string | null | undefined) => {
    if (!userId) return null;
    return userMap.get(userId) ?? null;
  };

  return {
    getUser,
    userMap,
    isLoading,
  };
}

/**
 * Hook to get a batch of user names for display.
 * Useful for components that need to show multiple user names.
 */
export function useUserNames(userIds: string[], options: UserLookupOptions = {}) {
  const { getUser, isLoading } = useUserLookup(options);

  const names = useMemo(() => {
    return userIds.map((id) => {
      const user = getUser(id);
      return user?.name ?? 'Unknown';
    });
  }, [userIds, getUser]);

  return { names, isLoading };
}
