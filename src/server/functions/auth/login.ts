'use server'

import { createServerFn } from '@tanstack/react-start';
import { getRequest } from '@tanstack/react-start/server';
import { createServerSupabase } from '@/lib/supabase/server';
import {
  checkLoginRateLimit,
  resetLoginRateLimit,
  RateLimitError,
} from '@/lib/auth/rate-limit';

export type LoginResult =
  | { error: true; message: string; retryAfter?: number }
  | undefined;

export const loginFn = createServerFn({ method: 'POST' })
  .inputValidator((d: { email: string; password: string }) => d)
  .handler(async ({ data }): Promise<LoginResult> => {
    const request = getRequest();
    
    // Rate limiting: Use email as identifier (more user-friendly than IP)
    // This prevents brute-force attacks on specific accounts
    const identifier = data.email.toLowerCase();
    
    try {
      await checkLoginRateLimit(identifier);
    } catch (err) {
      if (err instanceof RateLimitError) {
        return {
          error: true,
          message: err.message,
          retryAfter: err.retryAfter,
        };
      }
      throw err;
    }

    const supabase = createServerSupabase(request);
    const { error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    });

    if (error) {
      return {
        error: true,
        message: error.message,
      };
    }

    // Reset rate limit on successful login
    await resetLoginRateLimit(identifier);

    return undefined;
  });
