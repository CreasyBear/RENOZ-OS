/**
 * Order Webhook Types
 *
 * TypeScript types for the order webhook Edge Function.
 */

// ============================================================================
// WEBHOOK PAYLOAD TYPES
// ============================================================================

export type WebhookEventType = 'INSERT' | 'UPDATE' | 'DELETE' | 'STATUS_CHANGE'

/**
 * Order record from the database
 */
export interface OrderRecord {
  id: string
  order_number: string
  status: OrderStatus
  payment_status: PaymentStatus
  organization_id: string
  customer_id: string
  totals: OrderTotals
  created_at: string
  updated_at: string
}

/**
 * Partial order record for old_record in updates
 */
export interface PartialOrderRecord {
  id: string
  status?: OrderStatus
  payment_status?: PaymentStatus
}

/**
 * Order totals stored as JSONB
 */
export interface OrderTotals {
  subtotal: number
  tax: number
  shipping: number
  discount: number
  total: number
}

/**
 * Order status enum values
 */
export type OrderStatus =
  | 'draft'
  | 'pending'
  | 'confirmed'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'cancelled'
  | 'refunded'

/**
 * Payment status enum values
 */
export type PaymentStatus =
  | 'pending'
  | 'authorized'
  | 'paid'
  | 'partially_refunded'
  | 'refunded'
  | 'failed'

// ============================================================================
// WEBHOOK REQUEST TYPES
// ============================================================================

/**
 * Standard webhook payload from database trigger
 */
export interface WebhookPayload {
  type: WebhookEventType
  table: string
  schema: string
  record: OrderRecord | null
  old_record: PartialOrderRecord | null
}

/**
 * Status change specific payload
 */
export interface StatusChangePayload {
  type: 'STATUS_CHANGE'
  table: string
  order_id: string
  order_number: string
  organization_id: string
  customer_id: string
  old_status: OrderStatus | null
  new_status: OrderStatus
  payment_status: PaymentStatus
  total: number
  changed_at: string
}

// ============================================================================
// RESPONSE TYPES
// ============================================================================

export interface WebhookResponse {
  success: boolean
  message: string
  actions?: ProcessedAction[]
}

export interface ProcessedAction {
  action: string
  status: 'queued' | 'completed' | 'failed'
  details?: string
}

// ============================================================================
// ERROR TYPES
// ============================================================================

export interface WebhookError {
  error: string
  code: string
  details?: string
}

export const ErrorCodes = {
  UNAUTHORIZED: 'UNAUTHORIZED',
  INVALID_PAYLOAD: 'INVALID_PAYLOAD',
  INVALID_EVENT: 'INVALID_EVENT',
  PROCESSING_FAILED: 'PROCESSING_FAILED',
} as const

export type ErrorCode = typeof ErrorCodes[keyof typeof ErrorCodes]
