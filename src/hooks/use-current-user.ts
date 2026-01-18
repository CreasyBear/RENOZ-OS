/**
 * Current User Hook
 *
 * Provides the current authenticated user with their application role and organization.
 * This differs from useUser (Supabase auth user) by including app-level data.
 *
 * @example
 * ```tsx
 * function ProfilePage() {
 *   const { currentUser, isLoading, error } = useCurrentUser()
 *
 *   if (isLoading) return <Spinner />
 *   if (!currentUser) return <Redirect to="/login" />
 *
 *   return (
 *     <div>
 *       <p>Name: {currentUser.name}</p>
 *       <p>Role: {currentUser.role}</p>
 *     </div>
 *   )
 * }
 * ```
 */

import { useQuery } from '@tanstack/react-query'
import { useServerFn } from '@tanstack/react-start'
import { useAuth } from '@/lib/auth/hooks'
import { getCurrentUser } from '@/server/users'
import type { Role } from '@/lib/auth/permissions'

/**
 * Application user type with role information.
 */
export interface CurrentUser {
  id: string
  authId: string
  email: string
  name: string | null
  role: Role
  status: string
  organizationId: string
}

/**
 * Query keys for current user.
 */
export const currentUserKeys = {
  all: ['currentUser'] as const,
  detail: () => [...currentUserKeys.all, 'detail'] as const,
}

/**
 * Hook to get the current authenticated user with their application role.
 *
 * Returns the user from the users table (not auth.users), which includes:
 * - role (for permission checks)
 * - organizationId (for multi-tenant context)
 * - name, status, and other app-level data
 */
export function useCurrentUser() {
  const { isAuthenticated } = useAuth()
  const getCurrentUserFn = useServerFn(getCurrentUser)

  const query = useQuery({
    queryKey: currentUserKeys.detail(),
    queryFn: async (): Promise<CurrentUser | null> => {
      if (!isAuthenticated) {
        return null
      }

      try {
        const user = await getCurrentUserFn()
        return user as CurrentUser
      } catch (error) {
        console.error('Error fetching current user:', error)
        return null
      }
    },
    enabled: isAuthenticated,
    staleTime: 1000 * 60 * 5, // Consider fresh for 5 minutes
    gcTime: 1000 * 60 * 30, // Keep in cache for 30 minutes
  })

  return {
    currentUser: query.data ?? null,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  }
}
