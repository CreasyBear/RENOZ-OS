/**
 * Auth Hooks with TanStack Query
 *
 * Provides React hooks for authentication state management using TanStack Query.
 * Syncs Supabase auth state with the query cache for reactive updates.
 *
 * @example
 * ```tsx
 * function UserProfile() {
 *   const { user, isLoading, isAuthenticated } = useAuth()
 *
 *   if (isLoading) return <Spinner />
 *   if (!isAuthenticated) return <LoginPrompt />
 *
 *   return <div>Welcome, {user.email}</div>
 * }
 * ```
 */
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query'
import { useEffect } from 'react'
import { supabase, onAuthStateChange } from '../supabase/client'
import type { User, Session } from '@supabase/supabase-js'
import { invalidateAuthCache } from './route-auth'
import { authLogger } from '@/lib/logger'

// Query keys for auth-related queries
export const authKeys = {
  all: ['auth'] as const,
  session: () => [...authKeys.all, 'session'] as const,
  user: () => [...authKeys.all, 'user'] as const,
}

/**
 * Hook to get the current auth session.
 * Automatically syncs with Supabase auth state changes.
 */
export function useSession() {
  const queryClient = useQueryClient()

  // Subscribe to auth state changes and update query cache
  useEffect(() => {
    const unsubscribe = onAuthStateChange((event, session) => {
      // Update both session and user queries when auth state changes
      queryClient.setQueryData(authKeys.session(), session)
      queryClient.setQueryData(authKeys.user(), session?.user ?? null)

      // Invalidate other queries that might depend on auth state
      if (event === 'SIGNED_OUT') {
        invalidateAuthCache()
        queryClient.clear()
      }
    })

    return unsubscribe
  }, [queryClient])

  return useQuery({
    queryKey: authKeys.session(),
    queryFn: async (): Promise<Session | null> => {
      const { data: { session }, error } = await supabase.auth.getSession()
      if (error) {
        authLogger.error('Error fetching session', error)
        return null
      }
      return session
    },
    staleTime: 1000 * 60 * 5, // Consider session fresh for 5 minutes
    gcTime: 1000 * 60 * 30, // Keep in cache for 30 minutes
  })
}

/**
 * Hook to get the current authenticated user.
 * Returns null if not authenticated.
 */
export function useUser() {
  const queryClient = useQueryClient()

  // Subscribe to auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChange((_event, session) => {
      queryClient.setQueryData(authKeys.user(), session?.user ?? null)
    })

    return unsubscribe
  }, [queryClient])

  return useQuery({
    queryKey: authKeys.user(),
    queryFn: async (): Promise<User | null> => {
      // Use session for UI auth state to avoid extra network validation calls.
      const { data: { session }, error } = await supabase.auth.getSession()
      if (error) {
        authLogger.error('Error fetching user', error)
        return null
      }
      return session?.user ?? null
    },
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 30,
  })
}

/**
 * Convenience hook that provides auth state with useful derived values.
 */
export function useAuth() {
  const sessionQuery = useSession()
  const userQuery = useUser()

  return {
    session: sessionQuery.data,
    user: userQuery.data,
    isLoading: sessionQuery.isLoading || userQuery.isLoading,
    isAuthenticated: !!userQuery.data,
    error: sessionQuery.error || userQuery.error,
    refetch: () => {
      sessionQuery.refetch()
      userQuery.refetch()
    },
  }
}

/**
 * Hook for signing in with email and password.
 */
export function useSignIn() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ email, password }: { email: string; password: string }) => {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        throw error
      }

      return data
    },
    onSuccess: (data) => {
      queryClient.setQueryData(authKeys.session(), data.session)
      queryClient.setQueryData(authKeys.user(), data.user)
    },
  })
}

/**
 * Hook for signing up with email and password.
 */
export function useSignUp() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ email, password }: { email: string; password: string }) => {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      })

      if (error) {
        throw error
      }

      return data
    },
    onSuccess: (data) => {
      if (data.session) {
        queryClient.setQueryData(authKeys.session(), data.session)
        queryClient.setQueryData(authKeys.user(), data.user)
      }
    },
  })
}

/**
 * Hook for signing out.
 */
export function useSignOut() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase.auth.signOut()
      if (error) {
        throw error
      }
    },
    onSuccess: () => {
      invalidateAuthCache()
      queryClient.setQueryData(authKeys.session(), null)
      queryClient.setQueryData(authKeys.user(), null)
      queryClient.clear()
    },
  })
}
