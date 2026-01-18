/**
 * Trigger.dev Client Configuration
 *
 * Sets up the Trigger.dev client for background job processing.
 * Jobs are triggered from Edge Functions via the Trigger.dev API.
 *
 * @see https://trigger.dev/docs
 */
import { TriggerClient } from '@trigger.dev/sdk'

// ============================================================================
// CLIENT CONFIGURATION
// ============================================================================

/**
 * Trigger.dev client instance
 *
 * Environment variables required:
 * - TRIGGER_API_KEY: Your Trigger.dev API key
 * - TRIGGER_API_URL: Trigger.dev API URL (optional, defaults to cloud)
 */
export const client = new TriggerClient({
  id: 'renoz-crm',
  apiKey: process.env.TRIGGER_API_KEY,
  apiUrl: process.env.TRIGGER_API_URL,
})

// ============================================================================
// EVENT DEFINITIONS
// ============================================================================

/**
 * Order events triggered from Edge Functions
 */
export const orderEvents = {
  created: 'order.created',
  confirmed: 'order.confirmed',
  shipped: 'order.shipped',
  delivered: 'order.delivered',
  cancelled: 'order.cancelled',
} as const

/**
 * Inventory events triggered from Edge Functions
 */
export const inventoryEvents = {
  lowStock: 'inventory.low_stock',
  outOfStock: 'inventory.out_of_stock',
  restocked: 'inventory.restocked',
} as const

/**
 * Pipeline events triggered from Edge Functions
 */
export const pipelineEvents = {
  stageChanged: 'pipeline.stage_changed',
  dealWon: 'pipeline.deal_won',
  dealLost: 'pipeline.deal_lost',
} as const

// ============================================================================
// EVENT PAYLOAD TYPES
// ============================================================================

export interface OrderCreatedPayload {
  orderId: string
  orderNumber: string
  organizationId: string
  customerId: string
  total: number
}

export interface OrderConfirmedPayload {
  orderId: string
  orderNumber: string
  customerId: string
  organizationId: string
  total: number
}

export interface OrderShippedPayload {
  orderId: string
  orderNumber: string
  customerId: string
  organizationId: string
  trackingNumber?: string
  carrier?: string
}

export interface LowStockPayload {
  productId: string
  locationId: string
  organizationId: string
  currentQuantity: number
  reorderPoint: number
  reorderQuantity: number
  isCritical: boolean
}

export interface PipelineStageChangedPayload {
  opportunityId: string
  opportunityName: string
  organizationId: string
  ownerId: string
  customerId: string
  oldStage: string
  newStage: string
  value: number
  probability: number
}

export interface DealWonPayload {
  opportunityId: string
  opportunityName: string
  organizationId: string
  customerId: string
  value: number
  ownerId: string
}

export interface DealLostPayload {
  opportunityId: string
  opportunityName: string
  organizationId: string
  customerId: string
  value: number
  reason?: string
}
