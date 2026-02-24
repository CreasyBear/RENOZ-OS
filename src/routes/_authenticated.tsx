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
 * - Organization settings provider for global settings access
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
import { AppShell } from '../components/layout'
import {
  QuickLogDialog,
  useQuickLogShortcut,
} from '../components/domain/communications/quick-log-dialog'
import { useOpenQuickLog } from '../contexts/open-quick-log-context'
import { ConfirmationDialog } from '../components/ui/confirmation-dialog'
import { ConfirmationProvider } from '../contexts/confirmation-context'
import { OpenQuickLogProvider } from '../contexts/open-quick-log-provider'
import { OrganizationSettingsProvider } from '../contexts/organization-settings-context'
import { useOrganizationSettingsQuery } from '../hooks/organizations/use-organization'
import { getAuthContext } from '../lib/auth/route-auth'
import { getLoginRedirectSearch } from '../lib/auth/route-policy'
import { authLogger } from '@/lib/logger'

export const Route = createFileRoute('/_authenticated')({
  beforeLoad: async ({ location }) => {
    if (typeof window === 'undefined') {
      const { getRequest } = await import('@tanstack/react-start/server')
      const { createServerSupabase } = await import('@/lib/supabase/server')
      const supabase = createServerSupabase(getRequest())
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        const search = getLoginRedirectSearch(location.pathname)
        throw redirect({ to: '/login', search })
      }
      return
    }

    const { user, appUser } = await getAuthContext(location)

    authLogger.debug('[auth] beforeLoad ok', {
      path: location.pathname,
      userId: appUser.id,
      organizationId: appUser.organizationId,
    })
    return {
      user,
      appUser,
    }
  },
  component: AuthenticatedLayout,
})

/**
 * Renders QuickLogDialog with customer/opportunity context from the route.
 * Must be a child of OpenQuickLogProvider so useOpenQuickLog() returns the correct context.
 * Previously, customerId was always undefined because the parent of the provider
 * cannot read the provider's context.
 */
function GlobalQuickLogDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const openQuickLogContext = useOpenQuickLog()
  return (
    <QuickLogDialog
      open={open}
      onOpenChange={onOpenChange}
      customerId={openQuickLogContext?.context?.customerId}
      opportunityId={openQuickLogContext?.context?.opportunityId}
    />
  )
}

function AuthenticatedLayout() {
  // Quick Log Dialog state
  const [quickLogOpen, setQuickLogOpen] = useState(false)

  // Enable Cmd+L keyboard shortcut for quick log
  const handleOpenQuickLog = useCallback(() => {
    setQuickLogOpen(true)
  }, [])
  useQuickLogShortcut(handleOpenQuickLog)

  // Fetch organization settings for global context
  const {
    data: settings,
    isLoading: isSettingsLoading,
    error: settingsError,
  } = useOrganizationSettingsQuery()

  return (
    <OrganizationSettingsProvider
      settings={settings}
      isLoading={isSettingsLoading}
      error={settingsError}
    >
      <OpenQuickLogProvider value={{ openQuickLog: handleOpenQuickLog }}>
        <ConfirmationProvider>
          <AppShell>
            <Outlet />

            {/* Global Quick Log Dialog - accessible via Cmd+L or Command Palette.
                Pre-fills customer/opportunity when on those pages.
                Uses GlobalQuickLogDialog so context is read from inside the provider. */}
            <GlobalQuickLogDialog
              open={quickLogOpen}
              onOpenChange={setQuickLogOpen}
            />

            {/* Global Confirmation Dialog - accessible from anywhere via useConfirmation hook */}
            <ConfirmationDialog />
          </AppShell>
        </ConfirmationProvider>
      </OpenQuickLogProvider>
    </OrganizationSettingsProvider>
  )
}
