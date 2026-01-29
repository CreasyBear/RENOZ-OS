/**
 * Authenticated Layout Route
 *
 * Pathless layout route that wraps all protected pages.
 * Checks authentication status and redirects to /login if not authenticated.
 *
 * All routes under src/routes/_authenticated/ are protected by this layout.
 *
 * Features:
 * - Authentication check with redirect to login
 * - Global QuickLogDialog with Cmd+L keyboard shortcut
 *
 * @example
 * Route structure:
 * - /login (public - outside _authenticated)
 * - / → redirects to /dashboard if authenticated
 * - /dashboard → protected by _authenticated layout
 * - /customers → protected by _authenticated layout
 */
import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import { useState, useCallback } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import { AppShell } from '../components/layout'
import {
  QuickLogDialog,
  useQuickLogShortcut,
} from '../components/domain/communications/quick-log-dialog'

export const Route = createFileRoute('/_authenticated')({
  beforeLoad: async ({ location }) => {
    let supabase: SupabaseClient
    if (typeof window === 'undefined') {
      const { getRequest } = await import('@tanstack/react-start/server')
      const { createServerSupabase } = await import('~/lib/supabase/server')
      supabase = createServerSupabase(getRequest())
    } else {
      const { supabase: browserSupabase } = await import('~/lib/supabase/client')
      supabase = browserSupabase
    }

    // Check if user is authenticated with Supabase
    // Use getUser() for reliable auth check (validates JWT with server)
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (!user || authError) {
      // Redirect to login with return URL
      throw redirect({
        to: '/login',
        search: {
          redirect: location.href,
        },
      })
    }

    // Verify user exists and is active in application database
    // This catches: deactivated users, deleted users, users not in users table
    const { data: appUser, error } = await supabase
      .from('users')
      .select('id, status, organization_id, role, deleted_at')
      .eq('auth_id', user.id)
      .is('deleted_at', null)
      .single()

    if (error || !appUser) {
      // User not found in app database or has been deleted
      // Sign them out and redirect to login
      await supabase.auth.signOut()
      throw redirect({
        to: '/login',
        search: {
          redirect: undefined, // Clear any redirect
        },
      })
    }

    if (appUser.status !== 'active') {
      // User exists but is not active (deactivated, suspended, etc.)
      await supabase.auth.signOut()
      throw redirect({
        to: '/login',
        search: {
          redirect: undefined, // Clear any redirect
        },
      })
    }

    // Return user context for child routes
    return {
      user,
      appUser: {
        id: appUser.id,
        organizationId: appUser.organization_id,
        role: appUser.role,
        status: appUser.status,
      },
    }
  },
  component: AuthenticatedLayout,
})

function AuthenticatedLayout() {
  // Quick Log Dialog state
  const [quickLogOpen, setQuickLogOpen] = useState(false)

  // Enable Cmd+L keyboard shortcut for quick log
  const handleOpenQuickLog = useCallback(() => {
    setQuickLogOpen(true)
  }, [])
  useQuickLogShortcut(handleOpenQuickLog)

  return (
    <AppShell>
      <Outlet />

      {/* Global Quick Log Dialog - accessible from anywhere via Cmd+L */}
      <QuickLogDialog
        open={quickLogOpen}
        onOpenChange={setQuickLogOpen}
      />
    </AppShell>
  )
}
