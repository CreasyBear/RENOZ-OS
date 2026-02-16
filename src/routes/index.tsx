/**
 * Root Index Route
 *
 * Redirects authenticated users (with valid app user) to /dashboard, others to /login.
 * Uses getAuthContext so we only redirect to dashboard when the user would pass
 * _authenticated's check - avoids redirect loops when Supabase user exists but
 * app user is missing or inactive.
 *
 * Defensive: If Supabase redirects to /?code= (e.g. redirectTo didn't match allow list),
 * redirect to /update-password so PKCE exchange can complete. Code can be recovery,
 * signup, or magic link; update-password handles recovery. Signup/magic link users
 * would get wrong page if they hit this path - fix Supabase config to avoid.
 */
import { createFileRoute, redirect } from '@tanstack/react-router'
import { getAuthContext } from '@/lib/auth/route-auth'

export const Route = createFileRoute('/')({
  validateSearch: (search: Record<string, unknown>) => ({
    code: typeof search.code === 'string' ? search.code : undefined,
  }),
  beforeLoad: async ({ location, search }) => {
    // Defensive: Supabase may redirect to /?code= when redirectTo doesn't match allow list.
    if (search.code) {
      throw redirect({ to: '/update-password', search: { code: search.code }, replace: true })
    }

    // Prevent redirect loops - only run root redirect logic for the exact "/" route.
    if (location.pathname !== '/') {
      return
    }

    if (typeof window === 'undefined') {
      // Do not issue server redirects from "/".
      // In production, SSR path normalization can make non-root requests look like "/",
      // which causes /login -> /login redirect loops.
      return
    }

    // getAuthContext throws (redirect to login) if not authenticated or app user missing.
    await getAuthContext(location)
    throw redirect({ to: '/dashboard', search: { tab: 'overview' } })
  },
  component: () => null, // Never rendered due to redirect
})
