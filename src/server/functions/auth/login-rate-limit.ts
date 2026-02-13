'use server'

import { createServerFn } from '@tanstack/react-start'
import { authLogger } from '@/lib/logger'
import { z } from 'zod'
import {
  checkLoginRateLimit,
  resetLoginRateLimit,
  RateLimitError,
} from '@/lib/auth/rate-limit'

const loginRateLimitInputSchema = z.object({
  email: z.string().email('Invalid email address'),
})

export interface LoginRateLimitResult {
  success: boolean
  error?: string
  retryAfter?: number
}

/**
 * Checks server-side login rate limit before password authentication.
 */
export const checkLoginAttempt = createServerFn({ method: 'POST' })
  .inputValidator(loginRateLimitInputSchema)
  .handler(async ({ data }): Promise<LoginRateLimitResult> => {
    const email = data.email.toLowerCase()

    try {
      await checkLoginRateLimit(email)
      return { success: true }
    } catch (error) {
      if (error instanceof RateLimitError) {
        return {
          success: false,
          error: error.message,
          retryAfter: error.retryAfter,
        }
      }

      authLogger.error('[checkLoginAttempt] Unexpected error', error)
      const failOpen = process.env.AUTH_RATE_LIMIT_FAIL_OPEN === 'true'
      if (!failOpen) {
        return {
          success: false,
          error: 'Unable to verify login attempts right now. Please try again shortly.',
        }
      }

      // Optional compatibility mode for infrastructure incidents.
      return {
        success: true,
      }
    }
  })

/**
 * Clears login rate-limit counters after successful authentication.
 */
export const clearLoginAttempt = createServerFn({ method: 'POST' })
  .inputValidator(loginRateLimitInputSchema)
  .handler(async ({ data }): Promise<void> => {
    await resetLoginRateLimit(data.email.toLowerCase())
  })
