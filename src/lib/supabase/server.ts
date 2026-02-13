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
import { getRequest, setResponseHeaders } from '@tanstack/react-start/server'
import type { User } from '@supabase/supabase-js'
import { logger } from '@/lib/logger'

const SERVER_USER_CACHE_TTL_MS = 5_000
const MAX_SERVER_USER_CACHE_ENTRIES = 200

const serverUserCache = new Map<string, { user: User | null; cachedAt: number }>()
const serverUserInFlight = new Map<string, Promise<User | null>>()

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
export function createServerSupabase(request?: globalThis.Request) {
  const { supabaseUrl, supabaseAnonKey } = getSupabaseConfig()
  const activeRequest = request ?? getRequest()

  // Parse cookies from request using Supabase's utility
  const cookieHeader = activeRequest?.headers.get('Cookie') ?? ''
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
        if (cookiesToSet.length === 0) {
          return
        }

        const headers = new Headers()
        for (const { name, value, options } of cookiesToSet) {
          headers.append('Set-Cookie', serializeCookieHeader(name, value, options))
        }

        try {
          setResponseHeaders(headers)
        } catch (error) {
          if (process.env.NODE_ENV === 'development') {
            logger.warn('[Supabase SSR] Failed to write refreshed auth cookies', {
              cookieNames: cookiesToSet.map((c) => c.name),
              error: error instanceof Error ? error.message : String(error),
            })
          }
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
  return createServerSupabase()
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
export async function getServerUser(request?: globalThis.Request) {
  const key = getServerUserCacheKey(request)
  const now = Date.now()
  const cached = serverUserCache.get(key)
  if (cached && now - cached.cachedAt <= SERVER_USER_CACHE_TTL_MS) {
    return cached.user
  }

  const inFlight = serverUserInFlight.get(key)
  if (inFlight) {
    return inFlight
  }

  const resolveUser = (async () => {
    const supabase = request ? createServerSupabase(request) : await createClient()
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser()

    if (error) {
      logger.error('Error getting server user', error)
      writeServerUserCache(key, null)
      return null
    }

    writeServerUserCache(key, user)
    return user
  })()

  serverUserInFlight.set(key, resolveUser)
  try {
    return await resolveUser
  } finally {
    serverUserInFlight.delete(key)
  }
}

/**
 * Verify that a request is authenticated.
 * Throws an error if not authenticated.
 *
 * @param request - The incoming request
 * @returns The authenticated user
 * @throws Error if not authenticated
 */
export async function requireServerUser(request?: globalThis.Request) {
  const user = await getServerUser(request)
  if (!user) {
    throw new Error('Unauthorized: No valid session')
  }
  return user
}

function getServerUserCacheKey(request?: globalThis.Request) {
  if (!request) return '__default__'
  const cookieHeader = request.headers.get('Cookie') ?? ''
  const authHeader = request.headers.get('Authorization') ?? ''
  return `${cookieHeader}|${authHeader}`
}

function writeServerUserCache(key: string, user: User | null) {
  if (serverUserCache.size >= MAX_SERVER_USER_CACHE_ENTRIES) {
    serverUserCache.clear()
  }
  serverUserCache.set(key, { user, cachedAt: Date.now() })
}

// Re-export the utilities for use in middleware if needed
export { parseCookieHeader, serializeCookieHeader }
