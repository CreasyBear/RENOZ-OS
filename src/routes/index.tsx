/**
 * Root Index Route
 *
 * Redirects authenticated users to /dashboard, others to /login.
 * This ensures users always land on the appropriate page.
 */
import { createFileRoute, redirect } from '@tanstack/react-router'
import { withAuthRetry } from '~/lib/auth/route-auth'

export const Route = createFileRoute('/')({
  beforeLoad: async ({ location }) => {
    if (typeof window === 'undefined') {
      const { getRequest } = await import('@tanstack/react-start/server')
      const request = getRequest()
      const requestPath = new URL(request.url).pathname

      // In production SSR, router location can be normalized for client-only routes.
      // Gate by actual HTTP request path to avoid redirecting /login -> /login loops.
      if (requestPath !== '/') {
        return
      }

      const { createServerSupabase } = await import('~/lib/supabase/server')
      const supabase = createServerSupabase(request)
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (user) {
        throw redirect({ to: '/dashboard', search: { tab: 'overview' } })
      }
      throw redirect({ to: '/login', search: { redirect: undefined } })
    }

    // Prevent redirect loops - only run root redirect logic for the exact "/" route.
    if (location.pathname !== '/') {
      return
    }

    const { supabase } = await import('~/lib/supabase/client')
    const user = await withAuthRetry(async () => {
      const {
        data: { user: authUser },
        error,
      } = await supabase.auth.getUser()
      if (error) throw error
      return authUser
    }, 1, 250).catch(() => null)

    if (user) {
      throw redirect({ to: '/dashboard', search: { tab: 'overview' } })
    }

    throw redirect({ to: '/login', search: { redirect: undefined } })
  },
  component: () => null, // Never rendered due to redirect
})
