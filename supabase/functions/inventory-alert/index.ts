/**
 * Inventory Alert Edge Function
 *
 * Handles low stock alert webhooks from database triggers.
 * Creates notification records and optionally sends emails.
 *
 * Features:
 * - Duplicate prevention (checks if alert already sent for this item)
 * - Creates notification in notifications table
 * - Optionally emails operations team
 *
 * @see https://supabase.com/docs/guides/functions
 */
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0'

// ============================================================================
// TYPES
// ============================================================================

interface LowStockPayload {
  type: 'LOW_STOCK_ALERT'
  table: string
  schema: string
  inventory_id: string
  product_id: string
  location_id: string
  organization_id: string
  current_quantity: number
  reorder_point: number
  reorder_quantity: number
  previous_quantity: number
  deficit: number
  is_critical: boolean
  triggered_at: string
}

interface WebhookResponse {
  success: boolean
  message: string
  notification_id?: string
  actions?: {
    action: string
    status: 'completed' | 'skipped' | 'failed'
    details?: string
  }[]
}

interface WebhookError {
  error: string
  code: string
  details?: string
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || ''
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
const WEBHOOK_SECRET = Deno.env.get('WEBHOOK_SECRET') || ''
const TRIGGER_DEV_API_KEY = Deno.env.get('TRIGGER_DEV_API_KEY') || ''
const TRIGGER_DEV_URL = Deno.env.get('TRIGGER_DEV_URL') || 'https://api.trigger.dev'

// Alert deduplication window (don't send same alert within this period)
const DEDUP_WINDOW_HOURS = 24

// ============================================================================
// AUTHENTICATION
// ============================================================================

function verifyAuthorization(request: Request): boolean {
  const authHeader = request.headers.get('Authorization')
  if (!authHeader) return false

  const token = authHeader.startsWith('Bearer ')
    ? authHeader.slice(7)
    : authHeader

  if (!WEBHOOK_SECRET) {
    console.warn('WEBHOOK_SECRET not configured - allowing all requests')
    return true
  }

  return token === WEBHOOK_SECRET
}

function errorResponse(code: string, message: string, status = 400, details?: string): Response {
  const error: WebhookError = { error: message, code, details }
  return new Response(JSON.stringify(error), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

// ============================================================================
// SUPABASE CLIENT
// ============================================================================

function getSupabaseClient() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    throw new Error('Supabase credentials not configured')
  }
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
}

// ============================================================================
// ALERT DEDUPLICATION
// ============================================================================

async function hasRecentAlert(
  supabase: ReturnType<typeof createClient>,
  productId: string,
  locationId: string,
  organizationId: string
): Promise<boolean> {
  const cutoff = new Date()
  cutoff.setHours(cutoff.getHours() - DEDUP_WINDOW_HOURS)

  const { data, error } = await supabase
    .from('notifications')
    .select('id')
    .eq('organization_id', organizationId)
    .eq('type', 'inventory_alert')
    .eq('metadata->>product_id', productId)
    .eq('metadata->>location_id', locationId)
    .gte('created_at', cutoff.toISOString())
    .limit(1)

  if (error) {
    console.error('Error checking for recent alerts:', error)
    return false // Allow alert if we can't check
  }

  return data && data.length > 0
}

// ============================================================================
// CREATE NOTIFICATION
// ============================================================================

async function createNotification(
  supabase: ReturnType<typeof createClient>,
  payload: LowStockPayload
): Promise<string | null> {
  // Get product name for notification message
  const { data: product } = await supabase
    .from('products')
    .select('name, sku')
    .eq('id', payload.product_id)
    .single()

  const productName = product?.name || `Product ${payload.product_id.slice(0, 8)}`
  const productSku = product?.sku || ''

  const title = payload.is_critical
    ? `Critical: ${productName} out of stock`
    : `Low stock alert: ${productName}`

  const message = payload.is_critical
    ? `${productName}${productSku ? ` (${productSku})` : ''} is out of stock. Reorder ${payload.reorder_quantity} units immediately.`
    : `${productName}${productSku ? ` (${productSku})` : ''} has ${payload.current_quantity} units remaining (reorder point: ${payload.reorder_point}). Consider reordering ${payload.reorder_quantity} units.`

  const { data, error } = await supabase
    .from('notifications')
    .insert({
      organization_id: payload.organization_id,
      type: 'inventory_alert',
      title,
      message,
      priority: payload.is_critical ? 'high' : 'medium',
      metadata: {
        product_id: payload.product_id,
        location_id: payload.location_id,
        inventory_id: payload.inventory_id,
        current_quantity: payload.current_quantity,
        reorder_point: payload.reorder_point,
        reorder_quantity: payload.reorder_quantity,
        deficit: payload.deficit,
        is_critical: payload.is_critical,
      },
    })
    .select('id')
    .single()

  if (error) {
    console.error('Error creating notification:', error)
    return null
  }

  return data?.id || null
}

// ============================================================================
// QUEUE EMAIL (via Trigger.dev)
// ============================================================================

async function queueAlertEmail(payload: LowStockPayload): Promise<boolean> {
  if (!TRIGGER_DEV_API_KEY) {
    console.warn('TRIGGER_DEV_API_KEY not configured - skipping email')
    return false
  }

  try {
    const response = await fetch(`${TRIGGER_DEV_URL}/api/v1/events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${TRIGGER_DEV_API_KEY}`,
      },
      body: JSON.stringify({
        name: 'inventory.low_stock',
        payload: {
          productId: payload.product_id,
          locationId: payload.location_id,
          organizationId: payload.organization_id,
          currentQuantity: payload.current_quantity,
          reorderPoint: payload.reorder_point,
          reorderQuantity: payload.reorder_quantity,
          isCritical: payload.is_critical,
        },
      }),
    })

