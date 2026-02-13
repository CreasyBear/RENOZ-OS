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
    // Prevent redirect loops - only run root redirect logic for the exact "/" route.
    if (location.pathname !== '/') {
      return
    }

    if (typeof window === 'undefined') {
      const { getRequest } = await import('@tanstack/react-start/server')
      const { createServerSupabase } = await import('~/lib/supabase/server')
      const supabase = createServerSupabase(getRequest())
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (user) {
        throw redirect({ to: '/dashboard', search: { tab: 'overview' } })
      }
      throw redirect({ to: '/login', search: { redirect: undefined } })
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
