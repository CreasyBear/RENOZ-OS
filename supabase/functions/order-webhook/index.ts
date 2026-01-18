/**
 * Order Webhook Edge Function
 *
 * Handles order webhook events from database triggers.
 * Processes order lifecycle events and triggers downstream actions.
 *
 * Events handled:
 * - INSERT: New order created → Queue PDF generation
 * - UPDATE (status=confirmed): Order confirmed → Send confirmation email
 * - UPDATE (status=shipped): Order shipped → Send shipping notification
 *
 * @see https://supabase.com/docs/guides/functions
 */
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import type {
  WebhookPayload,
  StatusChangePayload,
  WebhookResponse,
  ProcessedAction,
  WebhookError,
  OrderRecord,
  ErrorCode,
} from './types.ts'

// ============================================================================
// CONFIGURATION
// ============================================================================

const WEBHOOK_SECRET = Deno.env.get('WEBHOOK_SECRET') || ''
const TRIGGER_DEV_API_KEY = Deno.env.get('TRIGGER_DEV_API_KEY') || ''
const TRIGGER_DEV_URL = Deno.env.get('TRIGGER_DEV_URL') || 'https://api.trigger.dev'

// ============================================================================
// AUTHENTICATION
// ============================================================================

function verifyAuthorization(request: Request): boolean {
  const authHeader = request.headers.get('Authorization')
  if (!authHeader) return false

  // Support both "Bearer <token>" and raw token
  const token = authHeader.startsWith('Bearer ')
    ? authHeader.slice(7)
    : authHeader

  // In development, allow empty secret
  if (!WEBHOOK_SECRET) {
    console.warn('WEBHOOK_SECRET not configured - allowing all requests')
    return true
  }

  return token === WEBHOOK_SECRET
}

// ============================================================================
// ERROR RESPONSE HELPER
// ============================================================================

