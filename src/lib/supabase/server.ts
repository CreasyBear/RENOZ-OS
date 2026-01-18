/**
 * Supabase Server Client
 *
 * Server-side Supabase instances for use in TanStack Start server functions.
 * Provides both anon client (respects RLS) and admin client (bypasses RLS).
 *
 * @example
 * ```ts
 * import { createServerSupabase, createAdminSupabase } from '~/lib/supabase/server'
 *
 * // In a server function - use for user-context operations
 * const supabase = createServerSupabase(request)
 * const { data: user } = await supabase.auth.getUser()
 *
 * // Admin operations - bypasses RLS
 * const admin = createAdminSupabase()
 * const { data: allUsers } = await admin.from('users').select('*')
 * ```
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl) {
  throw new Error('Missing SUPABASE_URL or VITE_SUPABASE_URL environment variable')
}

if (!supabaseAnonKey) {
  throw new Error('Missing SUPABASE_ANON_KEY or VITE_SUPABASE_ANON_KEY environment variable')
}

/**
 * Create a Supabase client for server-side operations with user context.
 * Uses the anon key and respects RLS policies.
 *
 * @param request - Optional request object to extract auth token from cookies/headers
 * @returns Supabase client configured for server use
 */
export function createServerSupabase(request?: Request): SupabaseClient {
  let accessToken: string | null = null

  if (request) {
    // Try to get token from Authorization header
    const authHeader = request.headers.get('Authorization')
    if (authHeader?.startsWith('Bearer ')) {
      accessToken = authHeader.slice(7)
    }

    // Try to get token from cookies if no header
    if (!accessToken) {
      const cookieHeader = request.headers.get('Cookie')
      if (cookieHeader) {
        const cookies = parseCookies(cookieHeader)
        accessToken = cookies['sb-access-token'] || cookies['supabase-auth-token'] || null
      }
    }
  }

  return createClient(supabaseUrl!, supabaseAnonKey!, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: {
      headers: accessToken
        ? {
            Authorization: `Bearer ${accessToken}`,
          }
        : {},
    },
  })
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
export function createAdminSupabase(): SupabaseClient {
  if (!supabaseServiceRoleKey) {
    throw new Error(
      'Missing SUPABASE_SERVICE_ROLE_KEY environment variable. ' +
        'Admin client requires service role key for privileged operations.'
    )
  }

  return createClient(supabaseUrl!, supabaseServiceRoleKey, {
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
export async function getServerUser(request: Request) {
  const supabase = createServerSupabase(request)
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
export async function requireServerUser(request: Request) {
  const user = await getServerUser(request)
  if (!user) {
    throw new Error('Unauthorized: No valid session')
  }
  return user
}

/**
 * Parse cookies from a cookie header string.
 */
function parseCookies(cookieHeader: string): Record<string, string> {
  const cookies: Record<string, string> = {}
  const pairs = cookieHeader.split(';')

  for (const pair of pairs) {
    const [name, ...rest] = pair.trim().split('=')
    if (name && rest.length > 0) {
      cookies[name] = decodeURIComponent(rest.join('='))
    }
  }

  return cookies
}
