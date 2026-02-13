/**
 * User Lookup Hook
 *
 * Efficiently fetch all user names for displaying in lists (tasks, files, notes, etc.)
 * Uses a lightweight server function that returns only {id, name, email}.
 */

import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { listUserNamesForLookup } from '@/server/functions/users/users'
import { useCurrentUser } from '@/hooks/auth/use-current-user'

interface UserLookupOptions {
  enabled?: boolean
}

/**
 * Hook to look up user details by IDs.
 * Fetches all org users (lightweight: id/name/email only) and creates a lookup map.
 * No 100-user cap — uses dedicated endpoint without pagination.
 *
 * @example
 * ```tsx
 * const { getUser, isLoading } = useUserLookup();
 * const assigneeName = getUser(task.assigneeId)?.name;
 * ```
 */
export function useUserLookup(options: UserLookupOptions = {}) {
  const { user: currentUser } = useCurrentUser()
  const { data: usersData, isLoading } = useQuery({
    queryKey: queryKeys.users.lookup(),
    queryFn: async () => {
      const result = await listUserNamesForLookup()
      if (result == null) throw new Error('User lookup returned no data')
      return result
    },
    enabled: options.enabled ?? true,
    staleTime: 5 * 60 * 1000, // 5 minutes — user names rarely change
  })

  const userMap = useMemo(() => {
    const map = new Map<string, { id: string; name: string | null; email: string }>()
    usersData?.items?.forEach((user) => {
      map.set(user.id, {
        id: user.id,
        name: user.name,
        email: user.email,
      })
    })
    return map
  }, [usersData])

  const getUser = (userId: string | null | undefined) => {
    if (!userId) return null
    return userMap.get(userId) ?? null
  }

  return {
    getUser,
    userMap,
    isLoading,
    currentUserId: currentUser?.appUserId ?? null,
  }
}

/**
 * Hook to get a batch of user names for display.
 * Useful for components that need to show multiple user names.
 */
export function useUserNames(userIds: string[], options: UserLookupOptions = {}) {
  const { getUser, isLoading } = useUserLookup(options)

  const names = useMemo(() => {
    return userIds.map((id) => {
      const user = getUser(id)
      return user?.name ?? 'Unknown'
    })
  }, [userIds, getUser])

  return { names, isLoading }
}
