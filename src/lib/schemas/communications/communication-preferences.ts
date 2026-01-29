/**
 * Communication Preferences Schemas
 *
 * Validation schemas for contact communication preferences.
 *
 * @see DOM-COMMS-005
 */
import { z } from 'zod'

export const updatePreferencesSchema = z.object({
  contactId: z.string().uuid(),
  emailOptIn: z.boolean().optional(),
  smsOptIn: z.boolean().optional(),
})

export const getPreferencesSchema = z.object({
  contactId: z.string().uuid(),
})

export const getPreferenceHistorySchema = z.object({
  contactId: z.string().uuid().optional(),
  customerId: z.string().uuid().optional(),
  limit: z.number().min(1).max(100).default(50),
  offset: z.number().min(0).default(0),
})

export type UpdatePreferencesInput = z.infer<typeof updatePreferencesSchema>
export type GetPreferencesInput = z.infer<typeof getPreferencesSchema>
export type GetPreferenceHistoryInput = z.infer<typeof getPreferenceHistorySchema>
