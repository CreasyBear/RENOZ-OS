'use server'

/**
 * Supabase Server Client
 *
 * Server-side Supabase instances for use in TanStack Start server functions.
 * Uses @supabase/ssr for proper cookie-based session handling.
 *
 * @example
 * ```ts
 * import { createClient, createServerSupabase, createAdminSupabase } from '~/lib/supabase/server'
 *
 * // In a server function - use for user-context operations
 * const supabase = createClient()
 * const { data: user } = await supabase.auth.getUser()
 *
 * // Or pass the request explicitly
 * const supabase = createServerSupabase(request)
 *
 * // Admin operations - bypasses RLS
 * const admin = createAdminSupabase()
 * const { data: allUsers } = await admin.from('users').select('*')
 * ```
 */
import { createServerClient, parseCookieHeader, serializeCookieHeader } from '@supabase/ssr'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

function getSupabaseConfig() {
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
  const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl) {
    throw new Error('Missing SUPABASE_URL or VITE_SUPABASE_URL environment variable')
  }

  if (!supabaseAnonKey) {
    throw new Error('Missing SUPABASE_ANON_KEY or VITE_SUPABASE_ANON_KEY environment variable')
  }

  return { supabaseUrl, supabaseAnonKey, supabaseServiceRoleKey }
}

/**
 * Create a Supabase server client with proper cookie handling.
 * Uses @supabase/ssr for SSR-compatible session management.
 *
 * @param request - Optional request object. If not provided, uses getRequest() from context.
 * @returns Supabase client configured for server use
 */
export function createServerSupabase(request?: Request) {
  const { supabaseUrl, supabaseAnonKey } = getSupabaseConfig()

  // Parse cookies from request using Supabase's utility
  const cookieHeader = request?.headers.get('Cookie') ?? ''
  const parsedCookies = parseCookieHeader(cookieHeader)

  // Filter out cookies with undefined values and ensure type safety
  const cookies = parsedCookies
    .filter((c): c is { name: string; value: string } => c.value !== undefined)

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookies
      },
      setAll(cookiesToSet) {
        // In server functions, we typically can't set cookies directly
        // The session refresh happens automatically via the browser client
        // This is pattern 3 (read-only) from the Supabase SSR docs
        // For full cookie setting support, you'd need middleware
        if (process.env.NODE_ENV === 'development' && cookiesToSet.length > 0) {
          console.debug(`[Supabase SSR] Cookie set attempted: ${cookiesToSet.map(c => c.name).join(', ')}`)
        }
      },
    },
  })
}

/**
 * Create a Supabase server client using getRequest() from TanStack Start context.
 * Convenience wrapper when you don't have the request object handy.
 *
 * @returns Supabase client configured for server use
 */
export async function createClient() {
  const { getRequest } = await import('@tanstack/react-start/server')
  const request = getRequest()
  return createServerSupabase(request)
}

/**
 * Create an admin Supabase client that bypasses RLS policies.
 * Uses the service role key - ONLY use for admin operations.
 *
 * WARNING: This client has full database access. Never expose to client-side
 * or use for user-initiated operations without proper authorization checks.
 *
 * @returns Supabase admin client
 * @throws Error if SUPABASE_SERVICE_ROLE_KEY is not set
 */
export function createAdminSupabase() {
  const { supabaseUrl, supabaseServiceRoleKey } = getSupabaseConfig()

  if (!supabaseServiceRoleKey) {
    throw new Error(
      'Missing SUPABASE_SERVICE_ROLE_KEY environment variable. ' +
        'Admin client requires service role key for privileged operations.'
    )
  }

  return createSupabaseClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  })
}

/**
 * Get the authenticated user from a request.
 * Returns null if not authenticated or token is invalid.
 *
 * @param request - The incoming request
 * @returns The authenticated user or null
 */
export async function getServerUser(request?: Request) {
  const supabase = request ? createServerSupabase(request) : await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error) {
    console.error('Error getting server user:', error.message)
    return null
  }

  return user
}

/**
 * Verify that a request is authenticated.
 * Throws an error if not authenticated.
 *
 * @param request - The incoming request
 * @returns The authenticated user
 * @throws Error if not authenticated
 */
export async function requireServerUser(request?: Request) {
  const user = await getServerUser(request)
  if (!user) {
    throw new Error('Unauthorized: No valid session')
  }
  return user
}

// Re-export the utilities for use in middleware if needed
export { parseCookieHeader, serializeCookieHeader }
