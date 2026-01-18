/**
 * Root Index Route
 *
 * Redirects authenticated users to /dashboard, others to /login.
 * This ensures users always land on the appropriate page.
 */
import { createFileRoute, redirect } from '@tanstack/react-router'
import { supabase } from '../lib/supabase/client'

export const Route = createFileRoute('/')({
  beforeLoad: async () => {
    const { data: { session } } = await supabase.auth.getSession()

    if (session) {
      throw redirect({ to: '/dashboard' })
    } else {
      throw redirect({ to: '/login' })
    }
  },
  component: () => null, // Never rendered due to redirect
})
