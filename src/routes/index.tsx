/**
 * Root Index Route
 *
 * Sends the exact "/" route through /login.
 * Authenticated users can still bounce from /login to /dashboard client-side.
 *
 * Defensive: If Supabase redirects to /?code= (e.g. redirectTo didn't match allow list),
 * redirect to /update-password so PKCE exchange can complete. Code can be recovery,
 * signup, or magic link; update-password handles recovery. Signup/magic link users
 * would get wrong page if they hit this path - fix Supabase config to avoid.
 */
import { createFileRoute, redirect } from '@tanstack/react-router'
import { useEffect } from 'react'

export const Route = createFileRoute('/')({
  validateSearch: (search: Record<string, unknown>) => ({
    code: typeof search.code === 'string' ? search.code : undefined,
  }),
  beforeLoad: async ({ location, search }) => {
    // Defensive: Supabase may redirect to /?code= when redirectTo doesn't match allow list.
    // Client-only: avoid 307 loop when SSR path normalization makes /update-password look like /.
    if (typeof window !== 'undefined' && search.code) {
      throw redirect({ to: '/update-password', search: { code: search.code }, replace: true })
    }

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
    throw redirect({ to: '/login', replace: true })
  },
  component: RootIndexRedirect,
})

function RootIndexRedirect() {
  const search = Route.useSearch()

  useEffect(() => {
    const target = search.code
      ? `/update-password?code=${encodeURIComponent(search.code)}`
      : '/login'
    window.location.replace(target)
  }, [search.code])

  return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Redirecting...</div>
}
