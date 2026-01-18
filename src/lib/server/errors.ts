/**
 * Server Error Classes
 *
 * Custom error classes for consistent error handling in server functions.
 * These errors are thrown by protected server functions and middleware.
 */

/**
 * Base class for all server errors.
 * Includes HTTP status code and optional error code for client handling.
 */
export class ServerError extends Error {
  public readonly statusCode: number
  public readonly code: string

  constructor(message: string, statusCode: number = 500, code: string = 'SERVER_ERROR') {
    super(message)
    this.name = 'ServerError'
    this.statusCode = statusCode
    this.code = code
    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor)
    }
  }
}

/**
 * Thrown when a request lacks valid authentication.
 * HTTP 401 Unauthorized
 */
export class AuthError extends ServerError {
  constructor(message: string = 'Authentication required') {
    super(message, 401, 'AUTH_ERROR')
    this.name = 'AuthError'
  }
}

/**
 * Thrown when an authenticated user lacks permission for an action.
 * HTTP 403 Forbidden
 */
export class PermissionDeniedError extends ServerError {
  public readonly requiredPermission: string | undefined

  constructor(message: string = 'Permission denied', requiredPermission?: string) {
    super(message, 403, 'PERMISSION_DENIED')
    this.name = 'PermissionDeniedError'
    this.requiredPermission = requiredPermission
  }
}

/**
 * Thrown when a requested resource is not found.
 * HTTP 404 Not Found
 */
export class NotFoundError extends ServerError {
  public readonly resource: string | undefined

  constructor(message: string = 'Resource not found', resource?: string) {
    super(message, 404, 'NOT_FOUND')
    this.name = 'NotFoundError'
    this.resource = resource
  }
}

/**
 * Thrown when input validation fails.
 * HTTP 400 Bad Request
 */
export class ValidationError extends ServerError {
  public readonly errors: Record<string, string[]>

  constructor(message: string = 'Validation failed', errors: Record<string, string[]> = {}) {
    super(message, 400, 'VALIDATION_ERROR')
    this.name = 'ValidationError'
    this.errors = errors
  }
}

/**
 * Thrown when a request conflicts with existing data.
 * HTTP 409 Conflict
 */
export class ConflictError extends ServerError {
  constructor(message: string = 'Resource conflict') {
    super(message, 409, 'CONFLICT')
    this.name = 'ConflictError'
  }
}

/**
 * Thrown when rate limits are exceeded.
 * HTTP 429 Too Many Requests
 */
export class RateLimitError extends ServerError {
  public readonly retryAfter: number | undefined

  constructor(message: string = 'Rate limit exceeded', retryAfter?: number) {
    super(message, 429, 'RATE_LIMIT')
    this.name = 'RateLimitError'
    this.retryAfter = retryAfter
  }
}

/**
 * Type guard to check if an error is a ServerError.
 */
export function isServerError(error: unknown): error is ServerError {
  return error instanceof ServerError
}

/**
 * Serialize an error for API response.
 */
export function serializeError(error: unknown): {
  error: string
  code: string
  statusCode: number
  details?: Record<string, unknown>
} {
  if (isServerError(error)) {
    const serialized: {
      error: string
      code: string
      statusCode: number
      details?: Record<string, unknown>
    } = {
      error: error.message,
      code: error.code,
      statusCode: error.statusCode,
    }

    // Add additional details for specific error types
    if (error instanceof ValidationError && Object.keys(error.errors).length > 0) {
      serialized.details = { validationErrors: error.errors }
    }
    if (error instanceof PermissionDeniedError && error.requiredPermission) {
      serialized.details = { requiredPermission: error.requiredPermission }
    }
    if (error instanceof NotFoundError && error.resource) {
      serialized.details = { resource: error.resource }
    }
    if (error instanceof RateLimitError && error.retryAfter) {
      serialized.details = { retryAfter: error.retryAfter }
    }

    return serialized
  }

  // Handle unknown errors
  const message = error instanceof Error ? error.message : 'An unexpected error occurred'
  return {
    error: message,
    code: 'INTERNAL_ERROR',
    statusCode: 500,
  }
}
