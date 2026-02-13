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

/** Form schema for quick log dialog (subset for UI) */
export const quickLogFormSchema = z.object({
  type: z.enum(['call', 'note', 'meeting']),
  notes: z.string().min(1, 'Please add some notes'),
  duration: z.number().min(0).optional(),
})

export type QuickLogInput = z.infer<typeof quickLogSchema>

// ============================================================================
// COMPONENT PROP TYPES
// ============================================================================

/**
 * Log type for quick log dialog
 */
export type LogType = "call" | "note" | "meeting"

/**
 * Props for QuickLogDialog component
 */
export interface QuickLogDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  customerId?: string
  opportunityId?: string
  customerName?: string
  opportunityName?: string
  /** Pre-select log type when opening (e.g. from Log dropdown: phone -> call) */
  defaultType?: LogType
  className?: string
  onSuccess?: () => void
}

/**
 * Props for QuickLogDialog presenter component
 */
export interface QuickLogDialogPresenterProps extends QuickLogDialogProps {
  /** @source useCreateQuickLog mutation in container */
  onSubmit: (values: QuickLogFormValues & { customerId?: string }) => Promise<boolean>
  /** @source useCreateQuickLog mutation state in container */
  isSubmitting: boolean
}

/**
 * Form values for quick log dialog
 */
export type QuickLogFormValues = z.infer<typeof quickLogSchema>

/**
 * Props for QuickLogButton component
 */
export interface QuickLogButtonProps {
  customerId?: string
  opportunityId?: string
  customerName?: string
  opportunityName?: string
  variant?: "default" | "outline" | "ghost" | "link"
  size?: "default" | "sm" | "lg" | "icon"
  className?: string
}
