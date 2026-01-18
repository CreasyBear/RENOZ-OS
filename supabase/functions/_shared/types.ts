/**
 * Shared Types for Edge Functions
 *
 * Common type definitions used across webhook handlers.
 */

// ============================================================================
// WEBHOOK TYPES
// ============================================================================

export type WebhookEventType =
  | 'INSERT'
  | 'UPDATE'
  | 'DELETE'
  | 'STATUS_CHANGE'
  | 'STAGE_CHANGE'
  | 'LOW_STOCK_ALERT'

export interface WebhookPayloadBase {
  type: WebhookEventType
  table: string
  schema: string
}

export interface DatabaseChangePayload<T = Record<string, unknown>> extends WebhookPayloadBase {
  record: T | null
  old_record: Partial<T> | null
}

// ============================================================================
// RESPONSE TYPES
// ============================================================================

export interface WebhookSuccessResponse {
  success: true
  message: string
  actions?: ProcessedAction[]
  [key: string]: unknown
}

export interface WebhookErrorResponse {
  success: false
  error: string
  code: ErrorCode
  details?: string
}

export type WebhookResponse = WebhookSuccessResponse | WebhookErrorResponse

export interface ProcessedAction {
  action: string
  status: 'queued' | 'completed' | 'skipped' | 'failed'
  details?: string
}

// ============================================================================
// ERROR TYPES
// ============================================================================

export type ErrorCode =
  | 'UNAUTHORIZED'
  | 'INVALID_PAYLOAD'
  | 'INVALID_EVENT'
  | 'INVALID_SIGNATURE'
  | 'EXPIRED_TIMESTAMP'
  | 'PROCESSING_FAILED'
  | 'METHOD_NOT_ALLOWED'
  | 'INTERNAL_ERROR'

export const ErrorMessages: Record<ErrorCode, string> = {
  UNAUTHORIZED: 'Invalid or missing authorization',
  INVALID_PAYLOAD: 'Invalid or malformed payload',
  INVALID_EVENT: 'Unsupported event type',
  INVALID_SIGNATURE: 'Webhook signature verification failed',
  EXPIRED_TIMESTAMP: 'Request timestamp expired (replay attack prevention)',
  PROCESSING_FAILED: 'Failed to process webhook',
  METHOD_NOT_ALLOWED: 'HTTP method not allowed',
  INTERNAL_ERROR: 'Internal server error',
}

// ============================================================================
// COMMON RECORD TYPES
// ============================================================================

export interface OrderRecord {
  id: string
  order_number: string
  status: string
  payment_status: string
  organization_id: string
  customer_id: string
  totals: {
    subtotal: number
    tax: number
    shipping: number
    discount: number
    total: number
  }
  created_at: string
  updated_at: string
}

export interface OpportunityRecord {
  id: string
  name: string
  stage: string
  value: number
  probability: number
  organization_id: string
  customer_id: string
  owner_id: string
  close_date: string
  lost_reason?: string
  created_at: string
  updated_at: string
}

export interface InventoryRecord {
  id: string
  product_id: string
  location_id: string
  organization_id: string
  quantity: number
  reserved_quantity: number
  reorder_point: number
  reorder_quantity: number
  updated_at: string
}
