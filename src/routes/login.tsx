import { LoginForm } from '~/components/login-form'
import { AuthLayout } from '@/components/auth/auth-layout'
import { AuthErrorBoundary } from '@/components/auth/auth-error-boundary'
import { createFileRoute, redirect } from '@tanstack/react-router'
import { supabase } from '~/lib/supabase/client'
import { withAuthRetry } from '~/lib/auth/route-auth'
import { sanitizeInternalRedirect } from '@/lib/auth/redirects'

export const Route = createFileRoute('/login')({
  ssr: false,
  validateSearch: (
    search: Record<string, unknown>
  ): { redirect?: string; reason?: string } => ({
    redirect: typeof search.redirect === 'string' ? search.redirect : undefined,
    reason: typeof search.reason === 'string' ? search.reason : undefined,
  }),
  beforeLoad: async ({ search }) => {
    // Auth failure sent us here - force signOut and show login (breaks redirect loop)
    if (search.reason === 'invalid_user' || search.reason === 'session_expired') {
      await supabase.auth.signOut()
      return
    }

    const user = await withAuthRetry(async () => {
      const {
        data: { user: authUser },
        error,
      } = await supabase.auth.getUser()
      if (error) throw error
      return authUser
    }, 1, 250).catch(() => null)

    if (user) {
      const redirectTarget = sanitizeInternalRedirect(search.redirect, {
        fallback: '/dashboard',
        disallowPaths: ['/login'],
      })
      throw redirect({ to: redirectTarget, replace: true })
    }
  },
  component: Login,
})

function Login() {
  return (
    <AuthErrorBoundary>
      <AuthLayout>
        <LoginForm />
      </AuthLayout>
    </AuthErrorBoundary>
  )
}
