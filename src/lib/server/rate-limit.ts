/**
 * Rate Limiter for Server Functions
 *
 * Simple in-memory rate limiter for public endpoints.
 * Uses a sliding window approach with automatic cleanup.
 *
 * Note: For multi-instance deployments, use Redis-based rate limiting instead.
 *
 * @example
 * ```ts
 * // In server function
 * const clientId = getClientIdentifier(request)
 * await checkRateLimit('invitation-lookup', clientId, { maxRequests: 10, windowMs: 60000 })
 * ```
 */

// In-memory store for rate limit tracking
// Key format: `${namespace}:${identifier}`
const rateLimitStore = new Map<string, { count: number; windowStart: number }>();

// Cleanup old entries every 5 minutes
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;

let cleanupTimer: ReturnType<typeof setInterval> | null = null;

function startCleanupTimer() {
  if (cleanupTimer) return;

  cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [key, value] of rateLimitStore.entries()) {
      // Remove entries older than 1 hour
      if (now - value.windowStart > 60 * 60 * 1000) {
        rateLimitStore.delete(key);
      }
    }
  }, CLEANUP_INTERVAL_MS);

  // Don't prevent Node from exiting
  if (cleanupTimer.unref) {
    cleanupTimer.unref();
  }
}

// Start cleanup on module load
startCleanupTimer();

// ============================================================================
// TYPES
// ============================================================================

export interface RateLimitOptions {
  /** Maximum requests allowed in the window */
  maxRequests: number;
  /** Time window in milliseconds */
  windowMs: number;
  /** Custom error message */
  message?: string;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
  retryAfterMs: number;
}

// ============================================================================
// CORE FUNCTIONS
// ============================================================================

/**
 * Check if a request is within rate limits.
 * Returns result without throwing - caller decides how to handle.
 */
export function checkRateLimitSync(
  namespace: string,
  identifier: string,
  options: RateLimitOptions
): RateLimitResult {
  const key = `${namespace}:${identifier}`;
  const now = Date.now();
  const record = rateLimitStore.get(key);

  // Initialize or reset expired window
  if (!record || now - record.windowStart >= options.windowMs) {
    rateLimitStore.set(key, { count: 1, windowStart: now });
    return {
      allowed: true,
      remaining: options.maxRequests - 1,
      resetAt: new Date(now + options.windowMs),
      retryAfterMs: 0,
    };
  }

  // Check if within limit
  if (record.count < options.maxRequests) {
    record.count++;
    return {
      allowed: true,
      remaining: options.maxRequests - record.count,
      resetAt: new Date(record.windowStart + options.windowMs),
      retryAfterMs: 0,
    };
  }

  // Rate limited
  const retryAfterMs = record.windowStart + options.windowMs - now;
  return {
    allowed: false,
    remaining: 0,
    resetAt: new Date(record.windowStart + options.windowMs),
    retryAfterMs,
  };
}

/**
 * Check rate limit and throw if exceeded.
 * Use in server functions for automatic error handling.
 */
export function checkRateLimit(
  namespace: string,
  identifier: string,
  options: RateLimitOptions
): void {
  const result = checkRateLimitSync(namespace, identifier, options);

  if (!result.allowed) {
    const retryAfterSeconds = Math.ceil(result.retryAfterMs / 1000);
    const message =
      options.message ?? `Too many requests. Please try again in ${retryAfterSeconds} seconds.`;
    throw new RateLimitError(message, result.retryAfterMs);
  }
}

// ============================================================================
// ERROR CLASS
// ============================================================================

export class RateLimitError extends Error {
  public readonly retryAfterMs: number;
  public readonly code = 'RATE_LIMIT_EXCEEDED';

  constructor(message: string, retryAfterMs: number) {
    super(message);
    this.name = 'RateLimitError';
    this.retryAfterMs = retryAfterMs;
  }
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Get a client identifier from request headers.
 * Uses IP address as primary identifier with fallback.
 */
export function getClientIdentifier(request?: Request): string {
  if (!request) {
    return 'unknown';
  }

  // Try common headers for real IP (behind proxies)
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    // Take the first IP (client's actual IP)
    return forwardedFor.split(',')[0].trim();
  }

  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }

  // Fallback to a default identifier
  return 'default-client';
}

// ============================================================================
// PRESET CONFIGURATIONS
// ============================================================================

/**
 * Preset rate limit configurations for common use cases.
 */
export const RATE_LIMITS = {
  /** For public lookup endpoints (e.g., invitation by token) */
  publicLookup: {
    maxRequests: 20,
    windowMs: 60 * 1000, // 20 requests per minute
    message: 'Too many lookup attempts. Please wait a moment.',
  },

  /** For public action endpoints (e.g., accept invitation) */
  publicAction: {
    maxRequests: 5,
    windowMs: 60 * 1000, // 5 requests per minute
    message: 'Too many attempts. Please wait before trying again.',
  },

  /** For password reset requests */
  passwordReset: {
    maxRequests: 3,
    windowMs: 15 * 60 * 1000, // 3 requests per 15 minutes
    message: 'Too many password reset requests. Please try again later.',
  },

  /** For login attempts */
  login: {
    maxRequests: 10,
    windowMs: 15 * 60 * 1000, // 10 attempts per 15 minutes
    message: 'Too many login attempts. Please try again later.',
  },
} as const;
