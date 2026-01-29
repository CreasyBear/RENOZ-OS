'use server'

/**
 * Resend Webhook Endpoint
 *
 * POST /api/webhooks/resend
 *
 * Receives webhook events from Resend for email delivery tracking.
 * Verifies SVIX signature and dispatches to Trigger.dev for async processing.
 *
 * Security Requirements (INT-RES-001):
 * - SVIX signature verification using resend.webhooks.verify()
 * - Rate limiting: 100 requests/minute
 * - Returns 401 on invalid signature
 * - Returns 429 on rate limit exceeded
 *
 * @see _Initiation/_prd/3-integrations/resend/resend.prd.json
 */

import { Resend } from 'resend';
import {
  checkRateLimitSync,
  getClientIdentifier,
  type RateLimitOptions,
} from '@/lib/server/rate-limit';
import { client } from '@/trigger/client';

// ============================================================================
// CONFIGURATION
// ============================================================================

/**
 * Rate limit configuration for webhook endpoint
 * 100 requests per minute as per SEC-003
 */
const WEBHOOK_RATE_LIMIT: RateLimitOptions = {
  maxRequests: 100,
  windowMs: 60 * 1000, // 1 minute
  message: 'Too many webhook requests. Please try again later.',
};

/**
 * Resend webhook event for Trigger.dev processing
 */
export const resendWebhookEvent = 'resend.webhook.received' as const;

// ============================================================================
// TYPES
// ============================================================================

/**
 * Resend webhook event types
 * @see https://resend.com/docs/dashboard/webhooks/event-types
 */
export type ResendWebhookEventType =
  | 'email.sent'
  | 'email.delivered'
  | 'email.opened'
  | 'email.clicked'
  | 'email.bounced'
  | 'email.complained';

/**
 * Base webhook event structure from Resend
 */
export interface ResendWebhookEvent {
  type: ResendWebhookEventType;
  created_at: string;
  data: {
    email_id: string;
    from: string;
    to: string[];
    subject?: string;
    created_at?: string;
    // Bounce-specific fields
    bounce?: {
      type: 'Permanent' | 'Transient';
      message: string;
    };
    // Click-specific fields
    click?: {
      link: string;
      timestamp: string;
    };
  };
}

/**
 * Payload sent to Trigger.dev for async processing
 */
export interface ResendWebhookPayload {
  event: ResendWebhookEvent;
  receivedAt: string;
}

// ============================================================================
// WEBHOOK HANDLER
// ============================================================================

export async function POST({ request }: { request: Request }) {
  const startTime = performance.now();

  // -------------------------------------------------------------------------
  // Step 1: Check rate limit
  // -------------------------------------------------------------------------
  const clientId = getClientIdentifier(request);
  const rateLimitResult = checkRateLimitSync('resend-webhook', clientId, WEBHOOK_RATE_LIMIT);

  if (!rateLimitResult.allowed) {
    const retryAfterSeconds = Math.ceil(rateLimitResult.retryAfterMs / 1000);

    console.warn('[resend-webhook] Rate limit exceeded', {
      clientId: clientId.substring(0, 8) + '...',
      retryAfterSeconds,
    });

    return new Response(
      JSON.stringify({ error: 'Too many requests' }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': String(retryAfterSeconds),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': rateLimitResult.resetAt.toISOString(),
        },
      }
    );
  }

  // -------------------------------------------------------------------------
  // Step 2: Validate environment configuration
  // -------------------------------------------------------------------------
  const webhookSecret = process.env.RESEND_WEBHOOK_SECRET;
  const resendApiKey = process.env.RESEND_API_KEY;

  if (!webhookSecret) {
    console.error('[resend-webhook] RESEND_WEBHOOK_SECRET not configured');
    // Return 500 to indicate server misconfiguration (don't expose details)
    return new Response(
      JSON.stringify({ error: 'Webhook not configured' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  if (!resendApiKey) {
    console.error('[resend-webhook] RESEND_API_KEY not configured');
    return new Response(
      JSON.stringify({ error: 'Webhook not configured' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  // -------------------------------------------------------------------------
  // Step 3: Get raw body and headers for signature verification
  // CRITICAL: Must use raw text body, not parsed JSON
  // -------------------------------------------------------------------------
  const rawBody = await request.text();

  const svixId = request.headers.get('svix-id') ?? '';
  const svixTimestamp = request.headers.get('svix-timestamp') ?? '';
  const svixSignature = request.headers.get('svix-signature') ?? '';

  // Check required headers are present
  if (!svixId || !svixTimestamp || !svixSignature) {
    console.warn('[resend-webhook] Missing SVIX headers', {
      hasSvixId: Boolean(svixId),
      hasSvixTimestamp: Boolean(svixTimestamp),
      hasSvixSignature: Boolean(svixSignature),
    });

    return new Response(
      JSON.stringify({ error: 'Missing signature headers' }),
      {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  // -------------------------------------------------------------------------
  // Step 4: Verify SVIX signature
  // -------------------------------------------------------------------------
  const resend = new Resend(resendApiKey);

  let event: ResendWebhookEvent;

  try {
    // Use the Resend SDK's built-in verification which handles timing-safe comparison
    event = resend.webhooks.verify({
      payload: rawBody,
      headers: {
        id: svixId,
        timestamp: svixTimestamp,
        signature: svixSignature,
      },
      webhookSecret,
    }) as ResendWebhookEvent;
  } catch (error) {
    console.warn('[resend-webhook] Signature verification failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      svixId,
      svixTimestamp: svixTimestamp.substring(0, 10) + '...',
    });

    return new Response(
      JSON.stringify({ error: 'Invalid signature' }),
      {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  // -------------------------------------------------------------------------
  // Step 5: Log receipt and dispatch to Trigger.dev
  // -------------------------------------------------------------------------
  const receivedAt = new Date().toISOString();

  console.info('[resend-webhook] Event received', {
    type: event.type,
    emailId: event.data.email_id,
    receivedAt,
  });

  // Dispatch to Trigger.dev for async processing (fire-and-forget)
  // This ensures we respond quickly without blocking on processing
  const payload: ResendWebhookPayload = {
    event,
    receivedAt,
  };

  try {
    // Use sendEvent for async processing
    await client.sendEvent({
      name: resendWebhookEvent,
      payload,
    });
  } catch (error) {
    // Log but don't fail the webhook - we've received the event
    // The webhook can be retried by Resend if processing fails
    console.error('[resend-webhook] Failed to dispatch to Trigger.dev', {
      error: error instanceof Error ? error.message : 'Unknown error',
      emailId: event.data.email_id,
      eventType: event.type,
    });

    // Still return 200 - we received the webhook, processing will be retried
    // This prevents Resend from retrying delivery of the same webhook
  }

  // -------------------------------------------------------------------------
  // Step 6: Respond immediately
  // -------------------------------------------------------------------------
  const processingTime = performance.now() - startTime;

  if (processingTime > 100) {
    console.warn('[resend-webhook] Response time exceeded 100ms target', {
      processingTimeMs: processingTime.toFixed(2),
    });
  }

  return new Response(
    JSON.stringify({ received: true }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'X-RateLimit-Remaining': String(rateLimitResult.remaining),
        'X-Processing-Time': `${processingTime.toFixed(2)}ms`,
      },
    }
  );
}

// ============================================================================
// OTHER HTTP METHODS
// ============================================================================

/**
 * Return 405 for unsupported methods
 */
export async function GET() {
  return new Response(
    JSON.stringify({ error: 'Method not allowed' }),
    {
      status: 405,
      headers: {
        'Content-Type': 'application/json',
        Allow: 'POST',
      },
    }
  );
}
