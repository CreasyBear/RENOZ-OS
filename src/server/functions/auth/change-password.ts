'use server'

import { createServerFn } from '@tanstack/react-start'
import { authLogger } from '@/lib/logger'
import { getRequest } from '@tanstack/react-start/server'
import { z } from 'zod'
import { createServerSupabase } from '@/lib/supabase/server'

const changePasswordInputSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'Password must be at least 8 characters'),
})

export interface ChangePasswordResult {
  success: boolean
  error?: string
}

export const changePassword = createServerFn({ method: 'POST' })
  .inputValidator(changePasswordInputSchema)
  .handler(async ({ data }): Promise<ChangePasswordResult> => {
    try {
      const request = getRequest()
      const supabase = createServerSupabase(request)

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError || !user?.email) {
        return {
          success: false,
          error: 'Not authenticated',
        }
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: data.currentPassword,
      })

      if (signInError) {
        return {
          success: false,
          error: 'Current password is incorrect',
        }
      }

      const { error: updateError } = await supabase.auth.updateUser({
        password: data.newPassword,
      })

      if (updateError) {
        return {
          success: false,
          error: updateError.message || 'Failed to change password',
        }
      }

      return { success: true }
    } catch (error) {
      authLogger.error('[changePassword] Unexpected error', error)
      return {
        success: false,
        error: 'An unexpected error occurred. Please try again.',
      }
    }
  })
