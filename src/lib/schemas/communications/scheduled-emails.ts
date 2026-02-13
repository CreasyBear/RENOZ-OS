/**
 * Scheduled Emails Schemas
 *
 * Validation schemas for scheduled email server functions.
 *
 * @see DOM-COMMS-002b
 */
import { z } from 'zod'
import { optionalEmailSchema, flexibleJsonSchema } from '../_shared/patterns'
import { cursorPaginationSchema } from '@/lib/db/pagination'

export const scheduleEmailSchema = z.object({
  recipientEmail: z.string().email(),
  recipientName: z.string().optional(),
  customerId: z.string().uuid().optional(),
  subject: z.string().min(1),
  templateType: z.enum([
    'welcome',
    'follow_up',
    'quote',
    'order_confirmation',
    'shipping_notification',
    'reminder',
    'custom',
  ]),
  templateData: flexibleJsonSchema.optional(),
  scheduledAt: z.coerce.date(),
  timezone: z.string().optional().default('UTC'),
})

export const updateScheduledEmailSchema = z.object({
  id: z.string().uuid(),
  recipientEmail: optionalEmailSchema,
  recipientName: z.string().optional(),
  subject: z.string().min(1).optional(),
  templateData: flexibleJsonSchema.optional(),
  scheduledAt: z.coerce.date().optional(),
  timezone: z.string().optional(),
})

export const cancelScheduledEmailSchema = z.object({
  id: z.string().uuid(),
  reason: z.string().optional(),
})

export const getScheduledEmailsSchema = z.object({
  status: z.enum(['pending', 'sent', 'cancelled']).optional(),
  customerId: z.string().uuid().optional(),
  search: z.string().optional(), // Empty string is valid (means no search)
  limit: z.number().min(1).max(100).default(50),
  offset: z.number().min(0).default(0),
})

export const getScheduledEmailsCursorSchema = cursorPaginationSchema.merge(
  z.object({
    status: z.enum(['pending', 'sent', 'cancelled']).optional(),
    customerId: z.string().uuid().optional(),
    search: z.string().optional(),
  })
)

export const getScheduledEmailByIdSchema = z.object({
  id: z.string().uuid(),
})

export const scheduledEmailsSearchSchema = z.object({
  search: z.string().optional().default(''),
  status: z.enum(['all', 'pending', 'sent', 'cancelled']).default('all'),
  customerId: z.string().uuid().optional(),
})

// ============================================================================
// INPUT TYPES (from Zod schemas)
// ============================================================================

export type ScheduleEmailInput = z.infer<typeof scheduleEmailSchema>
export type UpdateScheduledEmailInput = z.infer<typeof updateScheduledEmailSchema>
export type CancelScheduledEmailInput = z.infer<typeof cancelScheduledEmailSchema>
export type GetScheduledEmailsInput = z.infer<typeof getScheduledEmailsSchema>
export type GetScheduledEmailByIdInput = z.infer<typeof getScheduledEmailByIdSchema>
export type ScheduledEmailsSearch = z.infer<typeof scheduledEmailsSearchSchema>

// ============================================================================
// OUTPUT TYPES (from Drizzle schema - what server functions return)
// ============================================================================

import type {
  ScheduledEmail as DrizzleScheduledEmail,
  ScheduledEmailTemplateType,
  ScheduledEmailTemplateData as DrizzleScheduledEmailTemplateData,
} from '../../../../drizzle/schema/communications/scheduled-emails'

/**
 * Scheduled email output type - matches what getScheduledEmails returns
 * Server functions return ScheduledEmail rows directly from Drizzle
 */
export type ScheduledEmail = DrizzleScheduledEmail

/**
 * Scheduled email status type
 */
export type ScheduledEmailStatus = ScheduledEmail['status']

/**
 * Template type for scheduled emails
 */
export type TemplateType = ScheduledEmailTemplateType

/**
 * Template data structure for scheduled emails
 * Extends Drizzle type to include additional fields used in UI
 */
export interface ScheduledEmailTemplateData extends DrizzleScheduledEmailTemplateData {
  /** Custom body override (if not using template body) */
  bodyOverride?: string;
  /** Signature ID to attach */
  signatureId?: string;
  /** Signature content to attach */
  signatureContent?: string;
}

// ============================================================================
// COMPONENT PROP TYPES
// ============================================================================

/**
 * Props for ScheduledEmailsList presenter component
 * All data is passed from the container route.
 * Filters are handled by DomainFilterBar in the page component.
 */
export interface ScheduledEmailsListProps {
  items: ScheduledEmail[]
  total: number
  totalAll?: number
  isLoading?: boolean
  error?: Error | null
  onRefresh?: () => void
  isRefreshing?: boolean
  onCancel?: (id: string) => Promise<boolean>
  isCancelling?: boolean
  onEdit?: (emailId: string) => void
  onCompose?: () => void
  className?: string
}

/**
 * Props for ScheduleEmailDialog component
 */
export interface ScheduleEmailDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Pre-fill for editing an existing scheduled email */
  initialData?: Pick<ScheduledEmail, 'id' | 'recipientEmail' | 'recipientName' | 'subject' | 'templateType' | 'scheduledAt' | 'timezone'> & {
    templateData?: ScheduledEmailTemplateData
  }
  /** Pre-fill recipient for new email */
  defaultRecipient?: {
    email: string
    name?: string
    customerId?: string
  }
  /** Pre-fill customer context when recipient is not known */
  defaultCustomerId?: string
  /** Pre-fill template content for new email */
  defaultTemplate?: {
    subject?: string
    body?: string
    templateType?: TemplateType
  }
  /** Callback when user wants to create a new signature */
  onCreateSignature?: () => void
  onSuccess?: () => void
}
