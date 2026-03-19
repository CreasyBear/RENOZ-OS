import { logger } from '@/lib/logger';
import { xeroWebhookPayloadSchema } from '@/lib/schemas/settings/xero-sync';
import { verifyXeroWebhookSignature } from '@/server/functions/financial/xero-webhook-signature';
import {
  processXeroPaymentWebhookEvents,
} from '@/server/functions/financial/xero-invoice-sync';

function parseWebhookPayload(payload: unknown) {
  const parsed = xeroWebhookPayloadSchema.safeParse(payload);
  return parsed.success ? parsed.data.events : null;
}

export async function POST({ request }: { request: Request }) {
  const webhookSecret = process.env.XERO_WEBHOOK_SECRET;
  const webhooksEnabled = process.env.XERO_WEBHOOKS_ENABLED === 'true';

  if (!webhookSecret || !webhooksEnabled) {
    return new Response(JSON.stringify({ error: 'Xero webhook handling is not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const rawBody = await request.text();
  const signature = request.headers.get('x-xero-signature');

  if (!signature || !verifyXeroWebhookSignature(rawBody, signature, webhookSecret)) {
    logger.warn('[xero-webhook] invalid signature', {
      hasSignature: Boolean(signature),
    });

    return new Response(JSON.stringify({ error: 'Invalid signature' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawBody);
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON payload' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const events = parseWebhookPayload(parsed);

  if (!events) {
    logger.warn('[xero-webhook] unsupported payload shape');
    return new Response(JSON.stringify({ error: 'Unsupported webhook payload' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const processed = await processXeroPaymentWebhookEvents(events);

  if (processed.httpStatus === 503) {
    logger.warn('[xero-webhook] payment apply rejected', {
      results: processed.results,
    });

    return new Response(JSON.stringify({ status: processed.status, results: processed.results }), {
      status: processed.httpStatus,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  logger.info('[xero-webhook] processed payments', {
    count: processed.results.length,
    duplicates: processed.duplicateCount,
  });

  return new Response(JSON.stringify({ status: processed.status, results: processed.results }), {
    status: processed.httpStatus,
    headers: { 'Content-Type': 'application/json' },
  });
}
