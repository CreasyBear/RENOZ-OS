/**
 * Session Utilities
 *
 * Shared utilities for session token extraction and management.
 * Used across server functions that need to identify the current session.
 */

import { getRequest } from '@tanstack/react-start/server';

/**
 * Extract the session token from the current request.
 * Checks Authorization header first, then session cookie.
 *
 * @param request - The request object (optional, will use getRequest() if not provided)
 * @returns The session token string, or null if not found
 */
export function extractSessionToken(request?: { headers: { get: (name: string) => string | null } }): string | null {
  const req = request ?? getRequest();

  try {
    // Check Authorization header first (Bearer token)
    const authHeader = req?.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }

    // Fall back to session cookie
    const cookies = req?.headers.get('cookie');
    if (cookies) {
      const sessionCookie = cookies.split(';').find((c: string) => c.trim().startsWith('session='));
      if (sessionCookie) {
        return sessionCookie.split('=')[1]?.trim() || null;
      }
    }
  } catch {
    // Intentionally swallow - return null on failure
  }

  return null;
}
