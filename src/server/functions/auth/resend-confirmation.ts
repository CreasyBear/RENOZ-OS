/**
 * Resend Confirmation Email
 *
 * Public endpoint for resending signup confirmation emails.
 * Rate limited to prevent abuse. Does not reveal whether email exists (enumeration protection).
 *
 * @see src/server/functions/auth/password-reset.ts for pattern
 * @see src/lib/schemas/auth for validation schemas
 */

import { createServerFn } from '@tanstack/react-start';
import { getRequest } from '@tanstack/react-start/server';
import { createServerSupabase } from '@/lib/supabase/server';
import { checkResendConfirmationRateLimit, RateLimitError } from '@/lib/auth/rate-limit';
import { resendConfirmationSchema } from '@/lib/schemas/auth';
import { authLogger } from '@/lib/logger';

export interface ResendConfirmationResult {
  success: boolean;
  error?: string;
  retryAfter?: number;
}

export const resendConfirmationEmail = createServerFn({ method: 'POST' })
  .inputValidator(resendConfirmationSchema)
  .handler(async ({ data }): Promise<ResendConfirmationResult> => {
    const email = data.email.toLowerCase();

    try {
      await checkResendConfirmationRateLimit(email);

      const request = getRequest();
      const supabase = createServerSupabase(request);
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
      });

      if (error) {
        authLogger.error('[resendConfirmationEmail] Error', error);
        // Don't reveal if email exists or not - enumeration protection
      }

      return { success: true };
    } catch (err) {
      if (err instanceof RateLimitError) {
        return {
          success: false,
          error: err.message,
          retryAfter: err.retryAfter,
        };
      }

      authLogger.error('[resendConfirmationEmail] Unexpected error', err);
      return {
        success: false,
        error: 'An unexpected error occurred. Please try again.',
      };
    }
  });
