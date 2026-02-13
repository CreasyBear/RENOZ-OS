import { redirect } from '@tanstack/react-router'
import type { User, Session } from '@supabase/supabase-js'

type RouteLocation = {
  href?: string
  pathname?: string
}

type AppUserRecord = {
  id: string
  status: string
  organization_id: string
  role: string
  deleted_at: string | null
}

export type AuthRouteContext = {
  user: User
  appUser: {
    id: string
    organizationId: string
    role: string
    status: string
  }
}

type CachedAuthContext = AuthRouteContext & {
  validatedAt: number
}

export const AUTH_CACHE_TTL_MS = 30_000
const OFFLINE_CACHE_MAX_AGE_MS = 5 * 60_000

let authCache: CachedAuthContext | null = null
let authPromise: Promise<AuthRouteContext> | null = null
let listenerRegistered = false

function isRouterRedirect(error: unknown) {
  return !!error && typeof error === 'object' && 'to' in error
}

function toLoginRedirect(location?: RouteLocation, reason?: string) {
  // Only keep app-internal paths in redirect targets.
  const redirectTarget = location?.pathname
  return redirect({
    to: '/login',
    search: {
      redirect: reason ? undefined : redirectTarget,
      reason,
    },
  })
}

function delay(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

function getStatusCode(error: unknown): number | undefined {
  if (!error || typeof error !== 'object') return undefined
  const status = (error as { status?: unknown }).status
  return typeof status === 'number' ? status : undefined
}

export function isRetryableAuthError(error: unknown): boolean {
  const status = getStatusCode(error)
  if (status === 401 || status === 403) return false
  if (status && status >= 500) return true

  const message =
    error instanceof Error
      ? error.message.toLowerCase()
      : String((error as { message?: unknown })?.message ?? '').toLowerCase()

  if (!message) return true
  if (
    message.includes('invalid refresh token') ||
    message.includes('jwt') ||
    message.includes('unauthorized') ||
    message.includes('forbidden') ||
    message.includes('auth_user_missing') ||
    message.includes('app_user_missing') ||
    message.includes('user not active')
  ) {
    return false
  }
  if (
    message.includes('network') ||
    message.includes('fetch') ||
    message.includes('timeout') ||
    message.includes('econnreset') ||
    message.includes('failed to fetch') ||
    message.includes('authretryablefetcherror')
  ) {
    return true
  }

  return !status || status >= 500
}

export async function withAuthRetry<T>(
  fn: () => Promise<T>,
  maxAttempts = 2,
  baseDelayMs = 500
): Promise<T> {
  let attempt = 0
  let lastError: unknown

  while (attempt <= maxAttempts) {
    try {
      return await fn()
    } catch (error) {
      lastError = error
      if (!isRetryableAuthError(error) || attempt === maxAttempts) {
        throw error
      }
      await delay(baseDelayMs * 2 ** attempt)
      attempt += 1
    }
  }

  throw lastError
}

function mapAppUser(appUser: AppUserRecord): AuthRouteContext['appUser'] {
  return {
    id: appUser.id,
    organizationId: appUser.organization_id,
    role: appUser.role,
    status: appUser.status,
  }
}

function isSessionValid(session: Session | null) {
  if (!session?.user) return false
  if (!session.expires_at) return true
  return session.expires_at * 1000 > Date.now()
}

function isCacheFresh(validatedAt: number, ttlMs: number) {
  return Date.now() - validatedAt <= ttlMs
}

async function ensureAuthStateListener() {
  if (listenerRegistered || typeof window === 'undefined') return
  const { onAuthStateChange } = await import('~/lib/supabase/client')
  onAuthStateChange((event) => {
    if (event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED') {
      invalidateAuthCache()
    }
  })
  listenerRegistered = true
}

async function resolveAuthContext(location?: RouteLocation): Promise<AuthRouteContext> {
  const { supabase } = await import('~/lib/supabase/client')
  const isOnline = typeof navigator === 'undefined' ? true : navigator.onLine

  if (!isOnline) {
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
    if (sessionError || !isSessionValid(sessionData.session)) {
      throw toLoginRedirect(location, 'offline')
    }

    if (authCache && isCacheFresh(authCache.validatedAt, OFFLINE_CACHE_MAX_AGE_MS)) {
      return {
        user: authCache.user,
        appUser: authCache.appUser,
      }
    }

    throw toLoginRedirect(location, 'offline')
  }

  const user = await withAuthRetry(async () => {
    const {
      data: { user: authUser },
      error,
    } = await supabase.auth.getUser()
    if (error) throw error
    if (!authUser) throw new Error('AUTH_USER_MISSING')
    return authUser
  })

  const appUser = await withAuthRetry(async () => {
    const { data, error } = await supabase
      .from('users')
      .select('id, status, organization_id, role, deleted_at')
      .eq('auth_id', user.id)
      .is('deleted_at', null)
      .single()

    if (error) throw error
    if (!data) throw new Error('APP_USER_MISSING')
    return data as AppUserRecord
  })

  if (appUser.status !== 'active') {
    throw new Error('USER_NOT_ACTIVE')
  }

  return {
    user,
    appUser: mapAppUser(appUser),
  }
}

export function invalidateAuthCache() {
  authCache = null
  authPromise = null
}

export async function getAuthContext(location?: RouteLocation): Promise<AuthRouteContext> {
  await ensureAuthStateListener()

  if (authCache && isCacheFresh(authCache.validatedAt, AUTH_CACHE_TTL_MS)) {
    return {
      user: authCache.user,
      appUser: authCache.appUser,
    }
  }

  if (authPromise) {
    return authPromise
  }

  authPromise = resolveAuthContext(location)
    .then((ctx) => {
      authCache = {
        ...ctx,
        validatedAt: Date.now(),
      }
      return ctx
    })
    .catch(async (error) => {
      if (!isRetryableAuthError(error)) {
        const { supabase } = await import('~/lib/supabase/client')
        await supabase.auth.signOut()
      }

      if (isRouterRedirect(error)) {
        throw error
      }

      throw toLoginRedirect(location)
    })
    .finally(() => {
      authPromise = null
    })

  return authPromise
}
