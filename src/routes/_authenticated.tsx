/**
 * Authenticated Layout Route
 *
 * Pathless layout route that wraps all protected pages.
 * Checks authentication status and redirects to /login if not authenticated.
 *
 * All routes under src/routes/_authenticated/ are protected by this layout.
 *
 * @example
 * Route structure:
 * - /login (public - outside _authenticated)
 * - / → redirects to /dashboard if authenticated
 * - /dashboard → protected by _authenticated layout
 * - /customers → protected by _authenticated layout
 */
import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import { supabase } from '../lib/supabase/client'
import { AppShell } from '../components/layout'

export const Route = createFileRoute('/_authenticated')({
  beforeLoad: async ({ location }) => {
    // Check if user is authenticated
    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
      // Redirect to login with return URL
      throw redirect({
        to: '/login',
        search: {
          redirect: location.href,
        },
      })
    }

    // Return user context for child routes
    return {
      user: session.user,
    }
  },
  component: AuthenticatedLayout,
})

function AuthenticatedLayout() {
  return (
    <AppShell>
      <Outlet />
    </AppShell>
  )
}
