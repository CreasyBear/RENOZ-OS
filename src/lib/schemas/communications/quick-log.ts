/**
 * Quick Log Schemas
 *
 * Validation schemas for quick log server functions.
 *
 * @see COMMS-AUTO-003
 */
import { z } from 'zod'

export const quickLogSchema = z.object({
  type: z.enum(['call', 'note', 'meeting']),
  notes: z.string().min(1, 'Notes are required'),
  duration: z.number().min(0).optional(),
  customerId: z.string().uuid().optional().nullable(),
  opportunityId: z.string().uuid().optional().nullable(),
})

export type QuickLogInput = z.infer<typeof quickLogSchema>
