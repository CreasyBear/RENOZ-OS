/**
 * Scheduled Calls Schemas
 *
 * Validation schemas for scheduled call server functions.
 *
 * @see DOM-COMMS-004b
 */
import { z } from 'zod'
import type React from 'react'
import { cursorPaginationSchema } from '@/lib/db/pagination'

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

export const getScheduledCallsCursorSchema = cursorPaginationSchema.merge(
  z.object({
    assigneeId: z.string().uuid().optional(),
    customerId: z.string().uuid().optional(),
    status: z.enum(['pending', 'completed', 'cancelled', 'rescheduled']).optional(),
    fromDate: z.coerce.date().optional(),
    toDate: z.coerce.date().optional(),
  })
)

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

/** Form schema for call outcome dialog */
export const callOutcomeFormSchema = z.object({
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

/** Form schema for schedule call dialog */
export const scheduleCallFormSchema = z.object({
  scheduledAt: z.date({ message: 'Please select a date and time' }),
  purpose: z.enum([
    'quote_follow_up',
    'installation',
    'technical_support',
    'sales',
    'general',
    'other',
  ]),
  notes: z.string().optional(),
  enableReminder: z.boolean(),
  reminderMinutes: z.number(),
})

// ============================================================================
// INPUT TYPES (from Zod schemas)
// ============================================================================

export type ScheduleCallInput = z.infer<typeof scheduleCallSchema>
export type UpdateScheduledCallInput = z.infer<typeof updateScheduledCallSchema>
export type GetScheduledCallsInput = z.infer<typeof getScheduledCallsSchema>
export type GetScheduledCallByIdInput = z.infer<typeof getScheduledCallByIdSchema>
export type CancelScheduledCallInput = z.infer<typeof cancelScheduledCallSchema>
export type RescheduleCallInput = z.infer<typeof rescheduleCallSchema>
export type CompleteCallInput = z.infer<typeof completeCallSchema>

// ============================================================================
// OUTPUT TYPES (from Drizzle schema - what server functions return)
// ============================================================================

import type { ScheduledCall as DrizzleScheduledCall, ScheduledCallStatus as DrizzleScheduledCallStatus } from '../../../../drizzle/schema/communications/scheduled-calls'

/** Re-export status type for components */
export type ScheduledCallStatus = DrizzleScheduledCallStatus

/**
 * Scheduled call output type - matches what getScheduledCalls returns
 * Server functions return ScheduledCall rows directly from Drizzle
 */
export type ScheduledCall = DrizzleScheduledCall

/**
 * List scheduled calls result - matches what getScheduledCalls returns
 */
export interface ListScheduledCallsResult {
  items: ScheduledCall[]
  total: number
}

// ============================================================================
// COMPONENT PROP TYPES
// ============================================================================

/**
 * Props for ScheduledCallsList presenter component
 * All data is passed from the container route.
 */
export interface ScheduledCallsListProps {
  /** @source useScheduledCalls() in container */
  calls: ScheduledCall[]
  /** @source useScheduledCalls().isLoading in container */
  isLoading: boolean
  /** @source useState(statusFilter) in container */
  statusFilter: string
  /** @source setStatusFilter in container */
  onStatusFilterChange: (status: string) => void
  /** @source useState(selectedCallForOutcome) in container */
  selectedCallForOutcome: string | null
  /** @source setSelectedCallForOutcome in container */
  onSelectCallForOutcome: (callId: string | null) => void
  /** @source useCompleteCall handler in container */
  onComplete: (id: string, outcome: string, notes?: string) => Promise<void>
  /** @source useCancelCall handler in container */
  onCancel: (id: string) => Promise<void>
  /** @source useRescheduleCall handler in container */
  onReschedule: (id: string, newDate: Date) => Promise<void>
  /** @source useCompleteCall.isPending in container */
  isCompleting?: boolean
  /** @source useCancelCall.isPending in container */
  isCancelling?: boolean
  /** @source useRescheduleCall.isPending in container */
  isRescheduling?: boolean
  className?: string
}

/**
 * Props for UpcomingCallsWidget component
 */
export interface UpcomingCallsWidgetProps {
  userId?: string
  limit?: number
  className?: string
}

/**
 * Props for CallItem component within UpcomingCallsWidget
 */
export interface CallItemProps {
  call: ScheduledCall
  isOverdue: boolean
  onComplete: () => void
}

/**
 * Form values for schedule call dialog
 */
export interface ScheduleCallFormValues {
  scheduledAt: Date
  purpose: 'quote_follow_up' | 'installation' | 'technical_support' | 'sales' | 'general' | 'other'
  notes?: string
  enableReminder: boolean
  reminderMinutes: number
}

/**
 * Props for ScheduleCallDialog component
 */
export interface ScheduleCallDialogProps {
  customerId: string
  customerName?: string
  assigneeId?: string
  trigger?: React.ReactNode
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
  onSuccess?: (callId: string) => void
}

/**
 * Form values for call outcome dialog
 */
export interface CallOutcomeFormValues {
  outcome: 'answered' | 'no_answer' | 'voicemail' | 'busy' | 'wrong_number' | 'callback_requested' | 'completed_successfully'
  outcomeNotes?: string
}

/**
 * Props for CallOutcomeDialog component
 */
export interface CallOutcomeDialogProps {
  callId: string
  customerId?: string
  customerName?: string
  trigger?: React.ReactNode
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
  onSuccess?: () => void
}

/**
 * Props for ScheduledCallActionMenu component
 */
export interface ScheduledCallActionMenuProps {
  callId: string
  scheduledAt: Date
  onComplete?: () => void
  onReschedule?: () => void
  trigger?: React.ReactNode
}
