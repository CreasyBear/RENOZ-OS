/**
 * Root Index Route
 *
 * Redirects authenticated users (with valid app user) to /dashboard, others to /login.
 * Uses getAuthContext so we only redirect to dashboard when the user would pass
 * _authenticated's check - avoids redirect loops when Supabase user exists but
 * app user is missing or inactive.
 */
import { createFileRoute, redirect } from '@tanstack/react-router'
import { getAuthContext } from '@/lib/auth/route-auth'

export const Route = createFileRoute('/')({
  beforeLoad: async ({ location }) => {
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
