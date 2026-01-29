/**
 * Supabase Browser Client
 *
 * Client-side Supabase instance for use in React components.
 * Uses @supabase/ssr for proper cookie-based session handling.
 *
 * @example
 * ```ts
 * import { createClient, supabase } from '~/lib/supabase/client'
 *
 * // Factory function (recommended for components)
 * const client = createClient()
 *
 * // Or use the singleton for convenience
 * const { data, error } = await supabase.auth.signInWithPassword({
 *   email: 'user@example.com',
 *   password: 'password'
 * })
 * ```
 */
import { createBrowserClient } from '@supabase/ssr'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl) {
  throw new Error('Missing VITE_SUPABASE_URL environment variable')
}

if (!supabaseAnonKey) {
  throw new Error('Missing VITE_SUPABASE_ANON_KEY environment variable')
}

/**
 * Create a Supabase browser client.
 * Uses @supabase/ssr for proper cookie-based session handling.
 */
export function createClient() {
  return createBrowserClient(supabaseUrl, supabaseAnonKey)
}

/**
 * Browser Supabase client singleton.
 * For backwards compatibility - prefer createClient() for new code.
 */
export const supabase = createClient()

/**
 * Get the current authenticated user from the browser session.
 * Returns null if not authenticated.
 */
export async function getCurrentUser() {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()
  if (error) {
    console.error('Error getting current user:', error.message)
    return null
  }
  return user
}

/**
 * Get the current session from the browser.
 * Returns null if no active session.
 */
export async function getSession() {
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession()
  if (error) {
    console.error('Error getting session:', error.message)
    return null
  }
  return session
}

/**
 * Subscribe to auth state changes.
 * Returns an unsubscribe function.
 *
 * @example
 * ```ts
 * const unsubscribe = onAuthStateChange((event, session) => {
 *   if (event === 'SIGNED_IN') {
 *     console.log('User signed in:', session?.user)
 *   }
 * })
 *
 * // Cleanup
 * unsubscribe()
 * ```
 */
export function onAuthStateChange(
  callback: (
    event: 'SIGNED_IN' | 'SIGNED_OUT' | 'TOKEN_REFRESHED' | 'USER_UPDATED' | 'PASSWORD_RECOVERY',
    session: Awaited<ReturnType<typeof supabase.auth.getSession>>['data']['session']
  ) => void
) {
  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange((event, session) => {
    callback(event as Parameters<typeof callback>[0], session)
  })

  return () => subscription.unsubscribe()
}
