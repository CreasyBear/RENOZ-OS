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
import { supabase } from '@/lib/supabase/client';

// ============================================================================
// TYPES
// ============================================================================

export interface RequestPasswordResetInput {
  email: string;
}

function getUpdatePasswordUrl(): string {
  const base = import.meta.env.VITE_APP_URL || (typeof window !== 'undefined' ? window.location.origin : '');
  return `${base.replace(/\/$/, '')}/update-password`;
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
      const { error } = await supabase.auth.resetPasswordForEmail(input.email.trim().toLowerCase(), {
        redirectTo: getUpdatePasswordUrl(),
      });
      if (error) {
        // Don't reveal if email exists or not
      }
      return { success: true };
    },
  });
}
