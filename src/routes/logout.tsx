/**
 * Logout Route
 *
 * Handles session destruction via Supabase Auth.
 * Automatically signs out the user and redirects to login.
 */
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { PageLayout } from '@/components/layout/page-layout'

export const Route = createFileRoute('/logout')({
  component: LogoutPage,
})

function LogoutPage() {
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const performLogout = async () => {
      try {
        const { error: signOutError } = await supabase.auth.signOut()

        if (signOutError) {
          setError(signOutError.message)
          setIsLoading(false)
          return
        }

        // Redirect to login page after successful logout
        navigate({ to: '/login', search: { redirect: undefined } })
      } catch (err) {
        setError('An unexpected error occurred during logout.')
        setIsLoading(false)
      }
    }

    performLogout()
  }, [navigate])

  if (error) {
    return (
      <PageLayout variant="narrow">
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="w-full space-y-8">
            <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded relative">
              <strong className="font-bold">Logout Error</strong>
              <p className="block sm:inline"> {error}</p>
            </div>
            <div className="text-center">
              <button
                onClick={() => navigate({ to: '/login', search: { redirect: undefined } })}
                className="font-medium text-primary hover:text-primary/80"
              >
                Go to Login
              </button>
            </div>
          </div>
        </div>
      </PageLayout>
    )
  }

  return (
    <PageLayout variant="narrow">
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="w-full space-y-8 text-center">
          {isLoading && (
            <>
              <svg
                className="animate-spin mx-auto h-12 w-12 text-primary"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              <p className="text-muted-foreground">Signing you out...</p>
            </>
          )}
        </div>
      </div>
    </PageLayout>
  )
}
