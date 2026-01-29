/**
 * Scheduled Calls Schemas
 *
 * Validation schemas for scheduled call server functions.
 *
 * @see DOM-COMMS-004b
 */
import { z } from 'zod'

export const scheduleCallSchema = z.object({
  customerId: z.string().uuid(),
  assigneeId: z.string().uuid().optional(),
  scheduledAt: z.coerce.date(),
  reminderAt: z.coerce.date().optional(),
  purpose: z
    .enum([
      'quote_follow_up',
      'installation',
      'technical_support',
      'sales',
      'general',
      'other',
    ])
    .default('general'),
  notes: z.string().optional(),
})

export const updateScheduledCallSchema = z.object({
  id: z.string().uuid(),
  scheduledAt: z.coerce.date().optional(),
  reminderAt: z.coerce.date().optional(),
  purpose: z
    .enum([
      'quote_follow_up',
      'installation',
      'technical_support',
      'sales',
      'general',
      'other',
    ])
    .optional(),
  notes: z.string().optional(),
  assigneeId: z.string().uuid().optional(),
})

export const getScheduledCallsSchema = z.object({
  assigneeId: z.string().uuid().optional(),
  customerId: z.string().uuid().optional(),
  status: z.enum(['pending', 'completed', 'cancelled', 'rescheduled']).optional(),
  fromDate: z.coerce.date().optional(),
  toDate: z.coerce.date().optional(),
  limit: z.number().min(1).max(100).default(50),
  offset: z.number().min(0).default(0),
})

export const getScheduledCallByIdSchema = z.object({
  id: z.string().uuid(),
})

export const cancelScheduledCallSchema = z.object({
  id: z.string().uuid(),
  reason: z.string().optional(),
})

export const rescheduleCallSchema = z.object({
  id: z.string().uuid(),
  newScheduledAt: z.coerce.date(),
  reminderAt: z.coerce.date().optional(),
  notes: z.string().optional(),
})

export const completeCallSchema = z.object({
  id: z.string().uuid(),
  outcome: z.enum([
    'answered',
    'no_answer',
    'voicemail',
    'busy',
    'wrong_number',
    'callback_requested',
    'completed_successfully',
  ]),
  outcomeNotes: z.string().optional(),
})

export type ScheduleCallInput = z.infer<typeof scheduleCallSchema>
export type UpdateScheduledCallInput = z.infer<typeof updateScheduledCallSchema>
export type GetScheduledCallsInput = z.infer<typeof getScheduledCallsSchema>
export type GetScheduledCallByIdInput = z.infer<typeof getScheduledCallByIdSchema>
export type CancelScheduledCallInput = z.infer<typeof cancelScheduledCallSchema>
export type RescheduleCallInput = z.infer<typeof rescheduleCallSchema>
export type CompleteCallInput = z.infer<typeof completeCallSchema>
