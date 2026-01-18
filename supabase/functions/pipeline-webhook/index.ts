/**
 * Pipeline Webhook Edge Function
 *
 * Handles opportunity stage change webhooks from database triggers.
 * Processes stage transitions for metrics, notifications, and integrations.
 *
 * Events handled:
 * - Stage changes: Update pipeline_metrics with conversion data
 * - Closed Won: Trigger Xero invoice sync
 * - Closed Lost: Log reason for analytics
 *
 * @see https://supabase.com/docs/guides/functions
 */
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0'

// ============================================================================
// TYPES
// ============================================================================

interface StageChangePayload {
  type: 'STAGE_CHANGE'
  table: string
  schema: string
  opportunity_id: string
  opportunity_name: string
  organization_id: string
  customer_id: string
  owner_id: string
  old_stage: string
  new_stage: string
  value: number
  probability: number
  close_date: string
  stage_transition_seconds: number
  is_won: boolean
  is_lost: boolean
  lost_reason: string | null
  changed_at: string
}

interface WebhookResponse {
  success: boolean
  message: string
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
// METRICS UPDATE
// ============================================================================

async function updatePipelineMetrics(
  supabase: ReturnType<typeof createClient>,
  payload: StageChangePayload
): Promise<boolean> {
  const {
    organization_id,
    old_stage,
    new_stage,
    value,
    stage_transition_seconds,
  } = payload

  try {
    // Record stage transition metric
    await supabase.from('pipeline_metrics').insert({
      organization_id,
      metric_type: 'stage_transition',
      from_stage: old_stage,
      to_stage: new_stage,
      value,
      duration_seconds: stage_transition_seconds,
      recorded_at: new Date().toISOString(),
    })

    // If closed, record conversion metric
    if (new_stage === 'closed_won' || new_stage === 'closed_lost') {
      await supabase.from('pipeline_metrics').insert({
        organization_id,
        metric_type: new_stage === 'closed_won' ? 'conversion_success' : 'conversion_failure',
        from_stage: old_stage,
        to_stage: new_stage,
        value,
        recorded_at: new Date().toISOString(),
      })
    }

    return true
  } catch (error) {
    console.error('Failed to update pipeline metrics:', error)
    return false
  }
}

// ============================================================================
// NOTIFICATIONS
// ============================================================================

async function notifySalesRep(
  supabase: ReturnType<typeof createClient>,
  payload: StageChangePayload
): Promise<boolean> {
  const {
    organization_id,
    owner_id,
    opportunity_name,
    old_stage,
    new_stage,
    value,
    is_won,
    is_lost,
  } = payload

  try {
    let title: string
    let message: string
    let priority: 'low' | 'medium' | 'high'

    if (is_won) {
      title = '🎉 Deal Won!'
      message = `Congratulations! "${opportunity_name}" ($${value.toLocaleString()}) has been closed won.`
      priority = 'high'
    } else if (is_lost) {
      title = 'Deal Lost'
      message = `"${opportunity_name}" ($${value.toLocaleString()}) has been marked as lost.`
      priority = 'medium'
    } else {
      title = 'Deal Stage Updated'
      message = `"${opportunity_name}" moved from ${old_stage} to ${new_stage}.`
      priority = 'low'
    }

    await supabase.from('notifications').insert({
      organization_id,
      user_id: owner_id,
      type: 'pipeline_update',
      title,
      message,
      priority,
      metadata: {
        opportunity_id: payload.opportunity_id,
        old_stage,
        new_stage,
        value,
      },
    })

    return true
  } catch (error) {
    console.error('Failed to create notification:', error)
    return false
  }
}

// ============================================================================
// XERO SYNC (for won deals)
// ============================================================================

async function triggerXeroSync(payload: StageChangePayload): Promise<boolean> {
  if (!TRIGGER_DEV_API_KEY) {
    console.warn('TRIGGER_DEV_API_KEY not configured - skipping Xero sync')
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
        name: 'pipeline.deal_won',
        payload: {
          opportunityId: payload.opportunity_id,
          opportunityName: payload.opportunity_name,
          organizationId: payload.organization_id,
          customerId: payload.customer_id,
          value: payload.value,
          ownerId: payload.owner_id,
        },
      }),
    })

    return response.ok
  } catch (error) {
    console.error('Failed to trigger Xero sync:', error)
    return false
  }
}

// ============================================================================
// ANALYTICS LOGGING (for lost deals)
// ============================================================================

async function logLostDealAnalytics(
  supabase: ReturnType<typeof createClient>,
  payload: StageChangePayload
): Promise<boolean> {
  try {
    await supabase.from('deal_analytics').insert({
      organization_id: payload.organization_id,
      opportunity_id: payload.opportunity_id,
      event_type: 'deal_lost',
      previous_stage: payload.old_stage,
      lost_reason: payload.lost_reason || 'Not specified',
      value: payload.value,
      owner_id: payload.owner_id,
      customer_id: payload.customer_id,
      recorded_at: new Date().toISOString(),
    })

    return true
  } catch (error) {
    console.error('Failed to log lost deal analytics:', error)
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
  let payload: StageChangePayload
  try {
    payload = await req.json()
  } catch {
    return errorResponse('INVALID_PAYLOAD', 'Invalid JSON payload')
  }

  // Validate payload type
  if (payload.type !== 'STAGE_CHANGE') {
    return errorResponse('INVALID_EVENT', `Unexpected event type: ${payload.type}`)
  }

  console.log(`Processing stage change for ${payload.opportunity_name}: ${payload.old_stage} -> ${payload.new_stage}`)

  const actions: WebhookResponse['actions'] = []

  try {
    const supabase = getSupabaseClient()

    // 1. Update pipeline metrics
    const metricsUpdated = await updatePipelineMetrics(supabase, payload)
    actions.push({
      action: 'update_metrics',
      status: metricsUpdated ? 'completed' : 'failed',
    })

    // 2. Notify sales rep
    const notified = await notifySalesRep(supabase, payload)
    actions.push({
      action: 'notify_owner',
      status: notified ? 'completed' : 'failed',
    })

    // 3. Handle closed won - trigger Xero sync
    if (payload.is_won) {
      const xeroTriggered = await triggerXeroSync(payload)
      actions.push({
        action: 'xero_sync',
        status: xeroTriggered ? 'completed' : 'failed',
        details: xeroTriggered ? 'Invoice creation queued' : 'Trigger.dev not configured',
      })
    }

    // 4. Handle closed lost - log analytics
    if (payload.is_lost) {
      const analyticsLogged = await logLostDealAnalytics(supabase, payload)
      actions.push({
        action: 'log_analytics',
        status: analyticsLogged ? 'completed' : 'failed',
        details: payload.lost_reason || 'No reason provided',
      })
    }

    const response: WebhookResponse = {
      success: true,
      message: `Processed stage change: ${payload.old_stage} -> ${payload.new_stage}`,
      actions,
    }

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Pipeline webhook processing error:', error)
    return errorResponse(
      'PROCESSING_FAILED',
      'Failed to process pipeline webhook',
      500,
      error instanceof Error ? error.message : 'Unknown error'
    )
  }
})
