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

// ============================================================================
// OUTPUT TYPES (from server functions)
// ============================================================================

/**
 * Contact preferences - matches what getContactPreferences returns
 */
export interface ContactPreferences {
  id: string
  firstName: string
  lastName: string
  email: string | null
  emailOptIn: boolean
  smsOptIn: boolean
  /** API returns ISO string; component accepts string | Date */
  emailOptInAt: Date | string | null
  smsOptInAt: Date | string | null
}

/**
 * Preference history item - matches what getPreferenceHistory returns
 */
export interface PreferenceHistoryItem {
  id: string
  description: string
  createdAt: Date | string
  /** Extended metadata for UI display (contactName, channel, newValue, changedAt) */
  metadata?: {
    contactName?: string
    channel?: string
    newValue?: boolean
    changedAt?: string
  } | null
}

/**
 * Preference history response - matches what getPreferenceHistory returns
 */
export interface PreferenceHistoryResponse {
  items: PreferenceHistoryItem[]
  total: number
}

// ============================================================================
// COMPONENT PROP TYPES
// ============================================================================

/**
 * Props for CommunicationPreferences component
 */
export interface CommunicationPreferencesProps {
  contactId: string
  contactName?: string
  className?: string
}

/**
 * Props for PreferenceHistory component
 */
export interface PreferenceHistoryProps {
  contactId?: string
  customerId?: string
  className?: string
}
