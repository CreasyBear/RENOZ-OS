/**
 * Exchange Supabase redirect hash (access_token, refresh_token) for a session.
 *
 * When Supabase redirects after auth (invite, password reset, magic link),
 * it may append tokens to the URL hash (implicit flow). This hook parses the
 * hash, calls setSession, and removes the hash from the URL.
 *
 * Per Supabase docs:
 * - Success: hash contains access_token, refresh_token (and optionally type, expires_in)
 * - Failure: hash contains error, error_description (and optionally error_code)
 *
 * PKCE flow uses ?code= in query; exchangeCodeForSession handles that separately.
 *
 * @see https://supabase.com/docs/guides/auth/redirect-urls#error-handling
 * @see https://supabase.com/docs/guides/auth/sessions/implicit-flow
 */
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { authLogger } from '@/lib/logger';

export interface AuthHashError {
  code: string;
  description: string;
}

/**
 * Clears the URL hash without triggering navigation.
 */
function clearHashFromUrl(): void {
  if (typeof window === 'undefined') return;
  const url = new URL(window.location.href);
  if (url.hash) {
    url.hash = '';
    window.history.replaceState(null, '', url.toString());
  }
}

/**
 * Parses the URL hash for Supabase auth params.
 * Returns tokens on success, or error info on auth failure.
 */
function parseAuthHash(
  hash: string
): { kind: 'tokens'; access_token: string; refresh_token: string } | { kind: 'error'; code: string; description: string } | null {
  if (!hash || !hash.startsWith('#')) return null;
  const params = new URLSearchParams(hash.slice(1));

  // Supabase puts error details in the hash on auth failure
  const error = params.get('error');
  const errorDescription = params.get('error_description');
  const errorCode = params.get('error_code');
  if (error || errorDescription || errorCode) {
    return {
      kind: 'error',
      code: errorCode ?? error ?? 'auth_error',
      description: errorDescription ?? error ?? 'Authentication failed.',
    };
  }

  const access_token = params.get('access_token');
  const refresh_token = params.get('refresh_token');
  if (access_token && refresh_token) {
    return { kind: 'tokens', access_token, refresh_token };
  }

  return null;
}

/**
 * Hook that exchanges Supabase auth hash for a session.
 * Call on invite-accept and password-reset pages.
 *
 * @returns { authError } - Set when hash contained error params or setSession failed
 */
export function useExchangeHashForSession(): { authError: AuthHashError | null } {
  const [authError, setAuthError] = useState<AuthHashError | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const hash = window.location.hash;
    const parsed = parseAuthHash(hash);
    if (!parsed) return;

    if (parsed.kind === 'error') {
      authLogger.warn('[useExchangeHashForSession] Auth error in URL hash', {
        code: parsed.code,
        description: parsed.description,
      });
      clearHashFromUrl();
      setAuthError({ code: parsed.code, description: parsed.description });
      return;
    }

    void supabase.auth
      .setSession({ access_token: parsed.access_token, refresh_token: parsed.refresh_token })
      .then(() => {
        clearHashFromUrl();
      })
      .catch((err) => {
        authLogger.error('[useExchangeHashForSession] setSession failed', err as Error, {
          code: 'token_exchange_failed',
        });
        clearHashFromUrl();
        setAuthError({
          code: 'token_exchange_failed',
          description: err instanceof Error ? err.message : 'Failed to establish session.',
        });
      });
  }, []);

  return { authError };
}
