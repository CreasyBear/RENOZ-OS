/**
 * Password Reset Hook
 *
 * TanStack Query hook for password reset requests.
 *
 * @see src/server/functions/auth/password-reset.ts
 */

import { useMutation } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import {
  requestPasswordReset,
  type PasswordResetResult,
} from '@/server/functions/auth/password-reset';

// ============================================================================
// TYPES
// ============================================================================

export interface RequestPasswordResetInput {
  email: string;
}

// ============================================================================
// HOOKS
// ============================================================================

/**
 * Request a password reset email.
 *
 * Returns success even if email doesn't exist (to prevent enumeration).
 * Rate-limited to prevent abuse.
 */
export function useRequestPasswordReset() {
  const requestPasswordResetFn = useServerFn(requestPasswordReset);

  return useMutation<PasswordResetResult, Error, RequestPasswordResetInput>({
    mutationFn: async (input) => {
      return await requestPasswordResetFn({ data: input });
    },
  });
}