function errorResponse(
  code: ErrorCode,
  message: string,
  status: number = 400,
  details?: string
): Response {
  const error: WebhookError = { error: message, code, details }
  return new Response(JSON.stringify(error), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

// ============================================================================
// ACTION HANDLERS
// ============================================================================

/**
 * Queue PDF generation job to Trigger.dev
 */
async function queuePdfGeneration(order: OrderRecord): Promise<ProcessedAction> {
  console.log(`Queueing PDF generation for order ${order.order_number}`)

  // If Trigger.dev not configured, log and skip
  if (!TRIGGER_DEV_API_KEY) {
    console.warn('TRIGGER_DEV_API_KEY not configured - skipping PDF generation')
    return {
      action: 'pdf_generation',
      status: 'failed',
      details: 'Trigger.dev not configured',
    }
  }

  try {
    // Trigger the PDF generation job
    const response = await fetch(`${TRIGGER_DEV_URL}/api/v1/events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${TRIGGER_DEV_API_KEY}`,
      },
      body: JSON.stringify({
        name: 'order.created',
        payload: {
          orderId: order.id,
          orderNumber: order.order_number,
          organizationId: order.organization_id,
          customerId: order.customer_id,
          total: order.totals?.total,
        },
      }),
    })

    if (!response.ok) {
      throw new Error(`Trigger.dev responded with ${response.status}`)
    }

    return {
      action: 'pdf_generation',
      status: 'queued',
      details: `Queued for order ${order.order_number}`,
    }
  } catch (error) {
    console.error('Failed to queue PDF generation:', error)
    return {
      action: 'pdf_generation',
      status: 'failed',
      details: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Send confirmation email for confirmed orders
 */
async function sendConfirmationEmail(order: OrderRecord): Promise<ProcessedAction> {
  console.log(`Sending confirmation email for order ${order.order_number}`)

  if (!TRIGGER_DEV_API_KEY) {
    console.warn('TRIGGER_DEV_API_KEY not configured - skipping email')
    return {
      action: 'confirmation_email',
      status: 'failed',
      details: 'Trigger.dev not configured',
    }
  }

  try {
    const response = await fetch(`${TRIGGER_DEV_URL}/api/v1/events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${TRIGGER_DEV_API_KEY}`,
      },
      body: JSON.stringify({
        name: 'order.confirmed',
        payload: {
          orderId: order.id,
          orderNumber: order.order_number,
          customerId: order.customer_id,
          organizationId: order.organization_id,
          total: order.totals?.total,
        },
      }),
    })

    if (!response.ok) {
      throw new Error(`Trigger.dev responded with ${response.status}`)
    }

    return {
      action: 'confirmation_email',
      status: 'queued',
      details: `Email queued for order ${order.order_number}`,
    }
  } catch (error) {
    console.error('Failed to queue confirmation email:', error)
    return {
      action: 'confirmation_email',
      status: 'failed',
      details: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Send shipping notification for shipped orders
 */
async function sendShippingNotification(order: OrderRecord): Promise<ProcessedAction> {
  console.log(`Sending shipping notification for order ${order.order_number}`)

  if (!TRIGGER_DEV_API_KEY) {
    console.warn('TRIGGER_DEV_API_KEY not configured - skipping notification')
    return {
      action: 'shipping_notification',
      status: 'failed',
      details: 'Trigger.dev not configured',
    }
  }

  try {
    const response = await fetch(`${TRIGGER_DEV_URL}/api/v1/events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${TRIGGER_DEV_API_KEY}`,
      },
      body: JSON.stringify({
        name: 'order.shipped',
        payload: {
          orderId: order.id,
          orderNumber: order.order_number,
          customerId: order.customer_id,
          organizationId: order.organization_id,
        },
      }),
    })

    if (!response.ok) {
      throw new Error(`Trigger.dev responded with ${response.status}`)
    }

    return {
      action: 'shipping_notification',
      status: 'queued',
      details: `Notification queued for order ${order.order_number}`,
    }
  } catch (error) {
    console.error('Failed to queue shipping notification:', error)
    return {
      action: 'shipping_notification',
      status: 'failed',
      details: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

serve(async (req: Request) => {
  // Only accept POST requests
  if (req.method !== 'POST') {
    return errorResponse('INVALID_PAYLOAD', 'Method not allowed', 405)
  }

  // Verify authorization
  if (!verifyAuthorization(req)) {
    return errorResponse('UNAUTHORIZED', 'Invalid or missing authorization', 401)
  }

  // Parse webhook payload
  let payload: WebhookPayload | StatusChangePayload
  try {
    payload = await req.json()
  } catch {
    return errorResponse('INVALID_PAYLOAD', 'Invalid JSON payload')
  }

  // Validate payload has required fields
  if (!payload.type || !payload.table) {
    return errorResponse('INVALID_PAYLOAD', 'Missing required fields: type, table')
  }

  console.log(`Received ${payload.type} event for table ${payload.table}`)

  const actions: ProcessedAction[] = []

  try {
    // Handle different event types
    switch (payload.type) {
      case 'INSERT': {
        const webhookPayload = payload as WebhookPayload
        if (webhookPayload.record) {
          // New order created - queue PDF generation
          const pdfAction = await queuePdfGeneration(webhookPayload.record)
          actions.push(pdfAction)
        }
        break
      }

      case 'UPDATE': {
        const webhookPayload = payload as WebhookPayload
        if (!webhookPayload.record) break

        const newStatus = webhookPayload.record.status
        const oldStatus = webhookPayload.old_record?.status

        // Only process if status changed
        if (oldStatus !== newStatus) {
          // Order confirmed - send confirmation email
          if (newStatus === 'confirmed') {
            const emailAction = await sendConfirmationEmail(webhookPayload.record)
            actions.push(emailAction)
          }

          // Order shipped - send shipping notification
          if (newStatus === 'shipped') {
            const notifyAction = await sendShippingNotification(webhookPayload.record)
            actions.push(notifyAction)
          }
        }
        break
      }

      case 'STATUS_CHANGE': {
        // Direct status change event (from filtered trigger)
        const statusPayload = payload as StatusChangePayload

        if (statusPayload.new_status === 'confirmed') {
          // Create a minimal order record for the handlers
          const orderRecord: OrderRecord = {
            id: statusPayload.order_id,
            order_number: statusPayload.order_number,
            status: statusPayload.new_status,
            payment_status: statusPayload.payment_status,
            organization_id: statusPayload.organization_id,
            customer_id: statusPayload.customer_id,
            totals: { subtotal: 0, tax: 0, shipping: 0, discount: 0, total: statusPayload.total },
            created_at: '',
            updated_at: statusPayload.changed_at,
          }
          const emailAction = await sendConfirmationEmail(orderRecord)
          actions.push(emailAction)
        }

        if (statusPayload.new_status === 'shipped') {
          const orderRecord: OrderRecord = {
            id: statusPayload.order_id,
            order_number: statusPayload.order_number,
            status: statusPayload.new_status,
            payment_status: statusPayload.payment_status,
            organization_id: statusPayload.organization_id,
            customer_id: statusPayload.customer_id,
            totals: { subtotal: 0, tax: 0, shipping: 0, discount: 0, total: statusPayload.total },
            created_at: '',
            updated_at: statusPayload.changed_at,
          }
          const notifyAction = await sendShippingNotification(orderRecord)
          actions.push(notifyAction)
        }
        break
      }

      case 'DELETE':
        // No action needed for deletes currently
        console.log('Order deleted - no action required')
        break

      default:
        console.warn(`Unknown event type: ${payload.type}`)
    }

    const response: WebhookResponse = {
      success: true,
      message: `Processed ${payload.type} event`,
      actions,
    }

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Webhook processing error:', error)
    return errorResponse(
      'PROCESSING_FAILED',
      'Failed to process webhook',
      500,
      error instanceof Error ? error.message : 'Unknown error'
    )
  }
})
