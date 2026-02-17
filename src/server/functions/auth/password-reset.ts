'use server'

import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { checkPasswordResetRateLimit, RateLimitError } from '@/lib/auth/rate-limit';
import { authLogger } from '@/lib/logger';

const passwordResetInputSchema = z.object({
  email: z.string().email('Invalid email address'),
});

export interface PasswordResetResult {
  success: boolean;
  error?: string;
  retryAfter?: number;
}

/**
 * Check if password reset is allowed (rate limit only).
 * Returns { allowed: true } if OK. Client must then call supabase.auth.resetPasswordForEmail
 * from the browser so PKCE code verifier is stored for exchangeCodeForSession.
 */
export const checkPasswordResetAllowed = createServerFn({ method: 'POST' })
  .inputValidator(passwordResetInputSchema)
  .handler(async ({ data }): Promise<PasswordResetResult> => {
    const email = data.email.toLowerCase();

    try {
      await checkPasswordResetRateLimit(email);
      return { success: true };
    } catch (err) {
      if (err instanceof RateLimitError) {
        return {
          success: false,
          error: err.message,
          retryAfter: err.retryAfter,
        };
      }
      authLogger.error('[checkPasswordResetAllowed] Unexpected error', err as Error, {});
      return {
        success: false,
        error: 'An unexpected error occurred. Please try again.',
      };
    }
  });
