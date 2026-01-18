/**
 * Error Handling Utilities
 *
 * Standardized error handling for Edge Functions.
 */

import type { ErrorCode, WebhookErrorResponse } from './types.ts'

// ============================================================================
// ERROR CLASS
// ============================================================================

/**
 * Custom error class for webhook processing errors
 */
export class WebhookError extends Error {
  code: ErrorCode
  statusCode: number
  details?: string

  constructor(
    code: ErrorCode,
    message: string,
    statusCode = 400,
    details?: string
  ) {
    super(message)
    this.name = 'WebhookError'
    this.code = code
    this.statusCode = statusCode
    this.details = details
  }

  toResponse(): Response {
    const body: WebhookErrorResponse = {
      success: false,
      error: this.message,
      code: this.code,
      ...(this.details && { details: this.details }),
    }

    return new Response(JSON.stringify(body), {
      status: this.statusCode,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}

// ============================================================================
// ERROR FACTORY FUNCTIONS
// ============================================================================

export function unauthorizedError(message = 'Unauthorized'): WebhookError {
  return new WebhookError('UNAUTHORIZED', message, 401)
}

export function invalidPayloadError(details?: string): WebhookError {
  return new WebhookError('INVALID_PAYLOAD', 'Invalid or malformed payload', 400, details)
}

export function invalidEventError(eventType: string): WebhookError {
  return new WebhookError('INVALID_EVENT', `Unsupported event type: ${eventType}`, 400)
}

export function processingError(details?: string): WebhookError {
  return new WebhookError('PROCESSING_FAILED', 'Failed to process webhook', 500, details)
}

export function methodNotAllowedError(): WebhookError {
  return new WebhookError('METHOD_NOT_ALLOWED', 'Method not allowed', 405)
}

// ============================================================================
// ERROR HANDLER WRAPPER
// ============================================================================

/**
 * Wrap an async handler with error handling
 *
 * @example
 * ```ts
 * serve(withErrorHandling(async (req) => {
 *   // Your handler code - can throw WebhookError
 *   if (!valid) throw invalidPayloadError('Missing field')
 *   return createSuccessResponse('Processed')
 * }))
 * ```
 */
export function withErrorHandling(
  handler: (req: Request) => Promise<Response>
): (req: Request) => Promise<Response> {
  return async (req: Request): Promise<Response> => {
    try {
      return await handler(req)
    } catch (error) {
      if (error instanceof WebhookError) {
        console.error(`Webhook error [${error.code}]: ${error.message}`, error.details)
        return error.toResponse()
      }

      console.error('Unexpected error:', error)
      return new WebhookError(
        'INTERNAL_ERROR',
        'An unexpected error occurred',
        500,
        error instanceof Error ? error.message : 'Unknown error'
      ).toResponse()
    }
  }
}

// ============================================================================
// LOGGING UTILITIES
// ============================================================================

/**
 * Log webhook event with consistent format
 */
export function logWebhookEvent(
  eventType: string,
  action: string,
  details: Record<string, unknown> = {}
): void {
  console.log(JSON.stringify({
    event: eventType,
    action,
    timestamp: new Date().toISOString(),
    ...details,
  }))
}

/**
 * Log webhook error with consistent format
 */
export function logWebhookError(
  eventType: string,
  error: Error | string,
  details: Record<string, unknown> = {}
): void {
  console.error(JSON.stringify({
    event: eventType,
    error: error instanceof Error ? error.message : error,
    stack: error instanceof Error ? error.stack : undefined,
    timestamp: new Date().toISOString(),
    ...details,
  }))
}
