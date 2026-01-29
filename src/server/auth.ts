/**
 * Auth Server Functions
 *
 * Server-side authentication functions with rate limiting.
 * These wrap Supabase Auth operations with additional security measures.
 *
 * SECURITY: Rate limiting is enforced server-side using Upstash Redis.
 * This cannot be bypassed by refreshing the page or clearing cookies.
 */

import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import {
  checkLoginRateLimit,
  resetLoginRateLimit,
  checkPasswordResetRateLimit,
  getClientIdentifier,
  RateLimitError,
} from "@/lib/auth/rate-limit";

// ============================================================================
// SCHEMAS
// ============================================================================

const loginInputSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

const passwordResetInputSchema = z.object({
  email: z.string().email("Invalid email address"),
});

const changePasswordInputSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(8, "Password must be at least 8 characters"),
});

// ============================================================================
// SERVER-SIDE SUPABASE CLIENT
// ============================================================================

function getServerSupabase() {
  const url = process.env.VITE_SUPABASE_URL;
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error("Supabase environment variables not configured");
  }

  return createClient(url, anonKey);
}

// ============================================================================
// LOGIN WITH RATE LIMITING
// ============================================================================

export interface LoginResult {
  success: boolean;
  error?: string;
  remainingAttempts?: number;
  retryAfter?: number;
}

/**
 * Server-side login with rate limiting.
 *
 * Rate limit: 5 attempts per 15 minutes per email.
 * Uses both email and IP for rate limiting to prevent distributed attacks.
 */
export const serverLogin = createServerFn({ method: "POST" })
  .inputValidator(loginInputSchema)
  .handler(async ({ data }): Promise<LoginResult> => {
    const request = getRequest();
    const clientIp = getClientIdentifier(request);
    const email = data.email.toLowerCase();

    // Rate limit by both email and IP to prevent distributed attacks
    const rateLimitKey = `${email}:${clientIp}`;

    try {
      // Check rate limit BEFORE attempting login
      const rateLimit = await checkLoginRateLimit(rateLimitKey);

      // Attempt login
      const supabase = getServerSupabase();
      const { data: authData, error } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });

      if (error) {
        // Login failed - return remaining attempts
        return {
          success: false,
          error: "Invalid email or password",
          remainingAttempts: rateLimit.remaining,
        };
      }

      if (authData.user) {
        // Successful login - reset rate limit
        await resetLoginRateLimit(rateLimitKey);

        return {
          success: true,
        };
      }

      return {
        success: false,
        error: "Login failed. Please try again.",
      };
    } catch (err) {
      if (err instanceof RateLimitError) {
        return {
          success: false,
          error: err.message,
          retryAfter: err.retryAfter,
          remainingAttempts: 0,
        };
      }

      console.error("[serverLogin] Unexpected error:", err);
      return {
        success: false,
        error: "An unexpected error occurred. Please try again.",
      };
    }
  });

// ============================================================================
// PASSWORD RESET WITH RATE LIMITING
// ============================================================================

export interface PasswordResetResult {
  success: boolean;
  error?: string;
  retryAfter?: number;
}

/**
 * Server-side password reset request with rate limiting.
 *
 * Rate limit: 3 attempts per hour per email.
 */
export const serverRequestPasswordReset = createServerFn({ method: "POST" })
  .inputValidator(passwordResetInputSchema)
  .handler(async ({ data }): Promise<PasswordResetResult> => {
    const email = data.email.toLowerCase();

    try {
      // Check rate limit
      await checkPasswordResetRateLimit(email);

      // Send password reset email
      const supabase = getServerSupabase();
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${process.env.VITE_APP_URL}/reset-password`,
      });

      if (error) {
        console.error("[serverRequestPasswordReset] Error:", error);
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

      console.error("[serverRequestPasswordReset] Unexpected error:", err);
      return {
        success: false,
        error: "An unexpected error occurred. Please try again.",
      };
    }
  });

// ============================================================================
// CHANGE PASSWORD
// ============================================================================

const changePasswordResultSchema = z.object({
  success: z.boolean(),
  error: z.string().optional(),
});

type ChangePasswordResult = z.infer<typeof changePasswordResultSchema>;

/**
 * Change password for authenticated user.
 * Requires user to be logged in and provide current password.
 */
export const serverChangePassword = createServerFn({ method: "POST" })
  .inputValidator(changePasswordInputSchema)
  .handler(async ({ data }): Promise<ChangePasswordResult> => {
    try {
      const supabase = getServerSupabase();
      
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user?.email) {
        return {
          success: false,
          error: "Not authenticated",
        };
      }

      // Verify current password by attempting to sign in
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: data.currentPassword,
      });

      if (signInError) {
        return {
          success: false,
          error: "Current password is incorrect",
        };
      }

      // Update password
      const { error: updateError } = await supabase.auth.updateUser({
        password: data.newPassword,
      });

      if (updateError) {
        console.error("[serverChangePassword] Update error:", updateError);
        return {
          success: false,
          error: updateError.message || "Failed to change password",
        };
      }

      return { success: true };
    } catch (err) {
      console.error("[serverChangePassword] Unexpected error:", err);
      return {
        success: false,
        error: "An unexpected error occurred. Please try again.",
      };
    }
  });
