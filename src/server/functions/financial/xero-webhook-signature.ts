/**
 * Xero webhook signature verification.
 *
 * Kept separate from shared invoice-sync server functions so browser bundles
 * do not pull in Node-only crypto dependencies.
 */

import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Verify Xero webhook signature using HMAC-SHA256.
 *
 * Xero sends an `x-xero-signature` header containing an HMAC-SHA256 hash
 * of the request body using the webhook signing key.
 *
 * @see https://developer.xero.com/documentation/guides/webhooks/overview
 */
export function verifyXeroWebhookSignature(payload: string, signature: string, secret: string): boolean {
  const expectedSignature = createHmac('sha256', secret).update(payload).digest('base64');

  // Use timing-safe comparison to prevent timing attacks
  const sigBuffer = Buffer.from(signature, 'base64');
  const expectedBuffer = Buffer.from(expectedSignature, 'base64');

  if (sigBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return timingSafeEqual(sigBuffer, expectedBuffer);
}
