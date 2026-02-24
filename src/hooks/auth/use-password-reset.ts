/**
 * Password Reset Hook
 *
 * TanStack Query hook for password reset requests.
 * Rate limit is checked server-side; resetPasswordForEmail is called from the
 * client so PKCE code verifier is stored in the browser for exchangeCodeForSession.
 *
 * @see src/server/functions/auth/password-reset.ts
 */

import { useMutation } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import {
  checkPasswordResetAllowed,
  type PasswordResetResult,
} from '@/server/functions/auth/password-reset';
import { authLogger } from '@/lib/logger';
import { supabase } from '@/lib/supabase/client';

// ============================================================================
// TYPES
// ============================================================================

export interface RequestPasswordResetInput {
  email: string;
}

function getUpdatePasswordUrl(): string {
  const configuredBase = (import.meta.env.VITE_APP_URL as string | undefined)?.trim();
  if (configuredBase) {
    return `${configuredBase.replace(/\/$/, '')}/update-password`;
  }

  // Production must use explicit app URL to avoid domain/allowlist mismatches.
  if (import.meta.env.PROD) {
    throw new Error('VITE_APP_URL is required in production for password reset redirects.');
  }

  const runtimeOrigin = typeof window !== 'undefined' ? window.location.origin : '';
  if (!runtimeOrigin) {
    throw new Error('Unable to resolve runtime origin for password reset redirect URL.');
  }
  return `${runtimeOrigin.replace(/\/$/, '')}/update-password`;
}

// ============================================================================
// HOOKS
// ============================================================================

/**
 * Request a password reset email.
 *
 * Returns success even if email doesn't exist (to prevent enumeration).
 * Rate-limited to prevent abuse.
 * Must call resetPasswordForEmail from client for PKCE flow (code verifier in browser).
 */
export function useRequestPasswordReset() {
  const checkAllowedFn = useServerFn(checkPasswordResetAllowed);

  return useMutation<PasswordResetResult, Error, RequestPasswordResetInput>({
    mutationFn: async (input) => {
      const result = await checkAllowedFn({ data: input });
      if (!result.success) {
        return result;
      }
      const normalizedEmail = input.email.trim().toLowerCase();

      let redirectTo: string;
      try {
        redirectTo = getUpdatePasswordUrl();
      } catch (error) {
        authLogger.error('Password reset redirect URL resolution failed', error, {
          redirectTo: 'unresolved',
        });
        throw new Error('Password reset is temporarily unavailable. Please try again shortly.');
      }

      const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
        redirectTo,
      });
      if (error) {
        // Keep user response generic to prevent account enumeration, but log for ops visibility.
        authLogger.error('Supabase resetPasswordForEmail failed', error, {
          redirectTo,
        });
      }
      return { success: true };
    },
  });
}
