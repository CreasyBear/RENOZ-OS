import { Suspense } from 'react'
import { LoginForm } from '@/components/auth/login-form'
import { AuthLayout } from '@/components/auth/auth-layout'
import { AuthErrorBoundary } from '@/components/auth/auth-error-boundary'
import { createFileRoute, redirect } from '@tanstack/react-router'
import { supabase } from '@/lib/supabase/client'
import { getAuthContext, isRouterRedirect } from '@/lib/auth/route-auth'
import { getPostLoginTarget } from '@/lib/auth/route-policy'

export const Route = createFileRoute('/login')({
  ssr: false,
  validateSearch: (
    search: Record<string, unknown>
  ): { redirect?: string; reason?: string } => ({
    redirect: typeof search.redirect === 'string' ? search.redirect : undefined,
    reason: typeof search.reason === 'string' ? search.reason : undefined,
  }),
  beforeLoad: async ({ search, location }) => {
    // Invalid user should always clear any stale session.
    if (search.reason === 'invalid_user') {
      await supabase.auth.signOut()
      return
    }

    // For transient reasons, stay on login and show a prompt. Avoid forced signout loops.
    if (
      search.reason === 'session_expired' ||
      search.reason === 'offline' ||
      search.reason === 'auth_check_failed'
    ) {
      return
    }

    // Never redirect from /login on server - avoids 307 loops when SSR path normalization
    // misclassifies requests. Authenticated-user bounce happens client-side only.
    if (typeof window === 'undefined') {
      return
    }

    // Use getAuthContext (not getUser) so we only redirect when user is FULLY authenticated
    // (Supabase session + app user in users table, active). This prevents the loop:
    // login->dashboard (getUser says ok) -> login (_authenticated getAuthContext fails) -> repeat.
    try {
      await getAuthContext(location)
      const redirectTarget = getPostLoginTarget(search.redirect)
      throw redirect({ to: redirectTarget, replace: true })
    } catch (e) {
      if (isRouterRedirect(e)) {
        // Redirect to /login = not fully authenticated; stay on login (avoid self-redirect loop)
        return
      }
      throw e
    }
  },
  component: Login,
})

function Login() {
  return (
    <AuthErrorBoundary>
      <Suspense fallback={<div className="flex min-h-svh items-center justify-center text-muted-foreground">Loading...</div>}>
        <AuthLayout>
          <LoginForm />
        </AuthLayout>
      </Suspense>
    </AuthErrorBoundary>
  )
}