    return response.ok
  } catch (error) {
    console.error('Failed to queue alert email:', error)
    return false
  }
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

serve(async (req: Request) => {
  // Only accept POST requests
  if (req.method !== 'POST') {
    return errorResponse('METHOD_NOT_ALLOWED', 'Method not allowed', 405)
  }

  // Verify authorization
  if (!verifyAuthorization(req)) {
    return errorResponse('UNAUTHORIZED', 'Invalid or missing authorization', 401)
  }

  // Parse webhook payload
  let payload: LowStockPayload
  try {
    payload = await req.json()
  } catch {
    return errorResponse('INVALID_PAYLOAD', 'Invalid JSON payload')
  }

  // Validate payload type
  if (payload.type !== 'LOW_STOCK_ALERT') {
    return errorResponse('INVALID_EVENT', `Unexpected event type: ${payload.type}`)
  }

  console.log(`Processing low stock alert for product ${payload.product_id}`)

  const actions: WebhookResponse['actions'] = []

  try {
    const supabase = getSupabaseClient()

    // Check for duplicate alert
    const hasRecent = await hasRecentAlert(
      supabase,
      payload.product_id,
      payload.location_id,
      payload.organization_id
    )

    if (hasRecent) {
      console.log(`Skipping duplicate alert for product ${payload.product_id}`)
      return new Response(JSON.stringify({
        success: true,
        message: 'Alert skipped - duplicate within dedup window',
        actions: [{
          action: 'create_notification',
          status: 'skipped',
          details: `Alert already sent within ${DEDUP_WINDOW_HOURS} hours`,
        }],
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Create notification
    const notificationId = await createNotification(supabase, payload)

    if (notificationId) {
      actions.push({
        action: 'create_notification',
        status: 'completed',
        details: `Notification ${notificationId} created`,
      })
    } else {
      actions.push({
        action: 'create_notification',
        status: 'failed',
        details: 'Failed to create notification record',
      })
    }

    // Queue email for critical alerts
    if (payload.is_critical) {
      const emailQueued = await queueAlertEmail(payload)
      actions.push({
        action: 'queue_email',
        status: emailQueued ? 'completed' : 'failed',
        details: emailQueued ? 'Email queued via Trigger.dev' : 'Failed to queue email',
      })
    }

    const response: WebhookResponse = {
      success: true,
      message: `Processed low stock alert for product ${payload.product_id}`,
      notification_id: notificationId || undefined,
      actions,
    }

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Inventory alert processing error:', error)
    return errorResponse(
      'PROCESSING_FAILED',
      'Failed to process inventory alert',
      500,
      error instanceof Error ? error.message : 'Unknown error'
    )
  }
})
