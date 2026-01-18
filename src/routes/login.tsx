/**
 * Login Route
 *
 * Handles user authentication with email/password via Supabase Auth.
 * Supports both login and registration flows with inline error handling.
 */
import { createFileRoute, useNavigate, useSearch } from '@tanstack/react-router'
import { useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { loginSchema, registerSchema } from '@/lib/schemas/auth'
import { z } from 'zod'

// Search params for redirect after login
const loginSearchSchema = z.object({
  redirect: z.string().optional(),
  mode: z.enum(['login', 'register']).optional().default('login'),
})

export const Route = createFileRoute('/login')({
  validateSearch: loginSearchSchema,
  component: LoginPage,
})

type FormMode = 'login' | 'register'

interface FormErrors {
  email?: string
  password?: string
  confirmPassword?: string
  name?: string
  organizationName?: string
  general?: string
}

function LoginPage() {
  const navigate = useNavigate()
  const search = useSearch({ from: '/login' })

  const [mode, setMode] = useState<FormMode>(search.mode ?? 'login')
  const [isLoading, setIsLoading] = useState(false)
  const [errors, setErrors] = useState<FormErrors>({})
  const [failedAttempts, setFailedAttempts] = useState(0)

  // Form state
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [name, setName] = useState('')
  const [organizationName, setOrganizationName] = useState('')

  const isAccountLocked = failedAttempts >= 5

  const clearErrors = () => setErrors({})

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isAccountLocked) {
      setErrors({ general: 'Account locked. Please try again later or reset your password.' })
      return
    }

    clearErrors()
    setIsLoading(true)

    // Validate with Zod
    const validation = loginSchema.safeParse({ email, password })
    if (!validation.success) {
      const fieldErrors: FormErrors = {}
      validation.error.issues.forEach((err) => {
        const field = err.path[0] as keyof FormErrors
        fieldErrors[field] = err.message
      })
      setErrors(fieldErrors)
      setIsLoading(false)
      return
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: validation.data.email,
        password: validation.data.password,
      })

      if (error) {
        setFailedAttempts((prev) => prev + 1)

        // Check for rate limiting / account lockout
        if (error.message.includes('rate limit') || error.message.includes('locked')) {
          setErrors({ general: 'Account locked. Please try again later or reset your password.' })
        } else if (error.message.includes('Invalid login credentials')) {
          const remaining = 5 - (failedAttempts + 1)
          if (remaining > 0) {
            setErrors({ general: `Invalid email or password. ${remaining} attempt(s) remaining.` })
          } else {
            setErrors({ general: 'Account locked. Please try again later or reset your password.' })
          }
        } else {
          setErrors({ general: error.message })
        }
        setIsLoading(false)
        return
      }

      if (data.user) {
        // Reset failed attempts on successful login
        setFailedAttempts(0)
        // Redirect to dashboard or specified redirect URL
        const redirectTo = search.redirect ?? '/dashboard'
        navigate({ to: redirectTo })
      }
    } catch {
      setErrors({ general: 'An unexpected error occurred. Please try again.' })
    } finally {
      setIsLoading(false)
    }
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    clearErrors()
    setIsLoading(true)

    // Validate with Zod
    const validation = registerSchema.safeParse({
      email,
      password,
      confirmPassword,
      name,
      organizationName,
    })

    if (!validation.success) {
      const fieldErrors: FormErrors = {}
      validation.error.issues.forEach((err) => {
        const field = err.path[0] as keyof FormErrors
        fieldErrors[field] = err.message
      })
      setErrors(fieldErrors)
      setIsLoading(false)
      return
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email: validation.data.email,
        password: validation.data.password,
        options: {
          data: {
            name: validation.data.name,
            organization_name: validation.data.organizationName,
          },
        },
      })

      if (error) {
        if (error.message.includes('already registered')) {
          setErrors({ email: 'This email is already registered. Please log in instead.' })
        } else {
          setErrors({ general: error.message })
        }
        setIsLoading(false)
        return
      }

      if (data.user) {
        // If email confirmation is required, show message
        if (!data.session) {
          setErrors({
            general: 'Please check your email to confirm your account before logging in.',
          })
          setMode('login')
        } else {
          // Direct login if email confirmation is disabled
          const redirectTo = search.redirect ?? '/dashboard'
          navigate({ to: redirectTo })
        }
      }
    } catch {
      setErrors({ general: 'An unexpected error occurred. Please try again.' })
    } finally {
      setIsLoading(false)
    }
  }

  const switchMode = (newMode: FormMode) => {
    setMode(newMode)
    clearErrors()
    setPassword('')
    setConfirmPassword('')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            {mode === 'login' ? 'Sign in to your account' : 'Create your account'}
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            {mode === 'login' ? (
              <>
                Or{' '}
                <button
                  type="button"
                  onClick={() => switchMode('register')}
                  className="font-medium text-indigo-600 hover:text-indigo-500"
                >
                  create a new account
                </button>
              </>
            ) : (
              <>
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => switchMode('login')}
                  className="font-medium text-indigo-600 hover:text-indigo-500"
                >
                  Sign in
                </button>
              </>
            )}
          </p>
        </div>

        {errors.general && (
          <div
            className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative"
            role="alert"
          >
            <span className="block sm:inline">{errors.general}</span>
          </div>
        )}

        <form
          className="mt-8 space-y-6"
          onSubmit={mode === 'login' ? handleLogin : handleRegister}
        >
          <div className="rounded-md shadow-sm space-y-4">
            {mode === 'register' && (
              <>
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                    Full Name
                  </label>
                  <input
                    id="name"
                    name="name"
                    type="text"
                    autoComplete="name"
                    required={mode === 'register'}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className={`mt-1 appearance-none relative block w-full px-3 py-2 border ${
                      errors.name ? 'border-red-300' : 'border-gray-300'
                    } placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm`}
                    placeholder="John Doe"
                  />
                  {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
                </div>

                <div>
                  <label
                    htmlFor="organizationName"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Organization Name
                  </label>
                  <input
                    id="organizationName"
                    name="organizationName"
                    type="text"
                    required={mode === 'register'}
                    value={organizationName}
                    onChange={(e) => setOrganizationName(e.target.value)}
                    className={`mt-1 appearance-none relative block w-full px-3 py-2 border ${
                      errors.organizationName ? 'border-red-300' : 'border-gray-300'
                    } placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm`}
                    placeholder="Acme Inc."
                  />
                  {errors.organizationName && (
                    <p className="mt-1 text-sm text-red-600">{errors.organizationName}</p>
                  )}
                </div>
              </>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={`mt-1 appearance-none relative block w-full px-3 py-2 border ${
                  errors.email ? 'border-red-300' : 'border-gray-300'
                } placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm`}
                placeholder="you@example.com"
              />
              {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`mt-1 appearance-none relative block w-full px-3 py-2 border ${
                  errors.password ? 'border-red-300' : 'border-gray-300'
                } placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm`}
                placeholder="********"
              />
              {errors.password && <p className="mt-1 text-sm text-red-600">{errors.password}</p>}
            </div>

            {mode === 'register' && (
              <div>
                <label
                  htmlFor="confirmPassword"
                  className="block text-sm font-medium text-gray-700"
                >
                  Confirm Password
                </label>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  required={mode === 'register'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={`mt-1 appearance-none relative block w-full px-3 py-2 border ${
                    errors.confirmPassword ? 'border-red-300' : 'border-gray-300'
                  } placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm`}
                  placeholder="********"
                />
                {errors.confirmPassword && (
                  <p className="mt-1 text-sm text-red-600">{errors.confirmPassword}</p>
                )}
              </div>
            )}
          </div>

          {mode === 'login' && (
            <div className="flex items-center justify-end">
              <div className="text-sm">
                <a href="#" className="font-medium text-indigo-600 hover:text-indigo-500">
                  Forgot your password?
                </a>
              </div>
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={isLoading || isAccountLocked}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <span className="flex items-center">
                  <svg
                    className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
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
                  Processing...
                </span>
              ) : mode === 'login' ? (
                'Sign in'
              ) : (
                'Create account'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
