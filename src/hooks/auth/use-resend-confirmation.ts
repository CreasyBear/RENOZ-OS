/**
 * Resend Confirmation Email Hook
 *
 * TanStack Query hook for resending signup confirmation emails.
 * Mirrors use-password-reset pattern.
 *
 * @see src/server/functions/auth/resend-confirmation.ts
 * @see src/lib/schemas/auth for ResendConfirmationInput
 */

import { useMutation } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import {
  resendConfirmationEmail,
  type ResendConfirmationResult,
} from '@/server/functions/auth/resend-confirmation';
import type { ResendConfirmationInput } from '@/lib/schemas/auth';
import { formatResendConfirmationError } from './resend-confirmation-error-messages';

/**
 * Resend signup confirmation email.
 *
 * Returns success even if email doesn't exist (to prevent enumeration).
 * Rate-limited to prevent abuse.
 */
export function useResendConfirmationEmail() {
  const resendConfirmationFn = useServerFn(resendConfirmationEmail);

  return useMutation<ResendConfirmationResult, Error, ResendConfirmationInput>({
    mutationFn: async (input) => {
      const result = await resendConfirmationFn({ data: input }).catch((error) => {
        throw new Error(formatResendConfirmationError(error));
      });

      if (!result.success) {
        return {
          ...result,
          error: formatResendConfirmationError(result.error, result.retryAfter),
        };
      }

      return result;
    },
  });
}
