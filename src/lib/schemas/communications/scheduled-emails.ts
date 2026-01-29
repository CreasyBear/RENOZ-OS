/**
 * Scheduled Emails Schemas
 *
 * Validation schemas for scheduled email server functions.
 *
 * @see DOM-COMMS-002b
 */
import { z } from 'zod'
import { optionalEmailSchema } from '../_shared/patterns'

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
  templateData: z.record(z.string(), z.unknown()).optional(),
  scheduledAt: z.coerce.date(),
  timezone: z.string().optional().default('UTC'),
})

export const updateScheduledEmailSchema = z.object({
  id: z.string().uuid(),
  recipientEmail: optionalEmailSchema,
  recipientName: z.string().optional(),
  subject: z.string().min(1).optional(),
  templateData: z.record(z.string(), z.unknown()).optional(),
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
  limit: z.number().min(1).max(100).default(50),
  offset: z.number().min(0).default(0),
})

export const getScheduledEmailByIdSchema = z.object({
  id: z.string().uuid(),
})

export type ScheduleEmailInput = z.infer<typeof scheduleEmailSchema>
export type UpdateScheduledEmailInput = z.infer<typeof updateScheduledEmailSchema>
export type CancelScheduledEmailInput = z.infer<typeof cancelScheduledEmailSchema>
export type GetScheduledEmailsInput = z.infer<typeof getScheduledEmailsSchema>
export type GetScheduledEmailByIdInput = z.infer<typeof getScheduledEmailByIdSchema>
