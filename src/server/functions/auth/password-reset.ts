import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { checkPasswordResetRateLimit, RateLimitError } from '@/lib/auth/rate-limit';

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
      const supabase = createClient();
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${process.env.VITE_APP_URL}/update-password`,
      });

      if (error) {
        console.error('[requestPasswordReset] Error:', error);
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

      console.error('[requestPasswordReset] Unexpected error:', err);
      return {
        success: false,
        error: 'An unexpected error occurred. Please try again.',
      };
    }
  });
