/**
 * Logout Route
 *
 * Handles session destruction via Supabase Auth.
 * Automatically signs out the user and redirects to login.
 */
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'

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
        navigate({ to: '/login' })
      } catch (err) {
        setError('An unexpected error occurred during logout.')
        setIsLoading(false)
      }
    }

    performLogout()
  }, [navigate])

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative">
            <strong className="font-bold">Logout Error</strong>
            <p className="block sm:inline"> {error}</p>
          </div>
          <div className="text-center">
            <button
              onClick={() => navigate({ to: '/login' })}
              className="font-medium text-indigo-600 hover:text-indigo-500"
            >
              Go to Login
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 text-center">
        {isLoading && (
          <>
            <svg
              className="animate-spin mx-auto h-12 w-12 text-indigo-600"
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
            <p className="text-gray-600">Signing you out...</p>
          </>
        )}
      </div>
    </div>
  )
}
