/**
 * Current User Hook
 *
 * Provides the current authenticated user from route context.
 * User data is fetched once in __root.tsx and available throughout the app.
 *
 * Note: __root.tsx only provides basic auth info (email, authId).
 * For full profile data, use server functions in authenticated routes.
 */

import { useRouteContext } from '@tanstack/react-router';
import type { SSRSafeUser } from '@/lib/supabase/fetch-user-server-fn';

// Re-export the type for convenience
export type { SSRSafeUser as AuthenticatedUser };

/**
 * Hook to get the current authenticated user from route context.
 *
 * Returns basic auth info (email, authId) from Supabase.
 * For full profile (role, org, etc.), fetch in route loader or server function.
 */
export function useCurrentUser() {
  const context = useRouteContext({ from: '__root__' });

  return {
    user: context.user as SSRSafeUser | null,
    isLoading: false,
    isError: false,
    error: null,
  };
}
