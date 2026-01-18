/**
 * Webhook Authentication Utilities
 *
 * Shared utilities for verifying webhook requests.
 * Includes secret verification, HMAC signature validation, and timestamp checks.
 *
 * @example
 * ```ts
 * import { verifyWebhookRequest, createErrorResponse } from '../_shared/auth.ts'
 *
 * serve(async (req) => {
 *   const authResult = await verifyWebhookRequest(req)
 *   if (!authResult.valid) {
 *     return createErrorResponse(authResult.code, authResult.message, 401)
 *   }
 *   // Process webhook...
 * })
 * ```
 */

import type { ErrorCode } from './types.ts'

// ============================================================================
// CONFIGURATION
// ============================================================================

const WEBHOOK_SECRET = Deno.env.get('WEBHOOK_SECRET') || ''
const TIMESTAMP_TOLERANCE_SECONDS = 300 // 5 minutes

// ============================================================================
// TYPES
// ============================================================================

export interface AuthResult {
  valid: boolean
  code?: ErrorCode
  message?: string
}

// ============================================================================
// SECRET VERIFICATION
// ============================================================================

/**
 * Verify webhook secret from Authorization header
 *
 * Supports both "Bearer <token>" and raw token formats.
 */
export function verifyWebhookSecret(request: Request): AuthResult {
  const authHeader = request.headers.get('Authorization')

  if (!authHeader) {
    return {
      valid: false,
      code: 'UNAUTHORIZED',
      message: 'Missing Authorization header',
    }
  }

  // Extract token from Bearer format or use raw value
  const token = authHeader.startsWith('Bearer ')
    ? authHeader.slice(7)
    : authHeader

  // In development, allow if no secret configured
  if (!WEBHOOK_SECRET) {
    console.warn('WEBHOOK_SECRET not configured - allowing request')
    return { valid: true }
  }

  // Constant-time comparison to prevent timing attacks
  if (!constantTimeCompare(token, WEBHOOK_SECRET)) {
    return {
      valid: false,
      code: 'UNAUTHORIZED',
      message: 'Invalid authorization token',
    }
  }

  return { valid: true }
}

// ============================================================================
// HMAC SIGNATURE VERIFICATION
// ============================================================================

/**
 * Verify HMAC-SHA256 signature for external webhooks
 *
 * Used when receiving webhooks from external services (Stripe, etc.)
 *
 * @param request - The incoming request
 * @param secret - The shared secret for HMAC
 * @param signatureHeader - Header name containing the signature (e.g., 'X-Signature')
 */
export async function verifyHmacSignature(
  request: Request,
  secret: string,
  signatureHeader = 'X-Signature'
): Promise<AuthResult> {
  const signature = request.headers.get(signatureHeader)

  if (!signature) {
    return {
      valid: false,
      code: 'INVALID_SIGNATURE',
      message: `Missing ${signatureHeader} header`,
    }
  }

  // Clone request to read body without consuming it
  const body = await request.clone().text()

  // Compute expected signature
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )

  const signatureBuffer = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(body)
  )

  const expectedSignature = bufferToHex(signatureBuffer)

  // Extract actual signature (handle "sha256=" prefix if present)
  const actualSignature = signature.startsWith('sha256=')
    ? signature.slice(7)
    : signature

  if (!constantTimeCompare(actualSignature.toLowerCase(), expectedSignature)) {
    return {
      valid: false,
      code: 'INVALID_SIGNATURE',
      message: 'Signature verification failed',
    }
  }

  return { valid: true }
}

// ============================================================================
// TIMESTAMP VALIDATION
// ============================================================================

/**
 * Validate request timestamp to prevent replay attacks
 *
 * @param request - The incoming request
 * @param timestampHeader - Header name containing the timestamp (e.g., 'X-Timestamp')
 */
export function validateTimestamp(
  request: Request,
  timestampHeader = 'X-Timestamp'
): AuthResult {
  const timestampStr = request.headers.get(timestampHeader)

  if (!timestampStr) {
    // Timestamp header is optional - skip validation if not present
    return { valid: true }
  }

  const timestamp = parseInt(timestampStr, 10)

  if (isNaN(timestamp)) {
    return {
      valid: false,
      code: 'EXPIRED_TIMESTAMP',
      message: 'Invalid timestamp format',
    }
  }

  const now = Math.floor(Date.now() / 1000)
  const diff = Math.abs(now - timestamp)

  if (diff > TIMESTAMP_TOLERANCE_SECONDS) {
    return {
      valid: false,
      code: 'EXPIRED_TIMESTAMP',
      message: `Request timestamp expired (${diff}s difference, max ${TIMESTAMP_TOLERANCE_SECONDS}s)`,
    }
  }

  return { valid: true }
}

// ============================================================================
// COMBINED VERIFICATION
// ============================================================================

/**
 * Verify webhook request with all checks
 *
 * Performs: secret verification and timestamp validation.
 * For external webhooks, use verifyHmacSignature separately.
 */
export async function verifyWebhookRequest(request: Request): Promise<AuthResult> {
  // Check HTTP method
  if (request.method !== 'POST') {
    return {
      valid: false,
      code: 'METHOD_NOT_ALLOWED',
      message: 'Only POST requests are allowed',
    }
  }

  // Verify authorization
  const authResult = verifyWebhookSecret(request)
  if (!authResult.valid) {
    return authResult
  }

  // Validate timestamp (optional header)
  const timestampResult = validateTimestamp(request)
  if (!timestampResult.valid) {
    return timestampResult
  }

  return { valid: true }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Constant-time string comparison to prevent timing attacks
 */
function constantTimeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false
  }

  let result = 0
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }

  return result === 0
}

/**
 * Convert ArrayBuffer to hex string
 */
function bufferToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

// ============================================================================
// ERROR RESPONSE HELPER
// ============================================================================

/**
 * Create a standardized error response
 */
export function createErrorResponse(
  code: ErrorCode,
  message: string,
  status = 400,
  details?: string
): Response {
  const body = {
    success: false,
    error: message,
    code,
    ...(details && { details }),
  }

  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

/**
 * Create a standardized success response
 */
export function createSuccessResponse(
  message: string,
  data: Record<string, unknown> = {}
): Response {
  const body = {
    success: true,
    message,
    ...data,
  }

  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}
