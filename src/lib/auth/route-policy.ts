/**
 * Auth Route Policy
 *
 * Single source of truth for redirect targets and loop-safe behavior.
 * All route guards and auth utilities must use these helpers to avoid
 * split-brain logic and redirect loops.
 */

import { redirect } from '@tanstack/react-router'
import { sanitizeInternalRedirect } from './redirects'

/** Paths that must never appear in redirect= query (prevents /login -> /login loops) */
export const DISALLOW_REDIRECT_PATHS = [
  '/login',
  '/sign-up',
  '/forgot-password',
  '/reset-password',
  '/update-password',
  '/auth/error',
] as const

const DEFAULT_POST_LOGIN = '/dashboard'

/**
 * Build safe search params for redirect to /login.
 * Never sets redirect=/login or other disallowed paths.
 */
export function getLoginRedirectSearch(
  pathname?: string,
  reason?: string
): { redirect?: string; reason?: string } {
  if (reason) {
    return { redirect: undefined, reason }
  }
  if (!pathname || pathname === '/' || pathname === '/login') {
    return { redirect: undefined }
  }
  const safe = sanitizeInternalRedirect(pathname, {
    fallback: DEFAULT_POST_LOGIN,
    disallowPaths: [...DISALLOW_REDIRECT_PATHS],
  })
  return { redirect: safe }
}

/**
 * Resolve safe post-login target from search.redirect.
 * Used by login route beforeLoad and login-form onSubmit.
 */
export function getPostLoginTarget(
  searchRedirect: unknown,
  options?: { fallback?: string }
): string {
  return sanitizeInternalRedirect(searchRedirect, {
    fallback: options?.fallback ?? DEFAULT_POST_LOGIN,
    disallowPaths: [...DISALLOW_REDIRECT_PATHS],
  })
}

/**
 * Create a redirect to /login with policy-safe search params.
 */
export function toLoginRedirect(pathname?: string, reason?: string) {
  const search = getLoginRedirectSearch(pathname, reason)
  return redirect({ to: '/login', search })
}
