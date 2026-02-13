'use server'

import { createServerFn } from '@tanstack/react-start';
import { getRequest } from '@tanstack/react-start/server';
import { z } from 'zod';
import { createServerSupabase } from '@/lib/supabase/server';
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

// Server-side password reset with rate limiting
export const requestPasswordReset = createServerFn({ method: 'POST' })
  .inputValidator(passwordResetInputSchema)
  .handler(async ({ data }): Promise<PasswordResetResult> => {
    const email = data.email.toLowerCase();

    try {
      // Check rate limit
      await checkPasswordResetRateLimit(email);

      // Send password reset email
      const request = getRequest();
      const supabase = createServerSupabase(request);
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${process.env.VITE_APP_URL}/update-password`,
      });

      if (error) {
        authLogger.error('[requestPasswordReset] Error', new Error(error.message), {});
        // Don't reveal if email exists or not
      }

      // Always return success to prevent email enumeration
      return {
        success: true,
      };
    } catch (err) {
      if (err instanceof RateLimitError) {
        return {
          success: false,
          error: err.message,
          retryAfter: err.retryAfter,
        };
      }

      authLogger.error('[requestPasswordReset] Unexpected error', err as Error, {});
      return {
        success: false,
        error: 'An unexpected error occurred. Please try again.',
      };
    }
  });
