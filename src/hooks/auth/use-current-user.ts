/**
 * Current User Hook
 *
 * Provides the current authenticated user from route context.
 * User data is fetched once in beforeLoad and available throughout the app.
 *
 * Note: __root.tsx only provides basic auth info (email, authId).
 * For full profile data, use server functions in authenticated routes.
 */

import { useRouteContext } from '@tanstack/react-router';
import type { SSRSafeUser } from '@/lib/supabase/fetch-user-server-fn';
import type { Role } from '@/lib/auth/permissions';

// Re-export the type for convenience
export type { SSRSafeUser as AuthenticatedUser };

/**
 * Hook to get the current authenticated user from route context.
 *
 * Returns auth user enriched with app user data (role, org, status) when available.
 */
export function useCurrentUser() {
  // User context is provided by the _authenticated layout route (undefined during SSR before client hydration)
  const context = useRouteContext({ from: '/_authenticated' });
  const appUser = context?.appUser as
    | {
        id: string;
        organizationId: string;
        role: Role;
        status: string;
      }
    | undefined;

  const user = context?.user
    ? ({
        ...context.user,
        appUserId: appUser?.id,
        organizationId: appUser?.organizationId,
        role: appUser?.role,
        status: appUser?.status,
      } as SSRSafeUser & {
        appUserId?: string;
        organizationId?: string;
        role?: Role;
        status?: string;
      })
    : null;

  return {
    user,
    isLoading: false,
    isError: false,
    error: null,
  };
}
