/**
 * Root Index Route
 *
 * Redirects authenticated users to /dashboard, others to /login.
 * This ensures users always land on the appropriate page.
 */
import { createFileRoute, redirect } from '@tanstack/react-router'
import type { SupabaseClient } from '@supabase/supabase-js'

export const Route = createFileRoute('/')({
  beforeLoad: async ({ location }) => {
    // Avoid SSR redirect loops; handle redirects on client only
    if (typeof window === 'undefined') {
      return
    }

    // Prevent redirect loops - don't redirect if already navigating to auth pages
    if (location.pathname !== '/') {
      return
    }

    let supabase: SupabaseClient
    if (typeof window === 'undefined') {
      const { getRequest } = await import('@tanstack/react-start/server')
      const { createServerSupabase } = await import('~/lib/supabase/server')
      supabase = createServerSupabase(getRequest())
    } else {
      const { supabase: browserSupabase } = await import('~/lib/supabase/client')
      supabase = browserSupabase
    }

    try {
      // Use getUser() for reliable auth check (validates JWT with server)
      const { data: { user }, error } = await supabase.auth.getUser()

      if (user && !error) {
        throw redirect({ to: '/dashboard' })
      } else {
        throw redirect({ to: '/login', search: { redirect: undefined } })
      }
    } catch (err) {
      // If it's a redirect, rethrow it
      if (err instanceof Response || (err && typeof err === 'object' && 'to' in err)) {
        throw err
      }
      // On any other error, go to login
      throw redirect({ to: '/login', search: { redirect: undefined } })
    }
  },
  component: () => null, // Never rendered due to redirect
})
